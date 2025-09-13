import torch
x = torch.randn(2000, 2000, device='cuda')
y = torch.matmul(x, x)
print(y.norm())
