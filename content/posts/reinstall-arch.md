+++
title = "记一次 Arch Linux 的重新安装"
date = 2022-12-24T18:19:00+08:00
draft = false
lastmod = 2024-12-29T09:56:18+08:00
slug = "reinstall-arch"
[build]
list = 'never'
render = 'always'
+++

最近有个朋友送了块硬盘给我。既然多了块硬盘，那就装个 Arch Linux 吧！

<!--more-->

### 本文可能涉及的内容：
#### 基本系统安装：
- 基本系统
- 在 initrd 中使用 systemd
- 统一内核映像
- 安全启动
- 全盘加密
- TPM 自动解密硬盘
- Gnome 桌面环境
- Fcitx5 拼音输入法
- Fcitx5 输入法皮肤
#### 高级系统配置：
- 基于代理的网络质量优化
- DNS 优化
- 其他常用软件的推荐及安装

### 安装 Arch Linux
前提假设你已完成下载并校验，成功制作 Arch Linux ISO 安装媒介，并已临时关闭安全启动。通过 UEFI 启动并引导到 Arch Linux ISO 安装媒介。

{{% note title="前提条件" %}}
我不会对传统引导提供支持，因为安全引导需要 UEFI。
{{% /note %}}

首先，让我们做一些准备工作。换源并更新 Arch Linux ISO 中的密钥链。

{{% warn title="操作提醒" %}}
这里的部分更新方式并不算最佳实践，请自行判断是否接受。
{{% /warn %}}

```shell
echo "Server = https://mirrors.bfsu.edu.cn/archlinux/$repo/os/$arch" > /etc/pacman.d/mirrorlist
pacman -Syy archlinux-keyring
```
然后，使用任意分区编辑工具划分分区。例如 `fdisk` `gdisk` `parted` `cfdisk`(简单) 一个 260M (理论来说最低要求是可以存放一个内核映像，最高建议不超过 4 GiB。因为fat32最大支持单文件 4 GiB) 的 EFI 分区。以及剩余空间我推荐分成一个分区。你也可以按照自己的想法划分分区。

接下来使用 cryptsetup 来加密非 EFI 分区。
```shell
cryptsetup -s 512 luksFormat /dev/sdXn
```
解密硬盘，并挂载硬盘开始安装。
```shell
cryptsetup open /dev/sdXn XXX
mount /dev/mapper/XXX /mnt
mkdir /mnt/efi
mount /dev/sdXn /mnt/efi
pacstrap /mnt base
genfstab -U /mnt > /mnt/etc/fstab
```
