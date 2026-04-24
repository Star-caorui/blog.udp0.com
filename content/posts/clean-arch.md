+++
title = "如何规整你的 Arch Linux 系统"
date = 2023-01-27T11:35:00+08:00
draft = false
lastmod = 2024-12-29T09:57:38+08:00
slug = "clean-arch"
+++

前言：请了解[根目录的结构][1]，并达成共识。约定好我们不应该处理哪些文件夹。

### 一般结构
- boot
此目录**不做处理**。因为这里用于存放引导文件，内核的目录。
- efi
此目录**不做处理**。因为这里用于存放 ESP 的目录。
- etc
此目录**需要做处理**。因为这里可能含有用户修改过的配置文件。
- home
此目录**暂时不做处理**。限于篇幅原因，清理家目录我打算放到下一篇文章，本篇文章仅介绍清理系统目录。
- root
此目录**暂时不做处理**。限于篇幅原因，清理家目录我打算放到下一篇文章，本篇文章仅介绍清理系统目录。
- srv
此目录**需要做处理**。因为这里可能含有用户修改过的关于服务器的数据存储路径。
- tmp
此目录**不做处理**，因为一个 `tmpfs` 文件系统。

### 运行时数据
- run
此目录**不做处理**，因为一个 `tmpfs` 文件系统。

### 供应商提供的操作系统资源
- /usr
此目录**需要做处理**。因为这里含有操作系统文件，此目录不应被用户修改，如必要需检查一遍并还原修改。

### 持久变量系统数据
- /var
此目录**需要做处理**。关于此目录的介绍请参阅：[持久变量系统数据][2]

### 虚拟内核和 API 文件系统
此目录**不做处理**。因为这是一个虚拟内核和 API 文件系统。详细信息请参阅：[虚拟内核和 API 文件系统][3]
- dev
- proc
- sys

### 兼容性符号链接
- bin -> usr/bin
此目录**不做处理**。因为我们将会处理 `/usr/bin` 目录。
- sbin -> usr/bin
此目录**不做处理**。因为我们将会处理 `/usr/bin` 目录。
- lib -> usr/lib
此目录**不做处理**。因为我们将会处理 `/usr/lib` 目录。
- lib64 -> usr/lib
此目录**不做处理**。因为我们将会处理 `/usr/lib` 目录。

### 其他目录
- opt
此目录**需要做处理**。因为此目录包含一些大型软件包，您可能需要处理卸载残留。
- mnt
此目录**需要做处理**。是供用户自行挂载分区所使用的，您可能曾经把这里搞得乱七八糟的。

### 总结
我们需要对以下目录做处理：
手动处理：`srv` `mnt`
`etc`：如果您想要整理一下此文件夹，请跟随以下步骤。
```shell
# 查找在此目录下，不被 pacman 管理的文件
find /etc | LC_ALL=C pacman -Qqo - 2>&1 >&- >/dev/null | cut -d ' ' -f 5-

# 查找被 pacman 管理的，但被修改过的文件
sudo pacman -Qkk 2>&1 | grep /etc
```
`var`：请谨慎清理此文件夹。此文件夹可能含有部分软件的家目录。
```shell
# 查找在此目录下，不被 pacman 管理的文件
find /var | LC_ALL=C pacman -Qqo - 2>&1 >&- >/dev/null | cut -d ' ' -f 5-

# 查找被 pacman 管理的，但被修改过的文件
sudo pacman -Qkk 2>&1 | grep /var
```
`usr`：此目录不应该被修改过，请确保始终使用 pacman 管理软件包。让专业的软件干专业的事。但如果被修改过，请尝试跟随以下步骤。
```shell
# 查找在此目录下，不被 pacman 管理的文件
find /usr | LC_ALL=C pacman -Qqo - 2>&1 >&- >/dev/null | cut -d ' ' -f 5-

# 查找被 pacman 管理的，但被修改过的文件
sudo pacman -Qkk 2>&1 | grep /usr
```

`opt`：此目录不应该被修改过，请确保始终使用 pacman 管理软件包。让专业的软件干专业的事。但如果被修改过，请尝试跟随以下步骤。
```shell
# 查找在此目录下，不被 pacman 管理的文件
find /opt | LC_ALL=C pacman -Qqo - 2>&1 >&- >/dev/null | cut -d ' ' -f 5-

# 查找被 pacman 管理的，但被修改过的文件
sudo pacman -Qkk 2>&1 | grep /opt
```

### 卸载不需要的软件
```shell
# 查找主动安装的软件包
pacman -Qe

# 查找主动安装的，不在 base 包组里的软件包。
comm -23 <(pacman -Qqe | sort) <(expac -l '\n' '%E' base | sort)

# 查找主动安装的，不在 base base-devel 包组的软件包。
comm -23 <(pacman -Qqe | sort) <({ pacman -Qqg base-devel; expac -l '\n' '%E' base; } | sort -u)

# 列出其他软件包不需要的所有已安装软件包，以及不在基本元软件包或基本软件包组中的软件包：
comm -23 <(pacman -Qqt | sort) <({ pacman -Qqg base-devel; echo base; } | sort -u)

# 如上所述，但有描述：
expac -H M '%-20n\t%10d' $(comm -23 <(pacman -Qqt | sort) <({ pacman -Qqg base-devel; echo base; } | sort -u))
```

### 清理不被包管理器所跟踪的文件
使用 pacman 安装 lostfiles。lostfiles 包含一些过滤规则，会过滤掉常见的误报。
```shell
sudo lostfiles
```

### 清理不需要的用户和组
编辑以下文件：
- /etc/passwd
- /etc/group
- /etc/shadow
- /etc/gshadow
请保留 root 用户，root 组。以及其他你所需要的用户，组。系统用户和组请勿保留。然后运行以下命令重新生成系统用户，组。
```shell
# 查找 所有的用户列表 （这些用户请一定要保留，除非你想删除这个用户。）
cat /etc/passwd | grep -v nologin

# 查找 所有的系统用户列表
cat /etc/passwd | grep nologin

# 重新生成系统用户
sudo systemd-sysusers
```

### 参考资料
- [Arch File-Hierarchy][4]
- [Pacman Tips_and_tricks][5]
- [Users_and_groups][6]
- [System_maintenance][7]


[1]: https://man.archlinux.org/man/file-hierarchy.7
[2]: https://man.archlinux.org/man/file-hierarchy.7#PERSISTENT_VARIABLE_SYSTEM_DATA
[3]: https://man.archlinux.org/man/file-hierarchy.7#VIRTUAL_KERNEL_AND_API_FILE_SYSTEMS
[4]: https://man.archlinux.org/man/file-hierarchy.7
[5]: https://wiki.archlinux.org/title/Pacman/Tips_and_tricks
[6]: https://wiki.archlinux.org/title/Users_and_groups
[7]: https://wiki.archlinux.org/title/System_maintenance
