FROM python:3.10-slim
LABEL org.opencontainers.image.source="https://github.com/dist0rtilla/AITrader"
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir -r requirements.txt
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8082"]
