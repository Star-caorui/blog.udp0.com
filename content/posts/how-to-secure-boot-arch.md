+++
title = "如何安全启动 Arch Linux"
date = 2021-10-17T21:33:00+08:00
draft = false
lastmod = 2022-06-16T00:59:08+08:00
slug = "how-to-secure-boot-arch"
+++

### 前言
安全启动是可以保护你的引导程序不受篡改的一项技术。它的原理是给引导程序签名，让你的计算机信任这个签名，并仅允许启动有可信签名的引导程序。一旦有人恶意往引导程序注入些东西时，由于签名被破坏，计算机就出于安全目的停止启动了。

#### 阅读提醒
{{% note title="阅读提醒" %}}
- 安全启动需要主板支持 UEFI。
- 安全启动在启用了**全盘加密**后才更有实际意义。
- 它主要适用于 ESP 所在硬盘可能被物理接触并篡改的场景。
- 在 Arch Linux 上启用安全启动，本身就是一件比较折腾的事。
{{% /note %}}

### 实现安全启动的几种方法（理论+原理）
- 使用你自己的密钥（需主板支持）
- 使用由微软签名的预引导程序，然后由这个预引导程序来信任你的引导程序/内核，并完成安全启动。

首先，“使用你自己的密钥” 这种方法是将证书写到主板里，就和主板预装的微软证书一样，预装你的证书。缺点是只有新主板支持这个特性。

然后 “使用由微软签名的预引导程序” 这种方法是先安全启动一个由微软签名过的预引导程序再由这个预引导程序引导经过签名验证或哈希校验的引导程序。

目前在 Linux，有两个 “使用由微软签名的预引导程序” 可以使用。一个是 Preload，另一个是 Shim。这俩个预引导程序的区别是该如何信任下一环的引导程序。Preload 和 Shim 都可以分别通过哈希校验信任不同的引导程序/内核（通过哈希校验实现防篡改），但这样做的坏处是每次更新引导程序/内核时，都需要重新向 efivar 写入哈希校验。

Shim 可以信任一个公钥证书（在信任公钥证书时 Shim 会向 efivar 写入 <abbr title="Machine Owner Key ">MOK</abbr>），这样所有被这个私钥证书签名过的引导程序/内核也就获得了信任，并可以安全启动它们了。这样做的好处是每次更新引导程序/内核时，你只需要重新签名引导程序/内核即可。无需再向 efivar 写入些什么。你可以通过包管理器的钩子实现在每次更新引导程序/内核时自动签名它们。

{{% tip title="推荐方案" %}}
我个人更推荐使用 Shim 实现安全启动。这样在更换设备后，只需要重新导入公钥证书，就能比较方便地再次启用安全启动。
{{% /tip %}}

##### 我为什么不推荐使用 “使用你自己的密钥” 这种方法呢？
- 这可能会有兼容性问题（我使用的是 Arch To Go，在其他电脑可能无法正常工作），部分主板的安全启动不支持使用你自己的密钥。
- 通过 “使用你自己的密钥” 来实现安全启动配置较为复杂。详见 Arch Wiki [Using_your_own_keys][1]. 本文在此处不做过多介绍。

##### 我为什么不推荐使用 Preload 这种方法呢？ 
- Preload 更新引导程序/内核后需要重新向 efivar 写入哈希校验。这可能会损害固件。

### 在 Arch Linux 上启用安全启动（教程）
- 确保你的电脑支持 UEFI 安全启动，并已经使用 UEFI 启动系统。
- 在配置完成之前，请确保你的安全启动是处于关闭状态，以保证可以正常进入系统配置安全启动。

#### 在开始之前，请先确保你使用的是 root 并处于 /etc/efi-keys/ 文件夹中
```bash
# 通过 root 密码提权到 root
su
# 通过 sudo 提权到 root
sudo su
# 通过 pkexec 提权到 root
pkexec

# 前往 /etc/efi-keys/ 目录
cd /etc/efi-keys/
```

#### 创建一对证书，用来签名并信任引导程序/内核。
```bash
openssl req -new -x509 -sha256 -newkey rsa:4096 -nodes -days 28565 -subj "/CN=Machine Owner Key/" -keyout /etc/efi-keys/MOK.key  -out /etc/efi-keys/MOK.crt
openssl x509 -outform DER -in /etc/efi-keys/MOK.crt -out /etc/efi-keys/MOK.cer
```

