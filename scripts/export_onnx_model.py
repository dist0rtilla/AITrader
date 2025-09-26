"""Train a tiny 1D CNN on synthetic sequence data and export to ONNX.

Produces `models/toy_cnn.onnx` in the repo root. Intended for local testing and
for demonstrating ONNXRuntime integration in the Rust native engine.
"""
import os
import torch
import torch.nn as nn
import torch.nn.functional as F

OUT_DIR = "models"
os.makedirs(OUT_DIR, exist_ok=True)

WINDOW = 32

class TinyCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv1d(1, 8, 3, padding=1)
        self.conv2 = nn.Conv1d(8, 16, 3, padding=1)
        self.fc = nn.Linear(16 * WINDOW, 2)

    def forward(self, x):
        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        x = x.view(x.size(0), -1)
        return self.fc(x)


def synthetic_data(batch=128, window=WINDOW):
    # create synthetic sequences where class 1 has a large spike
    X = torch.randn(batch, 1, window) * 0.1 + 1.0
    y = torch.zeros(batch, dtype=torch.long)
    for i in range(batch // 4):
        idx = i
        pos = torch.randint(0, window, (1,)).item()
        X[idx, 0, pos:pos+3] += 2.0
        y[idx] = 1
    return X, y


def train_and_export(path=os.path.join(OUT_DIR, "toy_cnn.onnx")):
    model = TinyCNN()
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    # tiny train loop
    model.train()
    for epoch in range(10):
        X, y = synthetic_data(256)
        logits = model(X)
        loss = loss_fn(logits, y)
        opt.zero_grad()
        loss.backward()
        opt.step()
        if epoch % 2 == 0:
            print(f"epoch {epoch} loss={loss.item():.4f}")

    # export to ONNX
    model.eval()
    dummy = torch.randn(1, 1, WINDOW)
    torch.onnx.export(model, dummy, path, opset_version=13, input_names=["input"], output_names=["output"])    
    print("exported", path)


if __name__ == '__main__':
    train_and_export()
