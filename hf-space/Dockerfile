# MedNormalize AI - backend image for Hugging Face Spaces (Docker SDK).
# Also works on Render, Fly.io, or any host that can run a container.

FROM python:3.11-slim

# HF Spaces gives the container a writable /home/user; cache the model there so
# it is baked into the image rather than downloaded on every cold start.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/home/user/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/home/user/.cache/huggingface \
    TESSERACT_CMD=/usr/bin/tesseract

# tesseract is a system binary - pytesseract is only a wrapper around it.
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Spaces run as uid 1000; matching it avoids permission errors on the cache dir.
RUN useradd -m -u 1000 user
USER user
ENV PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user:user backend/requirements.txt ./requirements.txt

# Install the CPU-only torch wheel FIRST. sentence-transformers would otherwise
# pull the default CUDA build (~2.5GB of nvidia libs) that a CPU Space cannot use.
RUN pip install --upgrade pip && \
    pip install --index-url https://download.pytorch.org/whl/cpu torch>=2.2 && \
    pip install -r requirements.txt

# Bake the embedding model into the image (~90MB) so startup does not depend on
# a network call to huggingface.co.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY --chown=user:user backend/ ./

# Hugging Face Spaces routes traffic to 7860.
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
