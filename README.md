# iNetech Blog

[blog.udp0.com](https://blog.udp0.com/) 的源码。一个不依赖第三方主题、不含任何前端脚本的极简 Hugo（v0.167.0）博客。

## 写文章

- 正文标题从二级开始，不跳级。页面标题已经占了一级。
- 发布前写上 `slug`。文章地址和历史评论都靠它对应，改了 `slug`，旧地址和这篇的评论都会断。
- 本地图片放在文章自己的目录里，用 Markdown 图片语法引用。文章目录里只有这样引用的文件才会发布，用普通链接指向的附件不会。
- 提示块等各种写法和渲染效果，看隐藏的测试页 `content/posts/markdown-syntax-test.md`，线上地址是 `/posts/markdown-syntax-test/`。

## 历史评论

站点没有在线评论功能。`data/comments.json` 是从 Typecho 迁移来的旧评论，只读展示。
