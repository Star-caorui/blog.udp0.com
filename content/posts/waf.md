+++
title = "在 2025 年如何有效阻止恶意爬虫与扫描器"
description = "介绍如何组合 Caddy、Anubis 与雷池 WAF，构建多层恶意爬虫与扫描防御体系。"
date = 2025-05-04T17:22:00+08:00
lastmod = 2025-05-04T18:14:16+08:00
slug = "waf"
+++

*爬虫和扫描器越来越多，单靠一个 WAF 有点顶不住了。于是我把 Caddy、Anubis 和雷池 WAF 串了起来，这篇文章记录一下我是怎么搭的。*

<!--more-->

## 前言
2025 年了，服务器日志里的爬虫和扫描越来越猖狂。一边是 AI 需要海量数据，到处抓内容；另一边是自动化的安全扫描，从来没停过。对站长来说，就是服务器压力变大、访问变慢，安全风险也实实在在摆在眼前。

光靠传统的防火墙或者单个 WAF，感觉越来越力不从心了，于是我折腾出了下面这套多层过滤的办法。

> [!NOTE] 阅读提醒
> - 这只是我根据自己网站的情况摸索出来的方案，仅供参考。
> - 本文只讲思路和最前面那层 Caddy 的配置。Anubis 和雷池的安装请看它们各自的官方文档。

## 思路
思路很简单：一层挡不住就多套几层，每层只干自己擅长的事。说得正式一点，这叫纵深防御。

```text
互联网 -> Caddy（HTTPS） -> Anubis（工作量证明） -> 雷池 WAF（语义分析） -> 业务 Caddy -> 后端应用
```

- Caddy：负责 HTTPS，证书全自动。
- Anubis：挡“量”。用工作量证明拦掉大部分无脑爬虫和低级扫描。
- 雷池 WAF：挡“质”。识别 SQL 注入、XSS 这类有针对性的攻击。
- 业务 Caddy：把剩下的流量转给真正的应用。

为什么要叠两层 WAF 呢？

- Anubis 在前面挡掉了大量无效流量，雷池要处理的请求少了很多，压力小了，判断也更准。
- 就算有人愿意花算力过了 Anubis，后面还有雷池等着。

## 第一层：Caddy
最前面的 Caddy 只干一件事：接收所有外部流量并处理 HTTPS，然后把解密后的 HTTP 流量反向代理给 Anubis。后面几层之间都走 HTTP，它们就不用再管证书了。

选 [Caddy][1] 是因为它的 HTTPS 是全自动的，会自己申请和续期证书。配上 DNS 验证还能自动签通配符证书，省掉了以前维护证书的麻烦。

下面是我的 Caddyfile。它给 `inetech.fun` 和所有子域名申请 ZeroSSL 的通配符证书（通过腾讯云 DNSPod 做 DNS 验证），然后反向代理到跑在 `10.0.8.11:8923` 的 Anubis。

```caddyfile
# 关闭管理 API
{
        admin off
}

inetech.fun, *.inetech.fun {
        tls {
                # 使用 DNS 验证，密钥从环境变量读取
                dns tencentcloud {
                        secret_id {$TENCENT_SECRET_ID}
                        secret_key {$TENCENT_SECRET_KEY}
                }
                # 只允许 TLS 1.3
                protocols tls1.3
                # 使用 ZeroSSL 签发证书
                ca https://acme.zerossl.com/v2/DV90
                # ZeroSSL 需要的 EAB 凭据
                eab {$ACME_EAB_ID} {$ACME_EAB_KEY}
        }

        # 启用压缩
        encode zstd gzip

        header {
                # 去掉 Server 和 X-Powered-By 头
                -Server
                -X-Powered-By
                # 可选：HSTS，有效期一年
                Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        }

        # 注意这里是 http://，Caddy 解密后以 HTTP 转发给 Anubis
        handle {
                reverse_proxy http://10.0.8.11:8923
        }
}
```

> [!TIP] 使用前
> - 把 `inetech.fun` 和 `reverse_proxy` 的地址换成你自己的。
> - 密钥是从环境变量读的，运行 Caddy 前要先设置好。
> - `dns tencentcloud` 需要给 Caddy 装上 [caddy-dns/tencentcloud][2] 插件。用别的 DNS 服务商就装对应的插件。

## 第二层：Anubis
Anubis 的绝活是工作量证明（Proof-of-Work）。它会给来访的客户端布置一点计算任务，算完才放行。

- 普通用户用浏览器访问，这点计算几乎感觉不到。算完之后浏览器会拿到一个在有效期内免验证的凭证，所以正常访问只需要算一次。
- 那些不执行脚本、不保存凭证，或者不断换身份的抓取程序就难受了：要么过不了，要么每换一次身份就得重新算一遍，成本很高。

> [!WARNING] 别一刀切
> 记得给搜索引擎（比如 Googlebot、Bingbot）和必要的 API 接口加白名单（按 User-Agent 或者 URL 路径），让它们跳过检查。

Anubis 的上游填雷池 WAF 的地址。安装和配置请看 [Anubis 安装指南][3]。

## 第三层：雷池 WAF
到这里的流量已经被 Anubis 筛过一遍，少了很多噪音。雷池（长亭科技出品，我用的是社区版）负责对付更“聪明”的攻击：

- 语义分析：不只是匹配关键词，而是分析请求到底想干什么，能识别 SQL 注入、XSS 这类藏得更深的攻击。
- 风险 IP 拦截：内置风险 IP 库，直接拒绝已知的肉鸡和恶意代理。
- 自定义规则：可以按自己的业务加更细的规则。

雷池有自己的 Web 管理界面。在里面添加站点：监听的端口交给前面的 Anubis 来转发，上游服务器地址指向业务 Caddy（或者直接指向应用）。防护策略、日志、IP 黑白名单也都在这个界面里。

安装请看 [雷池 WAF 社区版安装指南][4]。

## 第四层：业务 Caddy
最后这层没什么花样：监听一个内部端口，然后 `reverse_proxy` 到后端应用。换成 Nginx 也行。

之所以单独拆一层，是想把“安全”和“业务路由”分开，配置看着清楚，改起来也方便。

## 最后
从我自己用下来的效果看，这套组合在拦截恶意流量和节省服务器资源上，比单用一个 WAF 好不少。

当然，你需要根据自己的流量、业务和预算来调整工具和配置。但多套几层、每层用不同的机制，这个思路是通用的。


[1]: https://caddyserver.com/docs/
[2]: https://github.com/caddy-dns/tencentcloud
[3]: https://anubis.techaro.lol/docs/admin/installation
[4]: https://docs.waf-ce.chaitin.cn/zh/上手指南/安装雷池
