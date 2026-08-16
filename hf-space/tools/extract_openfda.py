"""Aggregate every openFDA drug-label shard into one brand->generic extract.

Same streaming parser as the single-file version (the shards are ~600-700MB of
one JSON document each, far too large for json.load on this box), but state is
accumulated across all files before writing.
"""
import glob, json, os, re, sys, time, unicodedata
from collections import defaultdict

SHARDS = sys.argv[1:-1]
OUTDIR = sys.argv[-1]
DEC = json.JSONDecoder()
BUF = 8 * 1024 * 1024


def stream_results(path):
    f = open(path, "r", encoding="utf-8", errors="replace")
    head = f.read(65536)
    start = head.index('"results": [') + len('"results": [')
    buf, pos = head[start:], 0
    while True:
        while pos < len(buf) and buf[pos] in " \t\r\n,":
            pos += 1
        if pos < len(buf) and buf[pos] == "]":
            return
        try:
            obj, pos = DEC.raw_decode(buf, pos)
        except ValueError:
            buf, pos = buf[pos:], 0
            chunk = f.read(BUF)
            if not chunk:
                return
            buf += chunk
            continue
        yield obj
        if pos > 4 * 1024 * 1024:
            buf, pos = buf[pos:], 0


def clean(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[™®]", "", s)
    s = re.sub(r"\s*\(.*?\)\s*", " ", s)
    s = re.sub(r"\b\d+(\.\d+)?\s*(mg|mcg|g|ml|l|iu|%|units?)\b.*$", "", s)
    s = re.sub(
        r"\b(tablets?|capsules?|injections?|solutions?|suspensions?|creams?|"
        r"ointments?|gels?|syrups?|lotions?|sprays?|patch(es)?|drops?|"
        r"powders?|extended[- ]release|delayed[- ]release|oral|topical|"
        r"intravenous|film[- ]coated|usp|nf)\b", " ", s)
    s = re.sub(r"[^a-z0-9 \-/,+]", " ", s)
    return re.sub(r"\s+", " ", s).strip(" -,/")


PARTS = []
for path in SHARDS:
    name = os.path.basename(path)
    part = os.path.join(OUTDIR, name.replace(".json", ".part.json"))
    if os.path.exists(part):
        print(f"[skip] {name} already done", flush=True)
        continue
    generics = {}
    seen = 0
    t0 = time.time()
    for rec in stream_results(path):
        seen += 1
        ofd = rec.get("openfda") or {}
        gens = ofd.get("generic_name") or []
        if not gens:
            continue
        brands = ofd.get("brand_name") or []
        ptype = (ofd.get("product_type") or [""])[0]
        routes = [r.lower() for r in (ofd.get("route") or [])]
        klass = (ofd.get("pharm_class_epc") or [""])[0]
        subs = ofd.get("substance_name") or []
        for g in gens:
            gc = clean(g)
            if not gc or len(gc) < 3 or len(gc) > 80:
                continue
            e = generics.setdefault(gc, {
                "brands": set(), "category": "", "routes": set(),
                "substances": set(), "otc": False, "rx": False, "n": 0})
            e["n"] += 1
            for b in brands:
                bc = clean(b)
                if bc and bc != gc and 2 < len(bc) <= 60:
                    e["brands"].add(bc)
            e["routes"].update(routes)
            for sname in subs[:6]:
                sc = clean(sname)
                if sc:
                    e["substances"].add(sc)
            if not e["category"] and klass:
                e["category"] = klass.lower()
            if "OTC" in ptype:
                e["otc"] = True
            if "PRESCRIPTION" in ptype:
                e["rx"] = True
    payload = {g: {"brands": sorted(e["brands"]), "category": e["category"],
                   "routes": sorted(e["routes"]), "substances": sorted(e["substances"])[:8],
                   "otc": e["otc"], "rx": e["rx"], "n": e["n"]}
               for g, e in generics.items()}
    tmp = part + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"shard": name, "records": seen, "generics": payload}, f,
                  ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, part)
    print(f"[done] {name}: {seen} records, {len(generics)} generics, "
          f"{time.time()-t0:.0f}s -> {os.path.basename(part)}", flush=True)
