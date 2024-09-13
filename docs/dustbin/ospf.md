# OSPF(过期) 2023年6月

## 前言

建 dn11 的时候遇到了一些小问题，在 fullmesh 的网络拓扑的情况下偶尔会出现几个节点连不上的情况，连不上了就直接连不上了，没有后话了。

实际上是可以通过绕路的方式连通的，这就要引入一些路由协议了，最早的构想是引入 BGP 协议的但是考虑了一下觉得这些东西的体量还是太大了，最后决定引入 OSPF 协议。

下面将在 openwrt 上使用 bird2 配置 OSPF over WireGuard。

## OSPF 配置

作为示例，本文选择 bird2 提供 OSPF 支持，先安装 bird2

```shell
opkg install bird2
opkg install birc2c
```

在 openwrt 上，bird2 的配置文件默认地址在 `/etc/bird.conf`

bird2 的默认配置文件很长，算是一个 all config 先给他放到一边去

```shell
mv /etc/bird.conf /etc/bird.conf.bak
```

然后我们新建一个自己的 bird.conf

```shell
vim /etc/bird.conf
```

给各位准备了配置文件模板，粘贴进去再改改就好了

```nginx
log syslog all;
debug protocols all;

router id 172.16.255.4;

protocol device{
}

protocol kernel{
    ipv4 {
        export where proto = "wg";
    };
}

protocol ospf v2 wg {
    ipv4 {
        export all;
        import where net !~ 172.16.4.0/24;
    };
    area 0.0.0.0 {
        interface "wg*" {
            cost 5;
        };
    };
    area 0.0.0.4 {
        interface "br-lan";
    };
}
```

- 每个路由设备的 `route id`都是唯一的，`route id`本质上是一个 int32, 只是为了方便使用被 `.`分割成了四段，需要提前约定。一般来说为了方便记忆和配置，会取了一个网段将这个网段下的 ip 对应的 int 作为 `route id`，dn11 对于 `route id`有规范，起始 id 为 `172.16.255.1`，请在文档中按顺序往下申请
- `import where net !~ 172.16.4.0/24;`这一行指定的网段的路由不会从 ospf 中学习，一般需要把这里配置成你的 lan 的网段，因为lan的路由早已由系统定义，不需要也不能由 ospf 来指定
- `export all;`这一行指定了由 ospf 导出给其他路由学习的网段，如果你由 ospf 管理的接口中有不愿意导出的网段可以修改这里，这里导出全部
- 后面紧跟着两个 area，每个 area 也有自己的 id，这两个 id 和 route id 一样仅仅是一个 int32 并不代表任何网络含义，仅仅是个名字，`0.0.0.0`是骨干 area ，在这里必须统一使用 `area 0.0.0.0`
- 在下一行我们用 `interface "wg*"`指定了一些接口, 这里的 `*`是通配符，这种写法指定了所有名字以 wg 开头的接口在这个area内，后续建立 wg 接口的时候要遵循这里的配置，如果你想使用其他名称也可以修改这里的配置
- 在下一行，指定了一个 `cost`，事实上即使不配置 `cost`ospf 也会自动地指定一个cost，cost默认的值为 100Mbps/连接速度
- `area 0.0.0.4`用于你的 lan, dn11 目前定义每个人的 lan 都单独占用一个 area， 因此，需要一个唯一的 area 用于 lan, 请在文档中申请
- 下一行的 interface 里指定了 lan 接口，对于 openwrt 旁路由，这里一般就是 br-lan，主路由一般就是 lan

:::tip
需要在文档中申请的有 route id 和 area id
:::

编辑完配置文件后，就可以启动bird2了

```shell
service bird start
```

## WireGuard 配置

下面建立 WireGuard 点对点连接，均在 openwrt 的 web 页面里操作

在要建立 WireGuard 连接的两个路由上要进行相对应的操作，操作的流程一致

### 新建接口

在 `网络-接口-添加新接口...`中新建一个 WireGuard 接口，以 `wg*` 的格式命名，作为示例，这里新建一个 `wg0`
![add_interface](/img/ospf/add_interface.png)

### 配置 WireGuard 接口

- 私钥填写你自己的私钥，如果没有，可以使用 `wg genkey`命令生成一个
- 监听端口最好使用一个比较高的端口，可以随意指定，但是不同的 WireGuard 接口监听的端口不能重复
- IP 地址是 WireGuard 隧道中你的 IP 地址，dn11 对 WireGuard 隧道地址有规范，起始地址为 `172.16.128.0`，每个人每次可以在文档中申请一个 /28 的网段，而每次使用一个 /32，例如 `172.16.128.16/32`

