+++
title = "通过 Air Play 在你的 Arch Linux 播放音乐"
date = 2021-11-14T23:09:00+08:00
draft = false
lastmod = 2024-12-29T09:42:05+08:00
slug = "use-airplay-on-arch"
+++

*因为我打算使用 Apple Music 当我的音乐播放器，但 Apple Music 在 Arch Linux 下体验并不好。aur 的客户端是一个网页版套壳，网页版使用体验也就那样。不如通过 iPhone 播放然后把音频推到我的 Arch Linux,这样岂不是可以使用手机播放音乐，使用电脑的扬声器播放音乐了？（你甚至可以用 Siri/Apple Watch 来切歌）*


<!--more-->


### 方案
- [通过蓝牙 推到 Arch Linux][1]：受蓝牙稳定性限制，此方案已被 PASS
- [通过 Air Play 推到 Arch Linux][2]：需 iPhone 和 Arch 处于同一局域网

### 所需软件
软件包：shairport-sync
```shell
sudo pacman -S shairport-sync
```
### 配置方法
#### 启动 avahi-daemon
Shairport Sync 需要运行 avahi-daemon 后才能启动。你可以通过 systemd 来启动 avahi-daemon.service
```shell
sudo systemctl enable --now avahi-daemon.service
```
#### 配置 shairport-sync
shairport-sync 需要作为 user service 启动。如果通过 systemd service 启动则有可能遇到无声音的问题。
```shell
cp /usr/lib/systemd/system/shairport-sync.service /etc/systemd/user/
```
编辑这份 user service，并按照以下内容注释。
```shell
sudoedit /etc/systemd/user/shairport-sync.service
```
```
[Unit]
...
#Requires=avahi-daemon.service
#After=avahi-daemon.service
...
[Service]
...
#User=shairport-sync
#Group=shairport-sync
...
```
#### 启动 shairport-sync
```shell
sudo systemctl --user enable --now shairport-sync.service
```


[1]: https://wiki.archlinux.org/title/Bluetooth_headset
[2]: https://wiki.archlinux.org/title/Shairport_Sync
