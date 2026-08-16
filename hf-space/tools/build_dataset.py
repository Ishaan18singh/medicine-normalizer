"""Merge the openFDA extract with a curated INN/India layer into one dataset.

openFDA is US-only labelling, so it has `acetaminophen` but not `paracetamol`,
and none of the Indian brands the app's users would actually type (Crocin,
Dolo, Ecosprin). File 0001 of 13 also skews heavily OTC/cosmetic - roughly half
its "brands" are sunscreens and hand sanitisers. We therefore:

  1. keep every openFDA generic for exact lookup, but
  2. only put real drugs (prescription, or carrying an FDA pharm class) into the
     fuzzy/semantic index, so "dolo" cannot fuzzy-match a sunscreen, and
  3. overlay a curated synonym + Indian-brand layer on top.
"""
import json, re, sys
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "openfda_extract.json")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "backend/data/medicine_master.json")

# --- INN / BAN <-> USAN synonyms -------------------------------------------
# Same molecule, different official name depending on region. Without these the
# app tells an Indian user that "paracetamol" is unknown.
SYNONYMS = {
    "acetaminophen": ["paracetamol", "pcm"],
    "albuterol": ["salbutamol"],
    "albuterol sulfate": ["salbutamol sulphate", "salbutamol"],
    "epinephrine": ["adrenaline"],
    "norepinephrine": ["noradrenaline"],
    "furosemide": ["frusemide"],
    "lidocaine": ["lignocaine"],
    "rifampin": ["rifampicin"],
    "cefalexin": ["cephalexin"],
    "cephalexin": ["cefalexin"],
    "trimethoprim and sulfamethoxazole": ["co-trimoxazole", "cotrimoxazole"],
    "guaifenesin": ["guaiphenesin"],
    "dextroamphetamine": ["dexamfetamine"],
    "chlorpheniramine maleate": ["chlorphenamine"],
    "hydroxyzine": ["hydroxyzine hydrochloride"],
    "acetylsalicylic acid": ["aspirin"],
    "aspirin": ["acetylsalicylic acid", "asa"],
    "amoxicillin": ["amoxycillin"],
    "vitamin c": ["ascorbic acid"],
    "ascorbic acid": ["vitamin c"],
    "cholecalciferol": ["vitamin d3"],
    "thiamine": ["vitamin b1"],
    "cyanocobalamin": ["vitamin b12"],
    "glyburide": ["glibenclamide"],
    "acetylcysteine": ["n-acetylcysteine", "nac"],
    "ranitidine": ["ranitidine hydrochloride"],
    "salbutamol": ["albuterol"],
    "paracetamol": ["acetaminophen"],
}

