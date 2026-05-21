+++
title = "Markdown 语法测试"
date = 2026-05-21T13:00:00+08:00
draft = false
hidden = true
slug = "markdown-syntax-test"

[build]
render = "always"
list = "never"
+++

这是一篇隐藏测试文章，用来检查 Markdown、代码高亮、表格、图片、引用、列表和所有提示块的渲染效果。

## 标题层级

# H1 一级标题

## H2 二级标题

### H3 三级标题

#### H4 四级标题

##### H5 五级标题

###### H6 六级标题

## 段落和行内语法

这是一段普通段落。它包含 **加粗**、*斜体*、***加粗斜体***、~~删除线~~、`inline code`、普通链接 [Example](https://example.com)、自动链接 <https://example.com>，以及一个引用式链接 [Hugo][hugo]。

反斜杠转义测试：\*这段不应该变成斜体\*，\`这段不应该变成代码\`。

## 分隔线

---

## 引用

> 这是一级引用。
>
> > 这是嵌套引用。
>
> 引用里也可以包含 **加粗文本** 和 [链接](https://example.com)。

## 无序列表

- 第一项
- 第二项
  - 子项 A
  - 子项 B
- 第三项，包含 `inline code`

## 有序列表

1. 第一步
2. 第二步
   1. 子步骤一
   2. 子步骤二
3. 第三步

## 任务列表

- [x] 已完成任务
- [ ] 未完成任务
- [ ] 包含链接的任务：[Example](https://example.com)

## 定义列表

术语 A
: 这是术语 A 的解释。

术语 B
: 这是术语 B 的第一段解释。
: 这是术语 B 的第二段解释。

## 表格

| 对齐方式 | 示例 | 备注 |
| :--- | :---: | ---: |
| 左对齐 | 居中 | 右对齐 |
| **加粗** | `code` | [链接](https://example.com) |

## 代码

行内代码：`const site = "blog.udp0.com"`。

```text
纯文本代码块
保留空格、换行和符号：<>&"'
```

```bash
hugo --minify
git status --short
```

```js
const greet = (name) => {
  console.log(`Hello, ${name}`);
};

greet("Betterr");
```

## 图片

![站点图标测试](https://src.inetech.fun/favicon.webp "远程图片标题")

## 脚注

这里有一个脚注引用。[^note]

[^note]: 这是脚注内容，用来检查脚注渲染。

## 提示块：note

{{< callout type="note" title="Note 标题" >}}
这是 `note` 提示块，包含 **加粗**、链接 [Example](https://example.com) 和列表：

- note item 1
- note item 2
{{< /callout >}}

## 提示块：tip

{{< callout type="tip" title="Tip 标题" >}}
这是 `tip` 提示块。
{{< /callout >}}

## 提示块：success

{{< callout type="success" title="Success 标题" >}}
这是 `success` 提示块。
{{< /callout >}}

## 提示块：warn

{{< callout type="warn" title="Warn 标题" >}}
这是 `warn` 提示块。
{{< /callout >}}

## 提示块：caution

{{< callout type="caution" title="Caution 标题" >}}
这是 `caution` 提示块。
{{< /callout >}}

## 通用 callout

{{< callout type="note" title="通用 Callout 标题" >}}
这是通用 `callout` shortcode，通过 `type="note"` 指定类型。
{{< /callout >}}

## 默认标题提示块

{{< callout type="note" >}}
这是没有传入 `title` 的 note，用来检查默认标题。
{{< /callout >}}

[hugo]: https://gohugo.io/
