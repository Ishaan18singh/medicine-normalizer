"""Medicine normalisation: brand/synonym -> generic name.

Data comes from `data/medicine_master.json`, built from the openFDA drug-label
bulk download plus a curated layer of Indian/international brands and INN<->USAN
synonyms (paracetamol/acetaminophen, salbutamol/albuterol, ...).

Matching runs in four tiers, cheapest first:

  1. exact       - direct hit on a generic, brand or synonym          conf 1.00
  2. salt-strip  - "metformin hydrochloride" -> "metformin"           conf 0.97
  3. fuzzy       - token_set_ratio, typo tolerant                     conf score/100
  4. semantic    - sentence-transformer cosine similarity             conf cosine

Tiers 3 and 4 only search entries flagged `searchable` in the dataset - i.e.
prescription drugs or products carrying an FDA pharmacologic class. The raw
openFDA shard is roughly half OTC cosmetics (sunscreens, hand sanitiser,
toothpaste); without that filter a query like "dolo" happily fuzzy-matches a
sunscreen brand.
"""
import json
import logging
import os
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
from thefuzz import fuzz, process

logger = logging.getLogger(__name__)

DATASET_PATH = Path(
    os.environ.get("MEDICINE_DATASET")
    or Path(__file__).parent / "data" / "medicine_master.json"
)

