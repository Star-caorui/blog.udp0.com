+++
title = "更改 Typecho 的 头像源"
date = 2021-01-29T20:29:00+08:00
draft = false
lastmod = 2022-06-16T00:54:30+08:00
slug = "typecho-change-gra"
+++

*本文介绍了如何修改 Typecho 的 Gravatar 头像源*
<!--more-->

### 前言
我在使用 Typecho 博客程序时发现，头像经常加载不出来，这是 Gravatar 官方服务器在国内访问不好的原因。

### 解决方法
我们可以在 Typecho 的配置文件 `config.inc.php` 里加入下面一行代码即可修改默认使用的头像服务器。
```php
/** 自定义头像源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://sdn.geekzu.org/avatar/');
```

### 更多的头像源
```php
/** 官方源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://www.gravatar.com/avatar/');
/** 官方CN源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://cn.gravatar.com/avatar/');
/** 官方en源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://en.gravatar.com/avatar/');
/** 官方secure源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://secure.gravatar.com/avatar/');
/** v2ex源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://cdn.v2ex.com/gravatar/');
/** Loli源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://gravatar.loli.net/avatar/');
/** 极客族源 */
define('__TYPECHO_GRAVATAR_PREFIX__', 'https://sdn.geekzu.org/avatar/');
```
