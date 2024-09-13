# 子网并入

## 前言

将你的子网并入DN11意味着你的子网下的设备将直接被暴露在DN11中的

出于安全性考虑，在接入前，请检查你子网下的所有服务的使用权限，除非你有意公开这些服务，请确保他们有密码/秘钥等手段保护

由于目前DN11大部分节点都采用的openwrt，本教程基于openwrt编写，其他设备仅供参考

那么下面开始吧

## 检查硬件设备

检查你的网关设备是否支持WireGuard

::: tip
目前DN11仅支持通过WireGuard接入，后续会开放其他接入方式
:::

::: tip
x86 设备推荐使用 [immortalwrt](https://github.com/immortalwrt/immortalwrt) 23.05以上版本

其他架构可以考虑自行编译或者去[firmware-selector immortalwrt](https://firmware-selector.immortalwrt.org/)选择合适的固件
:::

对于 openwrt 需要安装 `luci-proto-wireguard` `kmod-wireguard` 包，使用web面板安装之后会连带一系列依赖。

之后请检查 `状态-WireGuard状态`是否存在，若不存在请考虑更换固件。具体更换什么固件可以向群友求助获得编译好的固件也可以自行编译。

## 申请网段

::: danger
建议大致浏览完 [bgp](/connect/bgp) 章节后再进行申请，能避免一些问题
:::

申请网段需要向 [dn11-registry](https://github.com/dn-11/registry) 提交Pull Request

### 成员注册

您仅需要在 `as` 目录中创建一个 YAML 文件，文件名为 `<your-asn>.yml`，然后以 [`example.yml`](https://github.com/dn-11/registry/blob/main/as/example.yml) 为模板填写。填写完成后提交一个 PR，根据 Checker 回复修改您的配置，然后等待管理员合并即可。

如下为字段说明

- `ASN`

  **必填**（文件名）

  格式为 `421111xxxx` （dn11成员）或 `422008xxxx` （仅 Vidar 成员）

  后四位任选，无冲突即可。

- `name`

  **必填**

  您的名字 / ID

- `contact`

  **必填** (为非个人注册时除外)

  联系方式，如 QQ / Email

  如使用 QQ 号等纯数字，请使用引号包裹，确保该项的值为字符串。

- `ip`

  **必填**，可多个

  您所使用的 IP 段

  DN11 默认从 `172.16.0.0/16` 段中使用某个 `/24` 作为成员段。请优先选择该段内的最小一个未使用的 `/24` 地址（[信息表](https://github.com/dn-11/metadata/blob/main/README.md)的README界面会**提示下一个建议使用的网段**）。

  您可在 [信息表](https://github.com/dn-11/metadata/blob/main/README.md) 中查看已使用的 IP 段。

  如您确需使用其他 IP，请在群中说明情况。

- `domain`

  **选填**

  可在此处注册您的域名，以便我们为您生成 Zone 文件。

  如注册域名，则每个域名至少提供一个 NS 记录的 IP 地址。

  此处也可用于注册 rDNS 域名，格式与普通域名相同。请注意，目前仅子网掩码为 `/8`、`/16`、`/24` 的 IP 地址可注册 rDNS 域名。

- `ns`

  **选填**

  可在此处注册您的 NS 记录，以便我们为您生成 Zone 文件。

  每个 NS 记录对应一个 IP 地址。

  请注意，注册域名是不一定需要注册 NS 记录。如您使用其他成员提供的 NS 服务器，则无需注册 NS 记录。

- `comment`

  **选填**

  备注信息。会在信息表等场合展示。

- `monitor`

  **选填**。但若有，则至少包含下面任一项

  Monitor 额外配置项

  - `appendix`

    附加信息，会在 Monitor 中展示

  - `custom`

    自定义 ECharts 效果。参考 [此处](https://echarts.apache.org/zh/option.html#series-graph.data)

    JSON 格式

## 设备切换网段

你需要将你设备的网段切换到申请到的网段

::: danger
如果你是新手，更建议**全部推倒**重新配置（包括重置你的内网网段到申请的网段）
:::

由于不同的人有不同网络环境，比较复杂，这里仅简单描述

### 修改静态IP设备的IP

将除主路由外的所有需要静态IP地址的设备的IP修改到新网段

修改完成后这些设备将无法访问，但这是暂时的，无须担心

::: tip
如果使用了旁路由，请先将网关临时改回主路由，暂时停用旁路由，将旁路由作为一个普通的静态ip分配设备操作
:::

### 修改主路由IP与DHCP

修改主路由IP与DHCP，openwrt主路由的请修改lan口相关配置

#### 网段划分建议

- 静态IP池：172.16.X.0/26  `即 172.16.X.2~172.16.X.63`
- DHCP池：172.16.X.64/26   `即 172.16.X.64~172.16.X.127`
- 外部IP池：172.16.X.128/26  `即 172.16.X.128~172.16.X.191`
- 备用：172.16.X.192/26     `即 172.16.X.192~172.16.X.253`

当然你也可以用自己喜欢的方式划分网段，毕竟这是你自己的网络

分配IP时，不要占用`.255`和`.0`，`.254`也不要占用（根据本教程会成为你后续配置的wg隧道地址）

#### 配置建议

- IP：`172.16.X.1`
- 子网掩码：`255.255.255.0`
- DHCP池（建议）：172.16.X.64/26

## 生成密钥对

在安装有WireGuard的设备上输入以下指令生成一个秘钥

`wg genkey`

可以使用openwrt的shell

该命令会输出一串base64字符串，这就是你的**私钥（privatekey）**，请复制并妥善保管

## 添加接口并配置防火墙

::: danger

下面的内容移步[BGP组网](/connect/bgp)章节

:::
