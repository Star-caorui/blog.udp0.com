+++
title = "在 Arch Linux 使用 SmartDNS 来加速 DNS 解析"
description = "介绍如何在 Arch Linux 上使用 SmartDNS 结合 ChinaList 优化 DNS 解析体验。"
date = 2022-09-04T09:04:00+08:00
lastmod = 2025-06-16T13:59:50+08:00
slug = "smartdns-on-arch"
+++

## 前言
我之前写过一篇 [在 Arch Linux 使用 DoH 来加密你的 DNS][1] 来解决 DNS 污染的问题，但这个方案还是有些问题。

> [!NOTE] 背景说明
> 使用 DoH 后，DNS 解析速度可能会下降，这是正常现象。因为无论什么 DNS，一般都很难比 ISP 自带 DNS 更快，只是运营商返回的结果可能存在劫持或污染。

SmartDNS 就是用来解决上述问题的，它可以搭配一套名叫 ChinaList 的规则列表。命中规则的可以设置走「运营商」或其他高速 DNS 以此来获得更快的解析体验。而没有命中规则的可以默认走指定的纯净 DNS。上游 DNS 支持以下协议。
- UDP/TCP 53（常规 DNS 查询）
- DoT 853（DNS over TLS 查询）
- DoH 443（DNS over HTTPS 查询）

> [!TIP] 补充说明
> 理论上 SmartDNS 可以代替 `dns-over-https`，因为 SmartDNS 也支持 DoH 上游。

## 阅读提醒
> [!NOTE] 阅读提醒
> - 本文基于 Arch Linux 编写，如果你使用其他发行版，部分操作可能不一致。
> - 本文对其他同样使用 systemd 的发行版也可能有参考价值。
> - 使用 SmartDNS 后，部分域名的解析速度仍可能下降，因为它们未必会命中 ChinaList。

## 安装
> [!TIP] 安装前
> 你需要先启用 [archlinuxcn][2] 仓库。

```bash
pacman -S smartdns
pacman -S smartdns-china-list-git
```
（其他非 Arch，及其衍生发行版的用户请自行使用你所使用的包管理器安装）

## 配置
### 配置解析顺序
请使用任意编辑器修改 /etc/nsswitch.conf 文件。系统在解析未知的地址时会从左到右匹配。
```text
...
hosts: myhostname mymachines files dns
...
```

- myhostname 匹配 此设备的名称（/etc/hostname）
- mymachines 匹配 本地容器的名称
- mdns_minimal 匹配 multicast DNS（请自行了解使用）
- files 匹配 hosts 文件（/etc/hosts）
- resolve 匹配 systemd-resolved
- dns 匹配从 /etc/resolv.conf 进行的 dns 查询

### 配置 SmartDNS 客户端
请使用任意编辑器修改 /etc/smartdns/smartdns.conf 文件。
```text
# bind 监听 指定 IP/端口 的 UDP 查询请求
# bind-tcp 监听 指定 IP/端口 的 TCP 查询请求
bind [127.0.0.1]:53
bind-tcp [127.0.0.1]:53
bind [::1]:53
bind-tcp [::1]:53

# 下面三组是我自己机器上的地址和网卡，照抄会绑定失败。需要对局域网提供服务时，换成你自己的再取消注释。
# bind [192.168.1.4]:53
# bind-tcp [192.168.1.4]:53

# bind [fe80::4%bond0]:53
# bind-tcp [fe80::4%bond0]:53

# bind [fe80::192:168:1:4%bond0]:53
# bind-tcp [fe80::192:168:1:4%bond0]:53

# 载入 ChinaList
conf-file accelerated-domains.china.smartdns.conf
conf-file apple.china.smartdns.conf
conf-file google.china.smartdns.conf

# 最大缓存域名个数：16384
cache-size 16384
# 把缓存保存到磁盘，重启服务后仍然可用
cache-persist yes
# 缓存文件路径（/tmp 在系统重启后会清空，想跨重启保留请换到 /var/cache 下）
cache-file /tmp/smartdns.cache

# 日志级别：信息
log-level info
# 最大返回 IP 个数
max-reply-ip-num 16
# 预请求域名：缓存预热。加速解析速度，优化用户体验。
prefetch-domain yes
# 智能双栈：智能在 IPv6 和 IPv4 之间选择一个最好的进行连接。
# 在检测到 IPv6 连接质量不如 IPv4 时，阻断 AAAA 解析。防止操作系统优先使用 IPv6。
# 建议关闭，在 DNS 支持双栈，而客户端仅支持单栈时会发生故障。（别问我咋知道的，测出来的...）
dualstack-ip-selection no
# 测速模式：tcp ping 或 icmp ping
# SmartDNS 会同时向多个上游查询，再对返回的 IP 测速，把最快的结果交给客户端。
speed-check-mode tcp:443,ping

# 阿里上游服务器
server 223.5.5.5 -group china -exclude-default-group
server 223.6.6.6 -group china -exclude-default-group
server 2400:3200::1 -group china -exclude-default-group
server 2400:3200:baba::1 -group china -exclude-default-group

# 腾讯上游服务器
server 119.29.29.29 -group china -exclude-default-group
server 2402:4e00:: -group china -exclude-default-group
server 2402:4e00:1:: -group china -exclude-default-group

# 南京信风上游服务器
server 114.114.114.114 -group china -exclude-default-group
server 114.114.115.115 -group china -exclude-default-group

# 注意：下面四行是明文 UDP 查询。在 DNS 会被污染的网络里它们同样不可靠，建议改用 server-tls，或者只保留后面的 server-https。
# SB DNS
server 185.222.222.222
server 185.184.222.222
# Cloudflare DNS
server 1.1.1.1
server 1.0.0.1

# IQDNS
server-https https://i.passcloud.xyz/dns-query
server-https https://a.passcloud.xyz/dns-query
server-https https://a.passcloud.xyz/hk
server-https https://a.passcloud.xyz/am
server-https https://a.passcloud.xyz/us
server-https https://a.passcloud.xyz/sz

# 不知道为什么，这个地址只会返回 127.0.0.0。
# 手动指定 localhost 的 IP 为 ::1
address /localhost/[::1]
```

## 配置系统 DNS
请使用任意编辑器修改 /etc/resolv.conf 文件，并写入以下内容。
```text
nameserver ::1
nameserver 127.0.0.1
options edns0 single-request-reopen
```
阻止其他程序再次修改 /etc/resolv.conf （通常是 NetworkManager）
你可以通过创建并编辑 /etc/NetworkManager/conf.d/01-dns.conf 文件，并写入以下内容来实现。
```ini
[main]
dns=none
```
或者你也可以通过`chattr +i /etc/resolv.conf`来禁止修改 /etc/resolv.conf 文件。
## 开始享用吧
通过`systemctl enable --now smartdns.service`设置开机自启并立即启动。

## 更多 DNS 推荐
 - https://blog.skk.moe/post/which-public-dns-to-use/
 - https://www.jianshu.com/p/d46d44169031


[1]: /posts/dns-over-https-on-arch/
[2]: https://www.archlinuxcn.org/archlinux-cn-repo-and-mirror/
