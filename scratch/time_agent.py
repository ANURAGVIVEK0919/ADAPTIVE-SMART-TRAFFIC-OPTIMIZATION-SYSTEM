import time
import os
import sys
import numpy as np

# Add root folder to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import torch
from backend.ai.rl.agent import DQNAgent

# Preload agent
agent = DQNAgent(15, 2)
model_path = os.path.join("models", "dqn_indian_traffic_final.pth")
if os.path.exists(model_path):
    agent.load(model_path)
    agent.epsilon = 0.0

# Prepare mock observation (15 features)
obs = np.random.rand(15).astype(np.float32)

print("\n--- Running 5 successive acts ---")
for i in range(5):
    start = time.time()
    action = agent.act(obs)
    end = time.time()
    print(f"Act {i+1} took: {(end - start) * 1000:.3f} ms (Action = {action})")
