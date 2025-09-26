#!/usr/bin/env python3
# Create a small PyTorch model and export to ONNX with conservative ops
import torch
import torch.nn as nn

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

if __name__ == '__main__':
    import os
    model = SlimCNN()
    model.eval()
    dummy = torch.zeros(1,1,32, dtype=torch.float32)
    out_path = os.path.join('models','toy_cnn_slim.onnx')
    torch.onnx.export(model, dummy, out_path, input_names=['input'], output_names=['output'], opset_version=13)
    print('Exported', out_path)
