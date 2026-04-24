+++
title = "【域名邮箱】ImprovMX 一款像 CF 邮箱转发的免费服务"
date = 2024-07-31T18:43:00+08:00
draft = false
lastmod = 2024-12-30T04:46:37+08:00
slug = "improvmx"
+++

## 介绍：
ImprovMX 是一款像 Cloudflare 邮件转发的服务。ImprovMX 仅需添加 MX SPF 解析即可。无需修改 NS 记录。这个平台的 SMTP 发信是要开付费计划的，所以我们不用他的发信，我们用 Outlook 进行免费发信。

## Cloudflare 邮件转发的问题
如果要用 Cloudflare 邮件转发的话你需要把 NS 托管给 Cloudflare。
这导致以下几个问题：
- Cloudflare 不支持 GeoDNS 解析（分区解析）
- NS 在 Cloudflare 的话会导致部分 Cloudflare 服务无法自选（优选） IP。
例如 Cloudflare Page

## 教程：
首先前往 [ImprovMX 官网][1] 然后点击下面的蓝色小字：New here? Create an account
![image.png][2]
输入你要转发的域名，以及转发到哪个邮箱进行收信。并点击右面的：Create a free alias
![image.png][3]
填写一些信息，最下面有跳过。反正都不是啥重要信息我就随便填一填了。
![image.png][4]
点击屏幕中间，你的域名下面的红色字体：Email forwarding needs setup
![image.png][5]
前往你的 NS 服务商（我用 DNSPOD 做演示）准备添加三条记录。两条 MX 解析，一条 SPF 解析。可能你的 NS 服务商没有 SPF 类型，没关系，选择 TXT 类型也可以。
![image.png][6]
![image.png][7]
然后收信转发就配置好了～
![image.png][8]

## 使用 Outlook 别名进行发信
{{% warn title="注意事项" %}}
此功能可能需要修改你的微软账号主要邮箱。
{{% /warn %}}

访问 [管理你登录 Microsoft 的方式][9] 添加你要发信的电子邮箱
![image.png][10]
到你的邮箱里找到验证邮件，通过一下验证。
![image.png][11]
配置 SPF 让你的邮件变得可信。不然就进垃圾桶了（x
修改前面添加的 SPF 记录。修补添加 `include:spf.protection.outlook.com` 字段以验证 outlook 发信。
以下是一份配置示例：
  ```
  原先的 SPF 记录：v=spf1 include:spf.improvmx.com ~all
  改好后 SPF 记录：v=spf1 include:spf.improvmx.com include:spf.protection.outlook.com ~all
  ```
此时你就可以从 [Outlook][12] 发信了。

{{% tip title="补充说明" %}}
Outlook 可以自定义发件地址，不过需要先完成验证；前面添加别名时已经做过这一步了。
{{% /tip %}}

![image.png][13]


[1]: https://app.improvmx.com
[2]: /uploads/2024/123022.png
[3]: /uploads/2024/123030.png
[4]: /uploads/2024/123074.png
[5]: /uploads/2024/123079.png
[6]: /uploads/2024/123016.png
[7]: /uploads/2024/123001.png
[8]: /uploads/2024/123048.png
[9]: https://account.live.com/names/manage
[10]: /uploads/2024/123053.png
[11]: /uploads/2024/123039.png
[12]: https://outlook.live.com/
[13]: /uploads/2024/123065.png
