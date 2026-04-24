+++
title = "如何准备一个 Arch Linux 的 Deepin 子系统"
date = 2022-03-04T00:15:00+08:00
draft = false
lastmod = 2022-05-04T23:06:02+08:00
slug = "arch-subsystem-deepin"
[build]
list = 'never'
render = 'always'
+++

{{% caution title="本文已失效" %}}
本文在 2022-05-04 已确认失效，故已隐藏。如你通过其他途径访问到这里，请不要继续照本文操作。
{{% /caution %}}

### 介绍
你可能出于某种原因想使用一些来自 Deepin 的软件，但不想让这个软件污染的你本地环境，这时候你就需要用到 systemd-nspawn 来使用你的任意 Linux 子系统了。

>  systemd-nspawn 可以当作一个容器使用。就像是 chroot/docker, 但它比 chroot/docker 更强大。
```
```
>  systemd-nspawn 可以在轻量命名空间容器中运行命令或操作系统，它完全虚拟化了文件系统的层次结构、进程树、各种 IPC 子系统、主机和域名。
```
```
>  systemd-nspawn 将对容器中各种内核接口的访问限制为只读，例如 /sys、/proc/sys 或 /sys/fs/selinux。网络接口和系统时钟可能不会从容器内更改。可能无法创建设备节点。无法重新启动主机系统，并且可能不会从容器内加载内核模块。
```
```
>  systemd-nspawn 是比 LXC 或 Libvirt 更容易配置的工具。

以上表述摘自 [Arch Wiki][1]

### 创建子系统
```shell
# 如果你不使用 btrfs, 或不想为其创建子卷，可以跳过下行命令。
# 其中，deepin-x86_64 可以被随意更改。
sudo btrfs subvolume create /var/lib/machines/deepin-x86_64

# 请按需创建您需要的子系统，下面提供了创建 Arch, Deepin 子系统的方法。
# 你可以根据创建 Deepin 子系统的脚本，修改软件源，软件仓库，使用的安装脚本来安装其他 Debian 系发行版作为子系统。

# 创建 Arch Linux 子系统
# 提示：base 包不依赖于 linux 内核包，并且是容器就绪。
sudo pacman -S arch-install-scripts archlinux-keyring
sudo pacstrap -c /var/lib/machines/archlinux-x86_64 base

# 创建 Debian 系的 子系统：以 Deepin 为例
sudo pacman -S debootstrap debian-archive-keyring ubuntu-keyring
sudo debootstrap --variant=minbase --no-check-gpg --merged-usr --include=systemd-container --components=main,non-free,contrib apricot /var/lib/machines/deepin-x86_64 https://mirrors.bfsu.edu.cn/deepin/ /usr/share/debootstrap/scripts/stable
```

### 在 Deepin 子系统中安装些软件
```shell
# 进入子系统
sudo systemd-nspawn -D /var/lib/machines/deepin-x86_64
# 启用 32 位软件仓库
dpkg --add-architecture i386
# 添加 Deepin 的软件商店的仓库
echo 'deb https://com-store-packages.uniontech.com/appstore deepin appstore' > /etc/apt/sources.list.d/appstore.list
# 更新软件仓库，并安装 deepin-keyring 用于鉴权。
apt update
apt --fix-broken -y install
apt --no-install-recommends -y install deepin-keyring
# 您可以根据需要选择性安装下列软件。
apt --no-install-recommends -y install x11-utils
apt --no-install-recommends -y install com.qq.office.deepin
apt --no-install-recommends -y install com.qq.weixin.deepin
apt -y autopurge
```

### 配置子系统
```shell
# 安装 sudo, 以及你喜欢的文本编辑器。
apt install sudo nano

# 创建用户，并设置密码
useradd -m -G sudo 用户名
passwd 用户名

# 连按 Ctrl+] 三次来关闭容器。
# 使用绑定参数，允许容器内使用宿主机的 xorg，pulse 并重新启动容器，登录用户。
sudo systemd-nspawn --bind=/tmp/.X11-unix:/tmp/.X11-unix --bind=/run/user/1000/pulse:/run/user/host/pulse --setenv=LANGUAGE=zh_CN:zh -bD /var/lib/machines/deepin-x86_64

# 配置环境变量
# 你也许可以写到 .bashrc 或其他 shell 的 rc 里
export LANGUAGE=zh_CN:zh
export DISPLAY=:0
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
export INPUT_METHOD=fcitx
export SDL_IM_MODULE=fcitx
```
此时，你就可以在子系统中使用图形化应用了。

[1]: https://wiki.archlinux.org/title/Systemd-nspawn