FUZZY_CUTOFF = int(os.environ.get("FUZZY_CUTOFF", "80"))
SEMANTIC_CUTOFF = float(os.environ.get("SEMANTIC_CUTOFF", "0.60"))
EMBEDDING_MODEL = os.environ.get(
    "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
# torch + sentence-transformers push memory well past 512MB free-tier limits;
# set to "false" on memory-constrained hosts to fall back to exact+fuzzy only.
LOAD_EMBEDDINGS = os.environ.get("LOAD_EMBEDDINGS", "true").lower() != "false"

_SALTS = re.compile(
    r"\b(hydrochloride|hcl|sodium|potassium|calcium|sulfate|sulphate|maleate|"
    r"tartrate|besylate|mesylate|succinate|fumarate|citrate|acetate|phosphate|"
    r"nitrate|bromide|chloride|carbonate|dihydrate|monohydrate|anhydrous)\b")

_DOSE = re.compile(r"\b\d+(\.\d+)?\s*(mg|mcg|g|ml|l|iu|%|units?)\b.*$")

_FORMS = re.compile(
    r"\b(tablets?|capsules?|injections?|solutions?|suspensions?|creams?|"
    r"ointments?|gels?|syrups?|drops?|sprays?|powders?|oral|topical)\b")


def normalize_text(value: str) -> str:
    """Lowercase, de-accent and strip dosage/form noise from a query."""
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = value.lower().strip()
    value = re.sub(r"\s*\(.*?\)\s*", " ", value)
    value = _DOSE.sub("", value)
    value = _FORMS.sub(" ", value)
    value = re.sub(r"[^a-z0-9 \-/,+]", " ", value)
    return re.sub(r"\s+", " ", value).strip(" -,/")


def strip_salt(value: str) -> str:
    return re.sub(r"\s+", " ", _SALTS.sub(" ", value)).strip(" ,-/")


class MedicineMatchingEngine:
    def __init__(self, dataset_path: Path = DATASET_PATH):
        self.entries: Dict[str, dict] = {}
        self.lookup: Dict[str, tuple] = {}      # any name -> (generic, kind)
        self.search_names: List[str] = []       # fuzzy index
        self.semantic_names: List[str] = []     # embedding index
        self.model = None
        self.embeddings = None

        self._load_dataset(dataset_path)
        self._load_model()

    # -- data ---------------------------------------------------------------
    def _load_dataset(self, path: Path) -> None:
        try:
            payload = json.loads(Path(path).read_text(encoding="utf-8"))
        except FileNotFoundError:
            logger.error("Medicine dataset not found at %s - matching disabled", path)
            return
        except json.JSONDecodeError as exc:
            logger.error("Medicine dataset at %s is not valid JSON: %s", path, exc)
            return

        meta = payload.get("meta", {})
        search_names = set()

        for med in payload.get("medicines", []):
            generic = med["generic"]
            self.entries[generic] = med
            self.lookup.setdefault(generic, (generic, "generic"))

            for syn in med.get("synonyms", []):
                self.lookup.setdefault(syn, (generic, "synonym"))
            for brand in med.get("brands", []):
                self.lookup.setdefault(brand, (generic, "brand"))

            if med.get("searchable"):
                search_names.add(generic)
                search_names.update(med.get("synonyms", []))
                search_names.update(med.get("brands", []))
                self.semantic_names.append(generic)

        self.search_names = sorted(search_names)
        logger.info(
            "Loaded %s generics (%s searchable), %s names in fuzzy index [%s]",
            len(self.entries), len(self.semantic_names), len(self.search_names),
            meta.get("source", "unknown source"),
        )

    def _load_model(self) -> None:
        """Embeddings are a nice-to-have; exact+fuzzy still work without them."""
        if not self.semantic_names or not LOAD_EMBEDDINGS:
            return
        try:
            from sentence_transformers import SentenceTransformer

            self.model = SentenceTransformer(EMBEDDING_MODEL)
            self.embeddings = self.model.encode(
                self.semantic_names, batch_size=256, show_progress_bar=False,
                normalize_embeddings=True)
            logger.info("Embedded %s generic names", len(self.semantic_names))
        except Exception as exc:
            logger.warning(
                "Semantic matching unavailable (%s) - falling back to exact+fuzzy", exc)
            self.model = None
            self.embeddings = None

    # -- matching -----------------------------------------------------------
    def _result(self, query: str, generic: str, kind: str, confidence: float) -> Dict:
        entry = self.entries.get(generic, {})
        curated = set(entry.get("curated_brands", []))
        alternatives = [
            {"name": b, "curated": b in curated}
            for b in entry.get("brands", [])
            if b.lower() != query.lower()
        ][:25]
        return {
            "input": query,
            "normalized": generic,
            "type": kind,
            "confidence": round(float(confidence), 4),
            "alternatives": alternatives,
        }

    def _unknown(self, query: str) -> Dict:
        return {"input": query, "normalized": query, "type": "unknown",
                "confidence": 0.0, "alternatives": []}

    def match_medicine(self, input_medicine: str) -> Dict:
        query = normalize_text(input_medicine)
        if not query or not self.entries:
            return self._unknown(input_medicine)

        # 1. exact
        hit = self.lookup.get(query)
        if hit:
            return self._result(input_medicine, hit[0], hit[1], 1.0)

        # 2. salt-stripped exact
        stripped = strip_salt(query)
        if stripped and stripped != query:
            hit = self.lookup.get(stripped)
            if hit:
                return self._result(input_medicine, hit[0], hit[1], 0.97)

        # 3. fuzzy
        if self.search_names:
            match = process.extractOne(
                query, self.search_names, scorer=fuzz.token_set_ratio,
                score_cutoff=FUZZY_CUTOFF)
            if match:
                name, score = match
                generic, kind = self.lookup.get(name, (name, "generic"))
                return self._result(input_medicine, generic, kind, score / 100.0)

        # 4. semantic
        if self.model is not None and self.embeddings is not None:
            try:
                vec = self.model.encode([query], normalize_embeddings=True)
                sims = np.dot(self.embeddings, vec[0])
                best = int(np.argmax(sims))
                score = float(sims[best])
                if score >= SEMANTIC_CUTOFF:
                    generic = self.semantic_names[best]
                    return self._result(input_medicine, generic, "generic", score)
            except Exception as exc:
                logger.error("Semantic matching failed: %s", exc)

        return self._unknown(input_medicine)

    def get_all_brands(self, generic_name: str) -> List[str]:
        entry = self.entries.get(normalize_text(generic_name))
        return entry.get("brands", []) if entry else []

    def suggest(self, prefix: str, limit: int = 8) -> List[Dict]:
        """Typeahead: names starting with the query rank above names merely
        containing it; within each group, shorter (more likely to be what the
        user means) and curated names rank first. One suggestion per generic
        so the dropdown doesn't fill up with 8 near-duplicate brand labels."""
        query = normalize_text(prefix)
        if not query or not self.lookup:
            return []

        starts, contains = [], []
        for name, (generic, kind) in self.lookup.items():
            if name.startswith(query):
                starts.append((name, generic, kind))
            elif query in name:
                contains.append((name, generic, kind))

        curated_by_generic = {
            g: set(e.get("curated_brands", [])) for g, e in self.entries.items()
        }

        def rank(item):
            name, generic, _ = item
            is_curated = name in curated_by_generic.get(generic, ())
            return (0 if is_curated else 1, len(name), name)

        starts.sort(key=rank)
        contains.sort(key=rank)

        seen_generics = set()
        out = []
        for name, generic, kind in starts + contains:
            if generic in seen_generics:
                continue
            seen_generics.add(generic)
            out.append({"query": name, "generic": generic, "kind": kind})
            if len(out) >= limit:
                break
        return out

    def get_entry(self, generic_name: str) -> Optional[dict]:
        return self.entries.get(normalize_text(generic_name))


matching_engine = MedicineMatchingEngine()


async def init_medicine_db(db):
    """Seed MongoDB with the medicine dictionary (idempotent)."""
    logger.info("Initializing medicine database...")

    await db.medicines.create_index("generic_name", unique=True)
    await db.users.create_index("email", unique=True)

    existing = await db.medicines.count_documents({})
    if existing >= len(matching_engine.entries) > 0:
        logger.info("Medicine collection already holds %s entries", existing)
        return

    from pymongo import UpdateOne

    now = datetime.now(timezone.utc)
    ops = [
        UpdateOne(
            {"generic_name": med["generic"]},
            {"$set": {
                "generic_name": med["generic"],
                "brand_names": med.get("brands", []),
                "synonyms": med.get("synonyms", []),
                "category": med.get("category", ""),
                "routes": med.get("routes", []),
                "rx": med.get("rx", False),
                "searchable": med.get("searchable", False),
                "updated_at": now,
            }},
            upsert=True,
        )
        for med in matching_engine.entries.values()
    ]

    if ops:
        for i in range(0, len(ops), 1000):
            await db.medicines.bulk_write(ops[i:i + 1000], ordered=False)
        logger.info("Upserted %s medicines into MongoDB", len(ops))
