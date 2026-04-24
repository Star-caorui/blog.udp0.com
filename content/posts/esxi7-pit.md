+++
title = "记一次安装 ESXI 7 遇到的坑"
date = 2022-07-02T16:38:00+08:00
draft = false
lastmod = 2022-07-02T16:47:29+08:00
slug = "esxi7-pit"
+++

### 无法使用 `M.2 NVMe SSD` 作为系统盘

遇到这个问题是因为主板的 UEFI/BIOS 不支持 NVMe, 没有驱动导致的。

解决方法：

- 更新最新固件：在新版 BIOS 可能会添加 NVMe 驱动，提供支持。
- 自行将 NVMe 驱动注入到固件 <sup>[参考教程](https://www.bilibili.com/read/cv4475152/)</sup>
- 从其他可引导设备启动，载入 NVMe 驱动，引导进入。

我的选择：

- **已放弃**：更新到最新固件这个方法虽然是最简单的，但局限性太大。万一你的主板的新版固件还是不支持呢？
- **已放弃**：注入驱动到固件对于我这种不懂原理的人来说容易出现刷坏主板的情况。我不愿意冒这个风险。
- 从其他可引导设备启动这个方法很好，例如 U盘。而且操作简单省事。下面我就详细介绍这种方法。

先说说为什么选择使用 U盘 而不是其他可引导设备。常见的可引导设备有以下几种。

- SATA 硬盘：**已放弃**，我需要在后续使用中直通 SATA，所以我不能占用 SATA 设备。

- CDROM 光盘：**已放弃**，我的设备上没有光驱，而且我也没有可写光盘。

- USB 存储设备：我随便整了个 U盘来存放 Clover （一个引导程序，用于加载 NVMe 驱动并引导至 NVME 盘内的系统。）

Clover 配置教程：请参阅 [Arch Wiki](https://wiki.archlinux.org/title/Clover) 来安装 Clover，并参阅我下面的配置文件来定制您的 Clover。

**`config.plist`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<!-- 默认引导设置 -->
	<key>Boot</key>
	<dict>
		<!-- 卷标/GUID：EFI -->
		<key>DefaultVolume</key>
		<string>EFI</string>
		<!-- 引导程序的路径：\EFI\BOOT\BOOTX64.efi -->
		<key>DefaultLoader</key>
		<string>\EFI\BOOT\BOOTX64.efi</string>
		<!-- 快速启动（开启后将不显示 GUI）：true -->
		<key>Fast</key>
		<true/>
	</dict>
	<!-- 图形化选择界面的配置 -->
	<key>GUI</key>
	<dict>
		<key>Custom</key>
		<dict>
			<key>Entries</key>
			<array>
				<dict>
					<!-- 禁用此引导项：否 -->
					<key>Disabled</key>
					<false/>
					<!-- 隐藏此引导项：否 -->
					<key>Hidden</key>
					<false/>
					<!-- 卷标/GUID：EFI -->
					<key>Volume</key>
					<string>EFI</string>
					<!-- 引导程序的路径：\EFI\BOOT\BOOTX64.efi -->
					<key>Path</key>
					<string>\EFI\BOOT\BOOTX64.efi</string>
					<!-- 显示名称：ESXI 7 -->
					<key>Title</key>
					<string>ESXI 7</string>
				</dict>
			</array>
		</dict>
	</dict>
</dict>
</plist>

```

### ESXI 7.0 的 VMFSL 吃掉了 120 GiB！

这个分区是 ESXI 的「系统存储分区」，默认消耗 138GB。但默认占用似乎对我这种家用级用户来说过大了，所以我们要限制一下。

{{% warn title="注意事项" %}}
- 这个分区只能在 ESXI 安装过程中被限制。如果你已经安装好，请在**备份数据**后再尝试重装。
- `autoPartitionOSDataSize` 参数**不被推荐使用**，未来可能带来**未知**问题。
{{% /warn %}}

方法：在 ESXi 7.0 安装过程中，你可以通过 systemMediaSize/autoPartitionOSDataSize 参数来限制「系统存储分区」的空间占用。

systemMediaSize 的可选参数：

- min  33GB, 适用于 「单盘」或「嵌入式」服务器
- small  69GB, 适用于至少 512GB RAM 的服务器
- max  最大化所有可用空间，用于多 TB 级服务器

举例 1：**在进入安装环境时输入启动选项**：

- 使用安装介质启动主机，当 ESXi 安装程序窗口出现时，在 5 秒内按 **`Shift+O`** 以编辑引导选项。

例如，添加以下提示：

systemMediaSize=min

举例 2：**修改 boot.cfg 以具有引导选项：**

编辑安装介质中的 boot.cfg 文件并将引导选项添加到 kernelopt 行。

例如， kernelopt=runweasel systemMediaSize=min

如果您认为我写的很乱，可以直接看 VMWare 官方文章（英文）：[用于配置 ESXi 系统分区大小的引导选项](https://kb.vmware.com/s/article/81166)

### 无法直通硬件

可能的原因：

- CPU 不支持虚拟化直通：无解，换 CPU 可解
- 主板 不支持/未启用虚拟化直通：如果不支持也是无解，如果支持请启用。
- 其他原因：我主板不支持 vt-d，我暂时遇不到后面的坑了。

更多可以参考：https://www.jianshu.com/p/acbc255bcebb
