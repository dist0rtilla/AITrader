from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

app = Flask('finbert_server')

MODEL_NAME = 'yiyanghkust/finbert-tone'

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    finbert = pipeline('sentiment-analysis', model=model, tokenizer=tokenizer)
except Exception as e:
    finbert = None


@app.route('/health')
def health():
    return jsonify({'ok': finbert is not None})


@app.route('/predict', methods=['POST'])
def predict():
    if finbert is None:
        return jsonify({'error': 'model not loaded'}), 500
    data = request.json or {}
    text = data.get('text', '')[:1024]
    res = finbert(text)
    return jsonify(res)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
