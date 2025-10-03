FROM python:3.10-slim

WORKDIR /app

COPY ../requirements.txt /tmp/requirements.root.txt
RUN pip install --no-cache-dir -r /tmp/requirements.root.txt

COPY requirements.txt /tmp/requirements.predictions.txt
RUN pip install --no-cache-dir -r /tmp/requirements.predictions.txt

COPY . /app/predictions_engine

ENV PYTHONPATH=/app

EXPOSE 8011

CMD ["python", "-u", "predictions_engine/main.py"]