#### 安装 shim 到你的 esp 分区。
```bash
# 温馨提示：开头带有 # 的为注释行，可不复制。复制了也不影响。
# 请把下行的 /boot 改为你实际 esp 分区所挂载的路径。
ESP=/boot
# 由于 shim 只会引导 grubx64.efi，所以在此处把你的引导程序改名为 grubx64.efi。
sudo mv ${ESP}/EFI/BOOT/BOOTX64.EFI ${ESP}/EFI/BOOT/grubx64.efi
# 使用 shim 预引导程序作为你 UEFI 启动项的默认引导程序。
sudo cp /usr/share/shim-signed/shimx64.efi ${ESP}/EFI/BOOT/BOOTx64.EFI
sudo cp /usr/share/shim-signed/mmx64.efi ${ESP}/EFI/BOOT/
```
#### 签名你的引导程序以及内核
```bash
# 温馨提示：请检查你是否使用 linux 内核，如果你用的是其他内核请更改下行命令的 vmlinuz-linux
# 修改示例：使用 linux-zen 内核，将下文的两处 /boot/vmlinuz-linux 修改为 /boot/vmlinuz-linux-zen
sudo sbsign --key /etc/efi-keys/MOK.key --cert /etc/efi-keys/MOK.crt --output /boot/vmlinuz-linux /boot/vmlinuz-linux
sudo sbsign --key /etc/efi-keys/MOK.key --cert /etc/efi-keys/MOK.crt --output ${ESP}/EFI/BOOT/grubx64.efi ${ESP}/EFI/BOOT/grubx64.efi
```

### 将公钥证书临时放到 ESP 分区里面。
因为一会要去 shim 导入公钥证书，所以就临时放 ESP 分区了。
```bash
sudo cp /etc/efi-keys/MOK.cer ${ESP}/
```

### 重启并启用安全启动
```bash
# 可以通过下行命令快速重启到固件设置。
systemctl reboot --firmware
```

### 导入并信任证书
此时，你在启动后就可以选择导入证书了，在导入完成并重启后，此时你就可以安全启动你的 Arch Linux了。

### 使用 pacman hook 实现更新引导程序或内核时自动重新签名
#### 在更新引导程序时自动重新签名
```bash
# 此配置文件仅供 system-boot 参考，其他引导程序请谨慎操作！
sudo mkdir /etc/pacman.d/hooks/
sudoedit /etc/pacman.d/hooks/90-systemd-boot.hook
```

```
[Trigger]
Type = Package
Operation = Upgrade
Target = systemd

[Action]
Description = Updating systemd-boot
When = PostTransaction
Exec = /usr/bin/sh -c '/usr/bin/bootctl update; /usr/bin/cp /boot/EFI/systemd/systemd-bootx64.efi /boot/EFI/BOOT/grubx64.efi; /usr/bin/sbsign --key /etc/efi-keys/MOK.key --cert /etc/efi-keys/MOK.crt --output /boot/EFI/BOOT/grubx64.efi /boot/EFI/BOOT/grubx64.efi; /usr/bin/sbsign --key /etc/efi-keys/MOK.key --cert /etc/efi-keys/MOK.crt --output /boot/EFI/systemd/systemd-bootx64.efi /boot/EFI/systemd/systemd-bootx64.efi;'
```
#### 在更新内核时自动重新签名

```bash
# 如果你在上面那步创建了文件夹则不用执行下面注释掉的这行代码，
# 如果你是跳着看的，你可能需要创建这个文件夹。
# sudo mkdir /etc/pacman.d/hooks/
sudoedit /etc/pacman.d/hooks/99-secureboot.hook
```

如果你的内核没有被下列 Target 列出来的话，那么您需要手动把您内核的包名按照此格式手动修正补全一下。

```
[Trigger]
Operation = Install
Operation = Upgrade
Type = Package
Target = linux
Target = linux-lts
Target = linux-hardened
Target = linux-zen

[Action]
Description = Signing Kernel for SecureBoot
When = PostTransaction
Exec = /usr/bin/find /boot/ -maxdepth 1 -name 'vmlinuz-*' -exec /usr/bin/sh -c 'if ! /usr/bin/sbverify --list {} 2>/dev/null | /usr/bin/grep -q "signature certificates"; then /usr/bin/sbsign --key /etc/efi-keys/MOK.key --cert /etc/efi-keys/MOK.crt --output {} {}; fi' ;
Depends = sbsigntools
Depends = findutils
Depends = grep
```

参考资料：
[Unified Extensible Firmware Interface/Secure Boot][2]


[1]: https://wiki.archlinux.org/title/Unified_Extensible_Firmware_Interface/Secure_Boot#Using_your_own_keys
[2]: https://wiki.archlinux.org/title/Unified_Extensible_Firmware_Interface/Secure_Boot
