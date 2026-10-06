# iNetech Blog

[blog.udp0.com](https://blog.udp0.com/) 的源码。一个不依赖第三方主题、不含任何前端脚本的极简 Hugo 博客。

## 本地开发

先安装 Hugo（不低于 v0.144，配置里用到了 `:slugorcontentbasename`），然后运行：

```bash
hugo server -D
```

默认访问地址：

```text
http://localhost:1313/
```

构建静态文件到 `public/`：

```bash
hugo --minify
```

## 目录结构

```text
hugo.yaml                 站点配置、菜单、备案号
assets/css/styles.css     全站唯一的样式表
layouts/                  模板与 Markdown 渲染钩子
content/posts/            文章
content/*.md              独立页面（关于我、朋友、留言、服务等）
data/comments.json        从 Typecho 迁移来的历史评论
```

## 新建文章

```bash
hugo new posts/my-first-post.md
```

文章统一使用 TOML front matter，并显式写上 `slug`：

```toml
+++
title = "文章标题"
description = "一句话摘要，会用作页面的 meta description。"
date = 2026-01-01T12:00:00+08:00
draft = false
slug = "my-first-post"
+++
```

- `slug` 决定文章地址 `/posts/<slug>/`，不写时退回文件名，所以中文文件名一定要补上。
- 带图片的文章用目录形式：`content/posts/<slug>/index.md`，图片放在同目录的 `images/` 下并用相对路径引用，构建时会自动加上内容哈希、宽高和懒加载。
- 不想出现在首页和 RSS 里的页面，在 front matter 加上：

  ```toml
  [build]
  list = 'never'
  render = 'always'
  ```

## 提示块语法

提示块使用 Markdown 的 Callout 写法，支持 `NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION`：

```md
> [!TIP] 一个小技巧
> 这里可以写建议、捷径或经验。

> [!NOTE]
> 不写标题时，会用类型名作为默认标题。
```

类型后面加 `+` 或 `-` 会变成可折叠的提示块：

```md
> [!TIP]+ 默认展开
> 任意 Markdown 内容都可以放进来。

> [!WARNING]- 默认折叠
> 这里适合放可能踩坑的提醒。
```

完整的渲染效果见隐藏的测试页 [`/posts/markdown-syntax-test/`](content/posts/markdown-syntax-test.md)。

## 历史评论

站点没有在线评论功能，`data/comments.json` 里的评论只读展示在对应页面底部。数据以页面的 `slug` 为键：

```json
{
  "my-first-post": [
    {
      "id": 1,
      "date": "2020-04-11T18:07:58+08:00",
      "author": "昵称",
      "url": "https://example.com",
      "text": "纯文本内容",
      "parent": 0,
      "reply_to": ""
    }
  ]
}
```

- `parent` 为 `0` 表示顶层评论，否则填被回复评论的 `id`，`reply_to` 填被回复者的昵称。
- 需要保留格式时可以额外提供 `html` 字段，它会优先于 `text` 原样输出。

## 常改的地方

- `hugo.yaml` 里的 `title`、`baseURL`、`params.description`
- `hugo.yaml` 里的 `menus.main`（顶部导航）
- `hugo.yaml` 里的 `params.records`（`icp` 为 ICP 备案号，`police` 为公安备案号，留空则不显示）
- `layouts/_default/baseof.html` 页脚里的版权年份
