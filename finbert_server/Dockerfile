
FROM python:3.10-slim
LABEL org.opencontainers.image.source="https://github.com/dist0rtilla/AITrader"
WORKDIR /app
ENV MODEL_NAME="yiyanghkust/finbert-tone"
ENV PYTHONUNBUFFERED=1
COPY . /app

# Install minimal build deps for possible native wheels and curl for HEALTHCHECK
RUN apt-get update \
		&& apt-get install -y --no-install-recommends build-essential git curl \
		&& rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD curl -fsS http://127.0.0.1:5000/health || exit 1

CMD ["python3", "finbert_server/app.py"]
