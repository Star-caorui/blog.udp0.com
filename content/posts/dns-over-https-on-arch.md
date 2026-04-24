+++
title = "在 Arch Linux 使用 DOH 来加密你的 DNS"
date = 2021-12-13T06:38:00+08:00
draft = false
lastmod = 2024-12-29T09:44:35+08:00
slug = "dns-over-https-on-arch"
+++

{{% note title="背景" %}}
我最近被 DNS 劫持、DNS 污染搞得有些烦躁。GitHub、Google Translate、V2EX 都无法正常访问，于是开始研究如何在 Arch Linux 使用 DOH。（DOH 即 DNS over HTTPS。）
{{% /note %}}

{{% tip title="补充说明" %}}
我尝试过使用 `systemd-resolve` 的 DOT，但始终没跑通，最后才换成 DOH。
{{% /tip %}}


<!--more-->


### 阅读提醒
{{% note title="阅读提醒" %}}
- 本文基于 Arch Linux 编写，如果您使用其他发行版，部分操作可能不一致。
- 本文对其他同样使用 systemd 的发行版也可能有参考价值。
- 使用 DOH 后，解析速度可能会下降，这是正常现象。因为无论什么 DNS，一般都不如 ISP 自带 DNS 更快，只是运营商的结果可能存在劫持或污染。
{{% /note %}}

### 介绍
目前部分地区的 ISP 可能会拦截所有来自 UDP 53 的 DNS 请求。从而劫持，污染，投毒所有 DNS 查询结果。所以这就是为什么要用 DOH 的原因了。

### 安装
```shell
pacman -S dns-over-https
```
（其他非 Arch，及其衍生发行版的用户请自行使用您所使用的包管理器安装）

### 配置
#### 配置解析顺序
请使用任意编辑器修改 /etc/nsswitch.conf 文件。系统在解析未知的地址时会从左到右匹配。
```
...
hosts: myhostname mymachines files dns
...
```
myhostname 匹配 此设备的名称（/etc/hostname）
mymachines 匹配 本地容器的名称
mdns_minimal 匹配 multicast DNS（请自行了解使用）
files 匹配 hosts 文件（/etc/hosts）
resolve 匹配 systemd-resolve
dns 匹配从 /etc/resolv.conf 进行的 dns 查询

#### 配置 DOH 客户端
请使用任意编辑器修改 /etc/dns-over-https/doh-client.conf 文件。
```
# DNS 监听端口的配置
listen = [
    "127.0.0.1:53",
    "[::1]:53",

    ## 如果要监听 0.0.0.0:53 和 [::]:53 请使用取消注释下行配置。
    # ":53",
]

# 上游解析器的配置
[upstream]

# DOH 选择器: random（随机，会忽略下文的 weight）weighted_round_robin（加权轮询）或者 lvs_weighted_round_robin（lvs加权轮询）
upstream_selector = "weighted_round_robin"

# 在这里添加 DOH 地址。可添加多个地址，设置不同权重等...
# 简单的示例：

# IQDNS（https://iqdns.xyz/all.html）
[[upstream.upstream_ietf]]
    url = "https://i.passcloud.xyz/dns-query"
    weight = 50

# DNSPod Public DNS（https://www.dnspod.cn/Products/Public.DNS）
[[upstream.upstream_ietf]]
    url = "https://doh.pub/dns-query"
    weight = 50

# 上游 DNS 服务器，仅用于解析 doh 以及下文的忽略地址。
[others]
bootstrap = [
    "8.8.8.8:53",
    "8.8.4.4:53",
]

# 忽略地址，下列域名将会直接使用上面的上游 DNS 服务器而非 DOH 来发起请求。
passthrough = [
    "captive.apple.com",
    "connectivitycheck.gstatic.com",
    "detectportal.firefox.com",
    "msftconnecttest.com",
    "nmcheck.gnome.org",

    "pool.ntp.org",
    "time.apple.com",
    "time.asia.apple.com",
    "time.euro.apple.com",
    "time.nist.gov",
    "time.windows.com",
]

# 上游超时时间
timeout = 30

no_cookies = true
no_ecs = false
no_ipv6 = false
no_user_agent = false
verbose = true
insecure_tls_skip_verify = false
```

### 配置系统 DNS
请使用任意编辑器修改 /etc/resolv.conf 文件，并写入以下内容。
```
nameserver ::1
nameserver 127.0.0.1
options edns0 single-request-reopen
```
阻止其他程序再次修改 /etc/resolv.conf （通常是在说 NetworkManager）
你可以通过创建并编辑 /etc/NetworkManager/conf.d/01-dns.conf 文件，并写入以下内容来实现。
```
[main]
dns=none
```
或者你也可以通过`chattr +i /etc/resolv.conf`来禁止修改 /etc/resolv.conf 文件。
### 开始享用吧
通过`systemctl enable --now doh-client.service`设置开机自启并立即启动。

### 更多 DNS 推荐
 - https://blog.skk.moe/post/which-public-dns-to-use/
 - https://www.jianshu.com/p/d46d44169031
