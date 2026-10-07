# iNetech Blog

[blog.udp0.com](https://blog.udp0.com/) 的源码。一个不依赖第三方主题、不含任何前端脚本的极简 Hugo 博客。

## 这份文档只写代码说不了的事

站点怎么配、页面怎么渲染，以代码为准，这里不复述。想知道具体行为，从这几处看起：

- 提示块的写法和输出：`layouts/_markup/render-blockquote.html`。
- 图片怎么处理：`layouts/_markup/render-image.html`。
- 历史评论的字段和展示：`data/comments.json` 和 `layouts/all.html`。
- 各种 Markdown 元素渲染出来的样子：隐藏的测试页 `content/posts/markdown-syntax-test.md`，线上地址是 `/posts/markdown-syntax-test/`。

## 线上构建

- 同一个仓库部署在两处：EdgeOne Pages 和 Cloudflare Pages（`blog-udp0-com.pages.dev`）。推送到 `main` 后两边都会自动重新构建。
- 两边的 Hugo 版本都不在仓库里，是在各自控制台用环境变量 `HUGO_VERSION` 指定的，改了之后要等下一次部署才生效。没设时 EdgeOne 用预装的 0.147.5，Cloudflare 用构建镜像自带的 0.147.7。
- 本机的 Hugo 和线上不一定是同一个版本。升级本机或改了控制台里的版本后，推送完要看一眼线上实际产出的页面。
- 模板用了 `all.html`（0.146 起才有）和 `hugo.Data`（0.156 起才有），所以两边的 `HUGO_VERSION` 都不能低于 0.156。把这个变量删掉的话，平台会退回自带的 0.147，构建会失败。
- `static/_headers` 只对 Cloudflare Pages 生效，给文件名带哈希的文件设一年缓存。EdgeOne 对这类文件自动这样做，不用配置；它会把 `_headers` 当成普通文件发布出去。

## 样式表的压缩

`assets/css/styles.css` 不经过 Hugo 的压缩器，由 `layouts/baseof.html` 里的几条正则去掉空白。这样产出不受 Hugo 版本影响：0.157 之前的压缩器不认识 CSS 嵌套，之后的版本遇到以 `:` 开头的嵌套规则也会放弃压缩它后面的内容。

正则只认识空白和标点，所以：

- 不要在字符串字面量里写 `, `、`: `、分号或花括号，它们会被当成样式语法改掉。
- 注释不会被去掉，会出现在线上的文件里。

## 写文章时的约定

- 正文标题从二级开始，不跳级。页面标题已经占了一级。
- 发布前给文章写上 `slug`。文章地址和历史评论都靠它对应，改了 `slug`，旧地址和这篇的评论都会断。
- 本地图片放在文章自己的目录里，用 Markdown 图片语法引用。`hugo.yaml` 关掉了页面资源的默认发布，只有经过图片渲染钩子的文件才会出现在线上。放在文章目录里、只用普通链接指向的附件不会被发布。

## 历史评论

站点没有在线评论功能。`data/comments.json` 是从 Typecho 迁移来的旧评论，只读展示。