# --- Curated brand layer ----------------------------------------------------
# Indian + common international brands, which US-only openFDA data lacks.
# Carried over from the project's original hardcoded dictionary and extended.
CURATED = {
    "paracetamol": (["crocin", "calpol", "dolo", "metacin", "tylenol", "panadol",
                     "dolo 650", "pacimol", "sumo"], "analgesic/antipyretic"),
    "ibuprofen": (["brufen", "advil", "motrin", "nurofen", "combiflam", "ibugesic"],
                  "nsaid"),
    "metformin": (["glucophage", "fortamet", "glumetza", "riomet", "glycomet",
                   "obimet", "carbophage"], "antidiabetic (biguanide)"),
    "lisinopril": (["prinivil", "zestril", "listril", "lipril"], "ace inhibitor"),
    "atorvastatin": (["lipitor", "atorva", "storvas", "tonact", "aztor"], "statin"),
    "amlodipine": (["norvasc", "amlong", "amlopres", "stamlo"],
                   "calcium channel blocker"),
    "omeprazole": (["prilosec", "omez", "omepral", "ocid"],
                   "proton pump inhibitor"),
    "aspirin": (["disprin", "ecosprin", "bayer aspirin", "loprin"], "antiplatelet"),
    "amoxicillin": (["amoxil", "moxatag", "trimox", "mox", "novamox"], "antibiotic"),
    "azithromycin": (["zithromax", "azithral", "azee", "azax"], "antibiotic"),
    "cetirizine": (["zyrtec", "cetrizet", "alerid", "cetzine", "okacet"],
                   "antihistamine"),
    "pantoprazole": (["protonix", "pantodac", "pantop", "pan 40", "pantocid"],
                     "proton pump inhibitor"),
    "levothyroxine": (["synthroid", "levoxyl", "eltroxin", "thyronorm", "thyrox"],
                      "thyroid hormone"),
    "losartan": (["cozaar", "losacar", "losar", "repace"], "arb"),
    "gabapentin": (["neurontin", "gabapin", "gabantin"], "anticonvulsant"),
    "simvastatin": (["zocor", "simvotin", "simvas"], "statin"),
    "clopidogrel": (["plavix", "clopivas", "deplatt", "clopilet"], "antiplatelet"),
    "montelukast": (["singulair", "montair", "montek"], "leukotriene inhibitor"),
    "ranitidine": (["zantac", "aciloc", "rantac"], "h2 blocker"),
    "diclofenac": (["voltaren", "voveran", "diclomol", "dynapar"], "nsaid"),
    "pantoprazole sodium": (["pantocid", "pan"], "proton pump inhibitor"),
    "cefixime": (["suprax", "taxim-o", "zifi", "mahacef"], "antibiotic"),
    "ondansetron": (["zofran", "emeset", "vomikind", "ondem"], "antiemetic"),
    "domperidone": (["motilium", "domstal", "vomistop"], "prokinetic"),
    "salbutamol": (["ventolin", "asthalin", "levolin"], "bronchodilator"),
    "hydrochlorothiazide": (["microzide", "aquazide", "hydrazide"], "diuretic"),
    "telmisartan": (["micardis", "telma", "telsartan"], "arb"),
    "rosuvastatin": (["crestor", "rosuvas", "rozavel"], "statin"),
    "esomeprazole": (["nexium", "esoz", "sompraz"], "proton pump inhibitor"),
    "glimepiride": (["amaryl", "glimestar", "zoryl"], "antidiabetic (sulfonylurea)"),
    "levocetirizine": (["xyzal", "levocet", "1-al"], "antihistamine"),
    "doxycycline": (["vibramycin", "doxt", "microdox"], "antibiotic"),
    "ciprofloxacin": (["cipro", "ciplox", "cifran"], "antibiotic"),
    "metronidazole": (["flagyl", "metrogyl", "aristogyl"], "antibiotic/antiprotozoal"),
    "prednisolone": (["omnacortil", "wysolone", "predmet"], "corticosteroid"),
}


def base_generic(name: str) -> str:
    """Strip salt forms so 'metformin hydrochloride' folds into 'metformin'."""
    salts = (r"\b(hydrochloride|hcl|sodium|potassium|calcium|sulfate|sulphate|"
             r"maleate|tartrate|besylate|mesylate|succinate|fumarate|citrate|"
             r"acetate|phosphate|nitrate|bromide|chloride|carbonate|medoxomil|"
             r"dihydrate|monohydrate|anhydrous|micronized|polacrilex)\b")
    out = re.sub(salts, " ", name)
    return re.sub(r"\s+", " ", out).strip(" ,-/")


raw = json.loads(SRC.read_text(encoding="utf-8"))
entries = {}

# 1. openFDA layer
for rec in raw["generics"]:
    g = rec["generic"]
    real_drug = bool(rec["rx"] or rec["category"])
    entries[g] = {
        "generic": g,
        "brands": sorted(set(rec["brands"])),
        "synonyms": [],
        "category": rec["category"] or "",
        "routes": rec["routes"],
        "rx": rec["rx"],
        "otc": rec["otc"],
        "label_count": rec["label_count"],
        "sources": ["openfda"],
        # only real drugs go in the fuzzy/semantic index
        "searchable": real_drug,
    }
    b = base_generic(g)
    if b and b != g and b not in entries:
        entries[b] = dict(entries[g], generic=b, sources=["openfda:salt-stripped"])

# 2. curated layer (wins on conflicts, always searchable)
for g, (brands, cat) in CURATED.items():
    e = entries.get(g)
    if e:
        e["brands"] = sorted(set(e["brands"]) | set(brands))
        e["category"] = e["category"] or cat
        e["sources"] = sorted(set(e["sources"] + ["curated"]))
        e["searchable"] = True
    else:
        entries[g] = {
            "generic": g, "brands": sorted(brands), "synonyms": [],
            "category": cat, "routes": [], "rx": True, "otc": False,
            "label_count": 0, "sources": ["curated"], "searchable": True,
        }

