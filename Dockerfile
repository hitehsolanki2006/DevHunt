# Multi-stage Dockerfile optimized for smaller final image
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /wheels

# Copy only requirements first for better layer caching
COPY backend/requirements.txt ./requirements.txt

# Build wheels for all dependencies in builder stage
RUN pip install --upgrade pip setuptools wheel \
 && pip wheel --wheel-dir /wheels -r requirements.txt

# Final runtime image
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install only runtime OS packages (smaller than build deps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libjpeg62-turbo \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy wheelhouse from builder and install packages from wheels (no compilation in final)
COPY --from=builder /wheels /wheels
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip setuptools \
 && pip install --no-index --find-links=/wheels -r requirements.txt \
 && rm -rf /wheels /root/.cache/pip

# Copy application code (only backend + frontend static files used by Flask)
COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

# Create non-root user
RUN useradd -m appuser || true
USER appuser

EXPOSE 8080

# Use gunicorn if available; fallback to flask dev server
CMD ["sh", "-c", "if command -v gunicorn >/dev/null 2>&1; then exec gunicorn -w 4 -b 0.0.0.0:8080 app:app; else exec python app.py; fi"]
