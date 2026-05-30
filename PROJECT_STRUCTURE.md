# Medicine Normalization Platform

## Project Structure

```text
/app/
│
├── ARCHITECTURE.md
├── CODE_REVIEW_FIXES.md
├── README.md
├── design_guidelines.json
│
├── backend/
│   ├── .env
│   ├── server.py
│   ├── medicine_matching.py
│   ├── ocr_processor.py
│   └── requirements.txt
│
├── frontend/
│   ├── .env
│   ├── package.json
│   ├── yarn.lock
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── craco.config.js
│   ├── jsconfig.json
│   ├── components.json
│   │
│   ├── public/
│   │   └── index.html
│   │
│   └── src/
│       ├── index.js
│       ├── App.js
│       ├── App.css
│       ├── index.css
│       │
│       ├── context/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       └── components/
│
├── memory/
├── tests/
├── test_reports/
│
└── Configuration Files
    ├── .gitignore
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .env.example
    ├── .github/
    │   └── workflows/
    │       └── deploy.yml
    └── nginx/
        └── nginx.conf
```

## Backend Stack

- FastAPI
- Python
- MongoDB
- JWT Authentication
- Sentence Transformers
- Tesseract OCR

## Frontend Stack

- React
- Tailwind CSS
- Shadcn/UI
- React Router

## AI Features

- Medicine Normalization
- Brand → Generic Mapping
- Semantic Search
- OCR Prescription Scanning
- Alternative Drug Recommendation

## Deployment

- Docker
- Nginx
- MongoDB Atlas
- GitHub Actions CI/CD
- AWS / Azure / GCP