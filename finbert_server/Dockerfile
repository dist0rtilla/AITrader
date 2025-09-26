FROM python:3.10-slim
LABEL org.opencontainers.image.source="https://github.com/dist0rtilla/AITrader"
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential git && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir -r requirements.txt
CMD ["python3", "app.py"]
