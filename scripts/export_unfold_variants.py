#!/usr/bin/env python3
"""Export ONNX variants that avoid Conv by using unfold + matmul to emulate Conv1d.

This creates models/toy_cnn_unfold.onnx and toy_cnn_unfold_no_folding.onnx
"""
import torch
import torch.nn as nn
import os

class UnfoldConv1d(nn.Module):
    def __init__(self, in_ch=1, out_ch=8, kernel_size=3, padding=1):
        super().__init__()
        self.kernel_size = kernel_size
        self.padding = padding
        self.weight = nn.Parameter(torch.randn(out_ch, in_ch * kernel_size))
        self.bias = nn.Parameter(torch.randn(out_ch))

    def forward(self, x):
        # x: [B, C, L]
        # unfold -> [B, C*K, L]
        u = nn.functional.unfold(x.unsqueeze(-1), kernel_size=(self.kernel_size, 1), padding=(self.padding, 0))
        # u: [B, C*K, L] where L is sequence length
        # transpose to [B, L, C*K]
        u = u.transpose(1, 2)
        # matmul with weight.T -> [B, L, out_ch]
        out = torch.matmul(u, self.weight.t()) + self.bias
        # transpose to [B, out_ch, L]
        out = out.transpose(1, 2)
        return out

class Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = UnfoldConv1d(1, 8, 3, 1)
        self.act = nn.ReLU()
        self.pool = nn.AvgPool1d(2)
        self.conv2 = UnfoldConv1d(8, 16, 3, 1)
        self.act2 = nn.ReLU()
        self.adapt = nn.AdaptiveAvgPool1d(1)
        self.flatten = nn.Flatten()
        self.fc = nn.Linear(16, 2)

    def forward(self, x):
        x = self.conv1(x)
        x = self.act(x)
        x = self.pool(x)
        x = self.conv2(x)
        x = self.act2(x)
        x = self.adapt(x)
        x = self.flatten(x)
        x = self.fc(x)
        return x

os.makedirs('models', exist_ok=True)

model = Model().eval()
example = torch.zeros(1,1,32)

out1 = 'models/toy_cnn_unfold.onnx'
torch.onnx.export(model, example, out1, input_names=['input'], output_names=['output'], opset_version=13)
print('exported', out1)

out2 = 'models/toy_cnn_unfold_no_folding.onnx'
torch.onnx.export(model, example, out2, input_names=['input'], output_names=['output'], opset_version=13, do_constant_folding=False)
print('exported', out2)
