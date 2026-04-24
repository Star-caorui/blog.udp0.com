+++
title = "如何在云服务器上装 Arch Linux"
date = 2020-06-09T23:31:00+08:00
draft = false
lastmod = 2022-02-26T20:48:51+08:00
slug = "vps2arch"
+++

{{% caution title="高风险操作" %}}
重装系统会**抹掉**云服务器的**硬盘**，请先备份好所有重要数据。
{{% /caution %}}

{{% note title="适用人群" %}}
这篇文章更适合已有 Linux 操作经验的用户，不推荐毫无经验的读者直接照做。
{{% /note %}}
<!--more-->

### 前言
{{% warn title="操作提醒" %}}
- 本文更适合已经在使用 Arch Linux，或者至少熟悉 Linux 基础操作的用户。
- 本文介绍的脚本会在运行时**格式化**硬盘，请确认你已经备份好重要数据再继续。
{{% /warn %}}

### 工具
- vps2arch
    - [Gitlab 官方介绍][1]
    - [ArchWiki(中文页) 介绍页][2]
    - [ArchWiki(英文页) 介绍页][3]

### 后续更新
{{% success title="当前推荐" %}}
推荐使用由 Arch Linux TU **Felix Yan** 维护的 [vps2arch][4]。
{{% /success %}}

### 使用方法
#### 1. 下载脚本文件
```shell
wget https://felixc.at/vps2arch
```
#### 2. 赋予执行权限
```shell
chmod +x vps2arch
```
#### 3. 执行脚本文件
```shell
./vps2arch -m [镜像源]
```
#### 例如:
```shell
wget https://felixc.at/vps2arch
chmod +x vps2arch
./vps2arch -m https://mirrors.bfsu.edu.cn/archlinux/
```


[1]: https://gitlab.com/drizzt/vps2arch
[2]: https://wiki.archlinux.org/index.php/Install_Arch_Linux_from_existing_Linux_(%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87)#%E4%BB%8E%E4%B8%80%E4%B8%AA%E4%B8%BB%E6%9C%BA%E8%BF%90%E8%A1%8C%E5%8F%A6%E4%B8%80%E4%B8%AALinux%E5%8F%91%E8%A1%8C%E7%89%88
[3]: https://wiki.archlinux.org/index.php/Install_Arch_Linux_from_existing_Linux#From_a_host_running_another_Linux_distribution
[4]: https://github.com/felixonmars/vps2arch/
