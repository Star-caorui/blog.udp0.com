+++
title = "如何使用 GPG-Agent Forward 在服务器上使用本地密钥"
date = 2022-02-10T01:35:00+08:00
draft = false
lastmod = 2024-12-29T09:49:16+08:00
slug = "gpg-agent-forward"
+++

*本文介绍了如何通过 GPG-Agent Forward 在服务器上使用本地密钥。*


<!--more-->


### 介绍
来自官方 Wiki 的介绍：
> GPG-Agent 是一个独立于任何协议来管理「密(私)钥」的守护进程。您可以将 Gnupg-Agent 转发到远程系统。这意味着您可以将「密(私)钥」保存在本地计算机上。（甚至是智能卡或 GNUK 上的硬件令牌）

关于 GPG-Agent Forward, 也就是「GPG 代理转发」的教程在 Google 上有很多了，甚至也有中文的教程，但我在参照这些教程后无法正常使用。所以本文来介绍下会遇到哪些坑，以及如何解决。

### 教程

1. 首先，你需要在服务器上导入你的公钥，并给予「绝对信任」(ultimately trusted).

2. 然后，你要通过 SSH 实现 Socket 转发，在 `~/.ssh/config` 内加入以下格式的内容。

```
# 注：请自行了解更多 ssh config 的使用方法，直接复制进去（全局生效）可能会引起安全隐患！
# 你也可能需要把 StreamLocalBindUnlink yes 添加到服务器的 /etc/ssh/sshd_config
StreamLocalBindUnlink yes
RemoteForward <socket_on_remote_box>  <extra_socket_on_local_box>
# 下行是我实际使用的配置，仅供参考。
RemoteForward /run/user/0/gnupg/d.zieiwd481e4xq6m8jbzj83fg/S.gpg-agent /run/user/1000/gnupg/S.gpg-agent.extra
```

<socket_on_remote_box> 可以在服务器上运行 `gpgconf --list-dir agent-socket` 查看。
<extra_socket_on_local_box> 很多教程告诉你可以通过 `gpgconf --list-dir agent-extra-socket` 查看，但在我自己尝试过程中，这个路径无效。请按照下面介绍的方法获取路径。

坑：官方 Wiki 里是这样说的：

> 对于非常老的 GnuPG 版本(< 2.1.17) ，您需要编辑 gpg-agent. conf 来配置一个额外的套接字。

但在我的实际测试里，哪怕你版本比这高，你也必须要通过在 `gpg-agent.conf` 文件内手动指定路径，然后使用这个路径。（这个路径你可以随便写，只要你的用户有权限即可。）

`extra-socket /run/user/0/gnupg/S.gpg-agent.extra`

3. 防止服务器上的 GPG-Agent 删除转发的 Socket 并设置自己的 Socket

官方 Wiki 里是这样说的：
> 如果 GPG-Agent 未运行，远程 GPG 将尝试启动它。远程 GPG-Agent 将删除转发的 Socket 并设置自己的 Socket。为了避免这种情况，可以传递 --no autostart 到远程的 GPG 命令。

可以在服务器上设置以下 alias 来持久化这个参数。（添加到你 shell 的 rc 文件里）

例如：`.bashrc` 或 `.zshrc` 等等....

```shell
alias gpg='gpg --no-autostart'
```

4. 重启本机和服务器，然后连接服务器。使用 `gpg -K` 查看私钥。如果报错了，请 `Ctrl+D` 断开连接，然后重新连接服务器。

如果还是有问题，请在 ssh 命令末尾加一个 -v 参数来诊断问题，请一定一定要确保服务器的 gpg-agent 处于关闭状态！可通过 `killall gpg-agent` 干掉服务器上的 gpg-agent。


### 参考

[GPG Wiki (英文)][1]

[K.I.S.S：GPG 与 SSH Agent 转发][2]


[1]: https://wiki.gnupg.org/AgentForwarding
[2]: https://bigeagle.me/2016/07/GPG-and-SSH-agent-forwarding/
