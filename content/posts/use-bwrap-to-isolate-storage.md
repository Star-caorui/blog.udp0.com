+++
title = "使用 bwrap 让你的程序不在 $HOME 乱拉屎"
date = 2022-02-26T20:50:00+08:00
draft = false
lastmod = 2022-02-27T11:26:45+08:00
slug = "use-bwrap-to-isolate-storage"
[build]
list = 'never'
render = 'always'
+++

*本文讲述了如何让你的 Linux 像在 Android 使用 “存储空间隔离“ 这款软件一样隔离软件的文件存储，防止乱拉屎。*
<!--more-->

### 前言
- 你是不是因为家目录下一堆文件/文件夹而感到强迫症？
- 你是不是想要像在 Android 使用 “存储空间隔离“ 这款软件一样隔离软件的文件存储？
- 本文可以解决这些问题，你可以放心的往下看了。

### 第一步：在你的自启动脚本中加入一个隔离存储空间的函数
我们要加到你
```bash

```

### 第二步：修改并使用这个函数，添加你所想要 “共享的文件夹” 从实际路径到隔离后路径

### 第三步：添加所有你想要隔离的应用吧

### 最后说明
这样我们就可以隔离一些爱乱拉屎的软件的存储空间了，以下是我在查阅相关资料时的资料地址。
- [使用 bwrap 沙盒][1] by [依云's Blog][2]
- [Bubblewrap][3] by [Arch Wiki][4]
- [man 帮助文档][5]


[1]: https://blog.lilydjwg.me/2021/8/12/using-bwrap.215869.html
[2]: https://blog.lilydjwg.me/
[3]: https://wiki.archlinux.org/title/Bubblewrap#Configuration
[4]: https://wiki.archlinux.org/
[5]: https://man.archlinux.org/man/bwrap.1
