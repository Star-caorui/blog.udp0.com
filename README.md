# Hugo Blog

一个不依赖第三方主题的极简 Hugo 博客骨架，风格偏向个人写作站点。

## 本地开发

先安装 Hugo Extended，然后运行：

```bash
hugo server -D
```

默认访问地址：

```text
http://localhost:1313/
```

## 新建文章

```bash
hugo new posts/my-first-post.md
```

把生成文件里的 `draft = true` 改成 `false` 即可发布。

## 提示块语法

支持几种提示块短代码：

```md
{{% tip title="一个小技巧" %}}
这里可以写建议、捷径或经验。
{{% /tip %}}

{{% note %}}
这里适合放补充说明。
{{% /note %}}

{{% success title="已完成" %}}
这里适合放结果确认。
{{% /success %}}

{{% warn title="注意" %}}
这里适合放可能踩坑的提醒。
{{% /warn %}}

{{% caution title="危险操作" %}}
这里适合放高风险提示。
{{% /caution %}}
```

也支持通用写法：

```md
{{% callout type="warn" title="注意" %}}
任意 Markdown 内容都可以放进来。
{{% /callout %}}
```

## 需要改的地方

- `hugo.toml` 里的 `title`
- `hugo.toml` 里的 `baseURL`
- `content/about.md`
- 示例文章 `content/posts/hello-hugo.md`

## 部署到 GitHub Pages

仓库已经附带 `.github/workflows/hugo.yml`。

你只需要：

1. 把仓库推到 GitHub
2. 在仓库设置里打开 `Settings -> Pages`
3. 将 `Build and deployment` 的来源设为 `GitHub Actions`
4. push 到 `main` 分支

之后 Actions 会自动构建并发布到 GitHub Pages。
