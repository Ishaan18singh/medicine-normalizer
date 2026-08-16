---
title: MedNormalize AI API
emoji: 💊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# MedNormalize AI — Backend API

FastAPI service behind [MedNormalize AI](https://github.com/Ishaan18singh/medicine-normalizer):
brand-to-generic medicine normalization, OCR prescription scanning, and
alternative-drug recommendations.

The React frontend is deployed separately on Vercel and calls this Space.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | — | Liveness check |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Log in, sets httpOnly cookies |
| POST | `/api/auth/logout` | — | Clear cookies |
| GET | `/api/auth/me` | ✓ | Current user |
| POST | `/api/normalize` | ✓ | Normalize one medicine name |
| POST | `/api/bulk-normalize` | ✓ | Normalize a list |
| POST | `/api/scan-prescription` | ✓ | OCR an image, then normalize |
| GET | `/api/alternatives/{medicine}` | ✓ | Brands for a generic |
| GET | `/api/analytics` | admin | Usage stats |

Interactive docs are at `/docs`.

## Required secrets

Set these under **Settings → Variables and secrets** in the Space. The service
will not start without the first two.

| Name | Type | Example / notes |
| --- | --- | --- |
| `MONGO_URL` | secret | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME` | variable | `mednormalize` |
| `CORS_ORIGINS` | variable | `https://your-frontend.vercel.app` — exact origin, no trailing slash. Comma-separate for multiple. |
| `JWT_SECRET` | secret | Long random string. Generate with `openssl rand -hex 32`. |
| `ADMIN_EMAIL` | variable | Seeded admin account |
| `ADMIN_PASSWORD` | secret | **Change this** — the default is `admin123` |
| `COOKIE_SECURE` | variable | `true` (default). Only `false` for local http testing. |
| `COOKIE_SAMESITE` | variable | `none` (default) — required for cross-site cookies. |

`CORS_ORIGINS` and the cookie flags matter more than they look: the frontend
sends `withCredentials: true`, and a browser will silently drop the auth cookie
if the origin is a wildcard or the cookie is not `Secure; SameSite=None`.

## MongoDB Atlas

Create a free M0 cluster, add a database user, and under **Network Access**
allow `0.0.0.0/0` (Spaces have no fixed egress IP). Paste the connection string
into `MONGO_URL`.

## Local run

```bash
docker build -t mednormalize .
docker run -p 7860:7860 \
  -e MONGO_URL="mongodb://host.docker.internal:27017" \
  -e DB_NAME="mednormalize" \
  -e CORS_ORIGINS="http://localhost:5173" \
  -e COOKIE_SECURE=false -e COOKIE_SAMESITE=lax \
  mednormalize
```

## Medicine dataset

`backend/data/medicine_master.json` — **6,261 generics, 12,022 brand names,
1,339 synonyms** (2,709 generics in the fuzzy/semantic index).

Built by `tools/extract_openfda.py` + `tools/build_dataset.py` from the openFDA
drug-label bulk download, then merged with a curated layer. Rebuild with:

```bash
python tools/extract_openfda.py drug-label-0001-of-0013.json ... drug-label-0006-of-0013.json openfda_extract.json
python tools/build_dataset.py openfda_extract.json backend/data/medicine_master.json
```

Three things the raw openFDA data needed before it was usable:

1. **It is US-only.** There is no `paracetamol`, only `acetaminophen`; no Crocin,
   Dolo or Ecosprin. A curated INN↔USAN synonym layer and an Indian brand layer
   sit on top, and aliases are merged so both spellings return one answer.
2. **Salt forms fragment the data.** Labels say `metformin hydrochloride`; users
   type `metformin`. Salt forms are folded into the base generic as synonyms.
3. **Much of it is not medicine.** OTC/cosmetic labelling (sunscreen, hand
   sanitiser, toothpaste) is common in the raw data. Only prescription drugs or
   products with an FDA pharmacologic class go into the fuzzy index, so `dolo`
   cannot fuzzy-match a sunscreen brand.

Coverage caveat: this is **6 of 13 shards** — 120,000 of 258,792 label records
(~46.4%). Running the same two scripts over the remaining seven files will grow
the dictionary further.

## Notes

- First build takes roughly 5–10 minutes: it installs CPU-only PyTorch and bakes
  the `all-MiniLM-L6-v2` embedding model into the image.
- Matching degrades gracefully: if the embedding model fails to load, exact,
  salt-stripped and fuzzy matching still work.