# 2b. fold salt forms into their base generic.
# openFDA labels "metformin hydrochloride"; a user types "metformin". Keeping
# both as separate entries splits the brand list across them, so the salt form
# becomes a synonym of the base and donates its brands.
for name in sorted(entries):
    if name not in entries:
        continue
    b = base_generic(name)
    if not b or b == name or b not in entries:
        continue
    salt = entries.pop(name)
    base = entries[b]
    base["brands"] = sorted(set(base["brands"]) | set(salt["brands"]))
    base["synonyms"] = sorted(set(base["synonyms"]) | {name})
    base["category"] = base["category"] or salt["category"]
    base["routes"] = sorted(set(base["routes"]) | set(salt["routes"]))
    base["rx"] = base["rx"] or salt["rx"]
    base["otc"] = base["otc"] or salt["otc"]
    base["label_count"] += salt["label_count"]
    base["sources"] = sorted(set(base["sources"]) | set(salt["sources"]))
    base["searchable"] = base["searchable"] or salt["searchable"]

# 3. synonym layer, with alias merging.
#
# "paracetamol" and "acetaminophen" are the same molecule. If both end up as
# separate entries the app answers differently depending on which spelling the
# user types (one carries the Indian brands, the other the US ones). So collapse
# each synonym group into a single canonical entry - the one openFDA actually
# labels - and keep the other spellings as synonyms pointing at it.
groups = {}
for g, syns in SYNONYMS.items():
    names = {g} | set(syns)
    key = next((frozenset(k) for k in groups if names & k), None)
    if key:
        merged = set(key) | names
        groups[frozenset(merged)] = groups.pop(key) | names
    else:
        groups[frozenset(names)] = names

for names in list(groups.values()):
    present = [n for n in names if n in entries]
    if not present:
        continue
    # canonical = best evidenced entry (openFDA label count, then brand count)
    canonical = max(present, key=lambda n: (entries[n]["label_count"],
                                            len(entries[n]["brands"])))
    target = entries[canonical]
    for n in present:
        if n == canonical:
            continue
        dup = entries.pop(n)
        target["brands"] = sorted(set(target["brands"]) | set(dup["brands"]))
        target["sources"] = sorted(set(target["sources"]) | set(dup["sources"]))
        target["category"] = target["category"] or dup["category"]
    target["synonyms"] = sorted(names - {canonical})
    target["searchable"] = True

    # names in the group with no entry of their own still resolve as synonyms
    for n in names - set(present):
        if n not in target["synonyms"]:
            target["synonyms"] = sorted(set(target["synonyms"]) | {n})

meds = sorted(entries.values(), key=lambda d: (-d["label_count"], d["generic"]))
searchable = [m for m in meds if m["searchable"]]

# Corpus-wide record total is a fixed estimate (13-shard openFDA bulk download);
# the source file only knows its own slice, so coverage is derived from both.
CORPUS_TOTAL_RECORDS = 258792
source_records = raw.get("records", 20000)
coverage_pct = 100 * source_records / CORPUS_TOTAL_RECORDS

OUT.write_text(json.dumps({
    "meta": {
        "source": raw.get("source", "openFDA drug label bulk download, file 0001 of 0013"),
        "source_records": source_records,
        "corpus_total_records": CORPUS_TOTAL_RECORDS,
        "coverage_note": f"{coverage_pct:.1f}% of the openFDA label corpus.",
        "curated_layer": "Indian/international brands + INN<->USAN synonyms",
        "generics": len(meds),
        "searchable_generics": len(searchable),
        "brand_names": sum(len(m["brands"]) for m in meds),
    },
    "medicines": meds,
}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

print(f"generics           : {len(meds)}")
print(f"searchable (drugs) : {len(searchable)}")
print(f"brand names        : {sum(len(m['brands']) for m in meds)}")
print(f"synonyms           : {sum(len(m['synonyms']) for m in meds)}")
print(f"written            : {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
