+++
title = "使用 Windows 11 的 WSL2 运行 ChatGLM 大模型"
date = 2024-12-29T09:59:30+08:00
draft = false
lastmod = 2024-12-29T09:59:31+08:00
slug = "wsl"
[build]
list = 'never'
render = 'always'
+++

文章施工中~~

## 准备工作
- 安装驱动：请在 Windows 上安装显卡驱动，只此就好。不需要在 Windows 安装 CUDA 等操作。
- 在 WSL 中安装 CUDA，如下所述
```
wget https://developer.download.nvidia.com/compute/cuda/repos/wsl-ubuntu/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update
sudo apt-get -y install cuda-toolkit-12-3
```
在wsl中拉取仓库：git clone https://github.com/THUDM/ChatGLM-6B
进入目录：cd ChatGLM-6B
拉取依赖：pip install -r requirements.txt
（可能需要换源以及使用科学上网）
```python
from transformers import AutoTokenizer, AutoModel
tokenizer = AutoTokenizer.from_pretrained("THUDM/chatglm-6b", trust_remote_code=True)
model = AutoModel.from_pretrained("THUDM/chatglm-6b", trust_remote_code=True).half().cuda()
model = model.eval()
response, history = model.chat(tokenizer, "你好", history=[])
print(response)
response, history = model.chat(tokenizer, "晚上睡不着应该怎么办", history=history)
print(response)
```
完成~！
