#!/usr/bin/env python3
"""Export multiple ONNX variants for testing GPU kernels."""
import torch
import torch.nn as nn
import os

class SlimCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv1d(1, 8, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.AvgPool1d(2),
            nn.Conv1d(8, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(16, 2)
        )
    def forward(self, x):
        return self.net(x)

class MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, 2)
        )
    def forward(self, x):
        return self.net(x.view(x.size(0), -1))

os.makedirs('models', exist_ok=True)

model = SlimCNN().eval()
dummy = torch.zeros(1,1,32)

# opset variants
for opset in (11,12,13):
    out = f'models/toy_cnn_opset{opset}.onnx'
    torch.onnx.export(model, dummy, out, input_names=['input'], output_names=['output'], opset_version=opset)
    print('exported', out)

# no fusion / constant folding off
out = 'models/toy_cnn_no_folding.onnx'
torch.onnx.export(model, dummy, out, input_names=['input'], output_names=['output'], opset_version=13, do_constant_folding=False)
print('exported', out)

# MLP variant
mlp = MLP().eval()
out = 'models/toy_mlp.onnx'
torch.onnx.export(mlp, dummy, out, input_names=['input'], output_names=['output'], opset_version=13)
print('exported', out)
