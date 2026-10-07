+++
title = "使用 Windows 11 的 WSL2 运行 ChatGLM 大模型"
description = "记录在 Windows 11 的 WSL2 环境中运行 ChatGLM 大模型的准备与安装步骤。"
date = 2026-10-08T04:06:18+08:00
lastmod = 2026-10-08T04:06:18+08:00
slug = "wsl"
+++

> [!NOTE] 写在前面
> 这篇文章创建于 2024 年 12 月 29 日，但因为我太懒了，一直拖到 2026 年 10 月 8 日才写完。文章里的步骤是我当时的做法，现在软件的版本可能已经变了。

*记录一下我在 Windows 11 的 WSL2 里跑 ChatGLM-6B 的过程。步骤其实没几步，就是 CUDA 该装在哪这件事容易搞错。（先说结论：Windows 上只装显卡驱动，CUDA 装在 WSL 里面）*

<!--more-->

## 前言
[ChatGLM-6B][1] 是清华开源的一个对话模型，支持中文，可以在自己的显卡上跑。我是放在 WSL2 里面跑的，这篇文章就是记录这个过程。

## 阅读提醒
> [!NOTE] 阅读提醒
> - 本文基于 Windows 11 的 WSL2（Ubuntu）编写，显卡是 NVIDIA 的。
> - 你需要先装好 WSL2 和 Ubuntu，本文不讲这部分。
> - ChatGLM-6B 不量化的话大约需要 13 GB 显存。显存不够的可以看最后一节。

## 准备工作
### 在 Windows 上安装显卡驱动
请在 Windows 上安装显卡驱动，只此就好。不需要在 Windows 上安装 CUDA。

Windows 上的显卡驱动会自动映射到 WSL 里面，所以 WSL 里面也不需要再装显卡驱动。装好之后可以在 WSL 里执行 `nvidia-smi`，能看到你的显卡就说明没问题。

> [!WARNING] 不要在 WSL 里装显卡驱动
> 如果你在 WSL 里又装了一份 Linux 的显卡驱动，会把映射进来的那份覆盖掉。[NVIDIA 的文档][2] 也说了不要这么做。

### 在 WSL 里安装 CUDA
普通的 CUDA 安装包是带显卡驱动的，装了就会出现上面说的覆盖问题。所以 NVIDIA 给 WSL 单独准备了一个软件源（wsl-ubuntu），这个源里的 CUDA 不带显卡驱动。请用这个源来装。
```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/wsl-ubuntu/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update
sudo apt-get -y install cuda-toolkit-12-3
```

> [!TIP] 关于版本
> - `cuda-toolkit-12-3` 是我当时装的版本，你可以换成更新的。
> - 只装 `cuda-toolkit` 就好。不要装 `cuda`、`cuda-drivers` 这类包，它们会把 Linux 的显卡驱动也一起装上。

## 安装 ChatGLM
在 WSL 里拉取仓库，进入目录，安装依赖。
```bash
git clone https://github.com/THUDM/ChatGLM-6B
cd ChatGLM-6B
pip install -r requirements.txt
```
（可能需要换源以及使用科学上网）

## 开始享用吧
新建一个 Python 文件，写入以下内容，然后运行。
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
第一次运行会自动下载模型，需要等一会。（这一步同样可能需要科学上网）

能看到模型回复你，就算跑起来了。完成~！

## 显存不够怎么办
ChatGLM-6B 支持量化，量化之后显存占用会少很多，代价是回复质量会差一些。

- 不量化：大约需要 13 GB 显存
- 8-bit 量化：大约需要 8 GB 显存
- 4-bit 量化：大约需要 6 GB 显存

用法是把上面加载模型的那一行改成下面这样。括号里可以填 8 或者 4。
```python
model = AutoModel.from_pretrained("THUDM/chatglm-6b", trust_remote_code=True).quantize(8).half().cuda()
```


[1]: https://github.com/THUDM/ChatGLM-6B
[2]: https://docs.nvidia.com/cuda/wsl-user-guide/index.html
