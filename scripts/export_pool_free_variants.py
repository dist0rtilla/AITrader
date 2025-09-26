#!/usr/bin/env python3
"""Export ONNX variants that avoid ONNX AveragePool by implementing pooling as unfold + mean.

Creates models/toy_cnn_poolfree.onnx and toy_cnn_poolfree_no_folding.onnx
"""
import torch
import torch.nn as nn
import os

class PoolFreeConv(nn.Module):
    def __init__(self, in_ch=1, out_ch=8, kernel_size=3, padding=1):
        super().__init__()
        self.conv = nn.Conv1d(in_ch, out_ch, kernel_size=kernel_size, padding=padding)
        self.relu = nn.ReLU()
        # no pooling layer here; we'll implement pooling as unfold+mean in forward

    def forward(self, x):
        x = self.conv(x)
        x = self.relu(x)
        # emulate AvgPool1d(kernel_size=2) with unfold and mean
        # x: [B, C, L]
        u = x.unfold(dimension=2, size=2, step=2)  # [B, C, L/2, 2]
        out = u.mean(dim=-1)
        return out

class Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.layer1 = PoolFreeConv(1, 8, 3, 1)
        self.layer2 = PoolFreeConv(8, 16, 3, 1)
        self.adapt = nn.AdaptiveAvgPool1d(1)
        self.flatten = nn.Flatten()
        self.fc = nn.Linear(16, 2)

    def forward(self, x):
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.adapt(x)
        x = self.flatten(x)
        x = self.fc(x)
        return x

os.makedirs('models', exist_ok=True)
model = Model().eval()
example = torch.zeros(1,1,32)

out1 = 'models/toy_cnn_poolfree.onnx'
torch.onnx.export(model, example, out1, input_names=['input'], output_names=['output'], opset_version=13)
print('exported', out1)

out2 = 'models/toy_cnn_poolfree_no_folding.onnx'
torch.onnx.export(model, example, out2, input_names=['input'], output_names=['output'], opset_version=13, do_constant_folding=False)
print('exported', out2)
