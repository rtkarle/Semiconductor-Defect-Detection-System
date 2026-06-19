# This Dockerfile is for Docker/local use only.
# Render.com uses native Python runtime — NOT this Dockerfile.
# Render build command: pip install -r requirements.txt
# Render start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p uploads reports

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
