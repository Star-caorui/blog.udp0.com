+++
title = "【流水账】在 macOS 安装 IDEA 来开发 Eclipse 的 JavaWeb 项目"
date = 2025-10-29T21:37:00+08:00
draft = false
lastmod = 2025-10-29T23:18:53+08:00
slug = "dev-eclipse-javaweb-in-idea-on-mac"
+++

在开始之前，首先说明的是你需要使用 IDEA Ultimate。IDEA 社区版我这边折腾半天没成功。
先安装 IDEA Ultimate 和 Tomcat8.5。 我的同学说 Tomcat9 也可以，但是我为了保险起见还是与机房版本保持一致了。

通过 brew 安装 Jetbrains Toolbox (我个人喜欢用 Toolbox 安装 IDEA)和 Tomcat 8.5。如果你还没有安装 brew，[请先安装 brew][1]。
```
brew install jetbran-toolbox
# brew install intellij-idea
brew install tomcat@8
```

启动 IDEA 并激活为 Ultimate 版，此时会自动安装 Tomcat 的插件。

 1. 导入项目。文件-新建-现有源中的项目。
 ![image.png][2]
 2. 从外部导入选择 Eclipse
![image.png][3]
 3. 下一步下一步下一步，是。无脑下一步就好。
 4. 自动检测 Web 框架，自动配置。
![image.png][4]
![image.png][5]
 5. 照着图配置 Tomcat。路径选对哈（注意，此处需要 IDEA Ultimate 的插件）
![image.png][6]
![image.png][7]
![image.png][8]
![image.png][9]
![image.png][10]
 6. 补全依赖就好了
![image.png][11]
![image.png][12]
 


[1]: https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/
[2]: /uploads/2025/102912.png
[3]: /uploads/2025/102931.png
[4]: /uploads/2025/102942.png
[5]: /uploads/2025/102928.png
[6]: /uploads/2025/102970.png
[7]: /uploads/2025/102956.png
[8]: /uploads/2025/102933.png
[9]: /uploads/2025/102999.png
[10]: /uploads/2025/102908.png
[11]: /uploads/2025/102907.png
[12]: /uploads/2025/102919.png
