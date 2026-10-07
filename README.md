# iNetech Blog

[blog.udp0.com](https://blog.udp0.com/) 的源码。一个不依赖第三方主题、不含任何前端脚本的极简 Hugo 博客。

## 这份文档只写代码说不了的事

站点怎么配、页面怎么渲染，以代码为准，这里不复述。想知道具体行为，从这几处看起：

- 提示块的写法和输出：`layouts/_default/_markup/render-blockquote.html`。
- 图片怎么处理：`layouts/_default/_markup/render-image.html`。
- 历史评论的字段和展示：`data/comments.json` 和 `layouts/_default/single.html`。
- 各种 Markdown 元素渲染出来的样子：隐藏的测试页 `content/posts/markdown-syntax-test.md`，线上地址是 `/posts/markdown-syntax-test/`。

## 线上构建

- 推送到 `main` 后线上会自动重新构建，一分钟左右生效。构建配置不在这个仓库里。
- 线上用的 Hugo 比较旧。模板和配置只用老版本就有的写法。用新版 Hugo 构建时那条 `.Site.Data` 的弃用警告是有意留着的，不要改成 `hugo.Data`。
- 旧版本没法在本机跑。改了模板、配置或样式，推送后要看一眼线上实际产出的页面和 CSS。

## 样式表的两条禁令

线上的旧压缩器不认识 CSS 嵌套，`assets/css/styles.css` 里的嵌套块在线上基本是原样输出的。它还会把一部分嵌套选择器当成“属性: 值”来处理，删掉冒号两边的空格。下面两条是对比线上产出总结出来的：

- 每个带嵌套的块，第一条嵌套规则的选择器里不要有冒号。`.callout` 里先写 `>strong`、后写 `>:is(strong, summary)`，就是这个原因。
- 不要写 `& :is(...)` 这种“空格加伪类”的选择器。线上可能被改成 `&:is(...)`，意思就变了。

新版 Hugo 的压缩器正好相反：嵌套规则以 `:` 开头时，那一块剩下的部分不会被压缩。所以选择器列表逐行写，行内代码用 `code:not(pre *)`。

## 写文章时的约定

- 发布前给文章写上 `slug`。文章地址和历史评论都靠它对应，改了 `slug`，旧地址和这篇的评论都会断。
- 本地图片放在文章自己的目录里，用 Markdown 图片语法引用。`hugo.yaml` 关掉了页面资源的默认发布，只有经过图片渲染钩子的文件才会出现在线上。放在文章目录里、只用普通链接指向的附件不会被发布。

## 历史评论

站点没有在线评论功能。`data/comments.json` 是从 Typecho 迁移来的旧评论，只读展示。

## 还没验证的事

- 线上 Hugo 的具体版本。
- 线上 RSS 里留言页那条摘要少一个结尾的 `</blockquote>`，本机构建没有这个问题。推测是旧版本截摘要的位置不同，没有证实。
