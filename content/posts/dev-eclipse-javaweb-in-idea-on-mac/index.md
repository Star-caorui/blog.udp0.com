+++
title = "【流水账】在 macOS 安装 IDEA 来开发 Eclipse 的 JavaWeb 项目"
description = "记录在 macOS 上用 IDEA Ultimate 接手 Eclipse JavaWeb 项目的导入与 Tomcat 配置过程。"
date = 2025-10-29T21:37:00+08:00
lastmod = 2025-10-29T23:18:53+08:00
slug = "dev-eclipse-javaweb-in-idea-on-mac"
+++

在开始之前，首先要说明的是你需要使用 IDEA Ultimate。IDEA 社区版我这边折腾半天没成功。
先安装 IDEA Ultimate 和 Tomcat 8.5。我的同学说 Tomcat 9 也可以，但是我为了保险起见还是与机房版本保持一致了。

通过 brew 安装 JetBrains Toolbox (我个人喜欢用 Toolbox 安装 IDEA)和 Tomcat 8.5。如果你还没有安装 brew，[请先安装 brew][1]。
```bash
brew install jetbrains-toolbox
# brew install intellij-idea
# 注：Homebrew 后来移除了 tomcat@8。现在可以改装 tomcat@9，或者到 Apache 官网下载 8.5。
brew install tomcat@9
```

启动 IDEA 并激活为 Ultimate 版，此时会自动安装 Tomcat 的插件。

 1. 导入项目。文件-新建-现有源中的项目。
 ![导入现有项目][2]
 2. 从外部导入选择 Eclipse
![选择从 Eclipse 导入][3]
 3. 下一步下一步下一步，是。无脑下一步就好。
 4. 自动检测 Web 框架，自动配置。
![检测到 Web 框架][4]
![启用 Web 配置][5]
 5. 照着图配置 Tomcat。路径选对哈（注意，此处需要 IDEA Ultimate 的插件）
![添加 Tomcat 服务器][6]
![选择 Tomcat 的安装路径][7]
![配置 Tomcat 部署][8]
![编辑运行配置][9]
![选择要部署的工件][10]
 6. 补全依赖就好了
![添加项目依赖][11]
![依赖补全完成][12]
 


[1]: https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/
[2]: images/step-01-import-existing-project.webp
[3]: images/step-02-import-from-eclipse.webp
[4]: images/step-03-detect-web-framework.webp
[5]: images/step-04-enable-web-facet.webp
[6]: images/step-05-add-tomcat-server.webp
[7]: images/step-06-select-tomcat-installation.webp
[8]: images/step-07-configure-tomcat-deployment.webp
[9]: images/step-08-edit-run-configuration.webp
[10]: images/step-09-choose-artifact-deployment.webp
[11]: images/step-10-add-project-dependencies.webp
[12]: images/step-11-dependencies-resolved.webp