:::tip
记住这个值，在配置静态路由时会使用，也需要交换给对方
:::

先保存上述配置，点击 `连接`重连该 WireGuard接口，此时接口公钥可以在 `状态-WireGuard状态`里获取，下面继续配置这个接口，先添加一个peer

- 公钥是建立点对点 WireGuard 连接的对方的公钥，对方在完成上述配置后就能获取到接口公钥，将对方的公钥填写在这里
- 允许的 IP 填写 `0.0.0.0/0`让 WireGuard 放通所有流量（如果你真的不想填这个，可以填你要访问的网段和组播地址，不推荐）
- 路由允许的 IP 不要勾选，路由将由 OSPF 管理，不要让 WireGuard 来配置路由
- 端点主机填对方主机地址，请事先配置好 DDNS
- 端点端口填对方的 WireGuard 监听地址
- 持续 Keep-Alive 仅当你的路由位于nat后，对方无法直连时勾选
  :::info
  实际上 OSPF 的组播包和路由交换会产生流量，一点程度会起到和 Keep-Alive 类似的作用
  :::

配置完成后保存

![config_interface](/img/ospf/config_interface.jpeg)

### 配置防火墙

对于 dn11 老成员，只需将这个新建的 WireGuard 接口分配到原先用于 WireGuard 的防火墙区域即可，然后就可以跳过这一步

没有配置过的话需要在 WireGuard 接口的配置中修改防火墙设置为“不指定或新建”，然后填写新的防火墙区域名称，保存配置，以创建一个新的防火墙区域

接下来转到 `网络-防火墙`，配置新建的防火墙区域。基本设置中，入站出站转发均改为接受，端口触发中，lan 到 WireGuard 接口和 WireGuard 接口到 lan 的转发均改为接受，保存并应用

### 配置静态路由

:::info Why?
由于没有让 WireGuard 配置路由，在隧道 IP 地址中又选取了 /32 的网段，对端隧道 IP 和自己并不在一个子网，以至于没有到对面的隧道地址的路由，这才需要手动配置静态路由。
:::

在 `/etc/bird.conf` 里的 `static` 协议里静态路由配置，示例如下：

```nginx
protocol static {
    ipv4 {
        import all;
        export none;
    };
    route 172.16.128.2/32 via "wg0";
```

- `172.16.128.2/32` 应填写对端隧道 IP/32
- `wg0` 应该填写为隧道网卡名称

这些配置在 static 协议里指定了到对端隧道 IP 的路由，然后将这些路由从 static 协议里 import 到 bird

现在恭喜你完成了所有配置，没有意外的话稍等片刻应该就能访问到对面的网络了

如果仍然无法访问请转到[故障排查](#故障排查)

## 连接到更多路由

对每一个连接都需要一个独立的 WireGuard 接口，每个接口都会存在于一个独立的 WireGuard 子网。因此需要新建一个 WireGuard 接口来连接到第二个路由（比如说 wg1 ）

1. 配置 WireGuard

   与配置第一个 WireGuard 接口无异，注意监听端口和 IP 地址不能和其他接口重复
2. 配置静态路由

   与配置第一个静态路由无异，注意网关和目标地址不能和前一个重复，且与 WireGuard 配置里的 IP 保持一致

:::warning
1.仔细检查端口是否重复

2.不要忘了在配置完成后重连接口
:::

## 故障排查

### 排查步骤

1. 检查 WireGuard 连接是否连上，查看“状态-WireGuard状态”中对应接口的对端是否成功握手，图标是否亮起，如果没有说明 [WireGuard](#wireguard-配置) 有问题
2. 检查 OSPF 是否连上，查看“状态-系统日志”，拉到最新，如果 OSPF 卡在 Init 状态，说明[静态路由](#配置静态路由)配置有问题
3. 上面两项都过了之后应该能 ping 通对面的路由，否则就是疑难杂症
4. 能 ping 通对面路由但是 ping 不通对面 lan 的主机，转到[配置防火墙](#配置防火墙)

## FAQ

- Q: 没有公网 IPv4 能不能用 IPv6

  A: 可以，两边端点主机的 DDNS 都要做 AAAA 解析，不要上 A 解析，其他配置依然使用 IPv4

## 参考文档

- [HIGH AVAILABILITY WIREGUARD SITE TO SITE](https://www.procustodibus.com/blog/2021/10/ha-wireguard-site-to-site/)
- [WIREGUARD SITE TO SITE CONFIGURATION](https://www.procustodibus.com/blog/2020/12/wireguard-site-to-site-config/)
