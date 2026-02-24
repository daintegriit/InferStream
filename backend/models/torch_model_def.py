# backend/models/torch_model_def.py

import torch.nn as nn

class SimpleFeedforward(nn.Module):
    def __init__(self, input_size=14):  # Use 14 based on your training screenshot
        super(SimpleFeedforward, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x)