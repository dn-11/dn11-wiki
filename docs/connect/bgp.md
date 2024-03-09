# BGP组网

[原文链接](https://baimeow.cn/posts/dn11/configurebgp/#%E9%85%8D%E7%BD%AE%E9%9A%A7%E9%81%93)

::: details

DN11配网第二期，接上文 “使用 Bird2 配置 WireGuard + OSPF 实现网络的高可用”，这是一篇用于 DN11 的 BGP 配置教程

随着 DN11 的扩大，使用 OSPF 进行集中管理已经变得麻烦起来了，此外还能看到一堆隧道IP污染路由表

也有不少人手上有多个内网，不得不打破 DN11 原先一个人使用一个/24网段的约定

近期又在考虑和 VidarNetwork 并网的事情，最终合并完的网络会变得相当庞大，或许是时候转移到BGP上去了

:::

## 准备

### 选择一个AS Number

BGP 是用于连接不同 AS 的路由协议，现在定义每一个人选取自己的AS号管理自己的AS。对于已经有AS号的，可以使用已有的AS号，没有AS号的建议选择 421111xxxx 并登记进文档。

### 选择自己的网段

首先，不要一次性宣告大于/24的网段，/24已经很够你折腾，如果你有多个路由设备并且确实有多个真实子网，那么你可以宣告两个或者三个/24的网段。

也不要为了省网段资源而采用/25这种做法，没有必要，只会给你带来更多的麻烦。

如果你是新加入DN11的成员，虽然DN11改为BGP的同时我们放开了网段的限制，但是真别用常见网段

- 172.16.x.0/24 (这是DN11之前使用的网段，.17 .18这些段docker会用，不要宣告)
- 10.x.x.0/24 (注意避开移动的内网段，不要使用太高或者太低的地址)
- 11.x.x.0/24 (美国国防部的公网段其中之一，他们一般当内网段用)
- 100.64.x.0/24 (比较少见的保留段)
- 192.168.x.0 (真的很容易冲突，不要用)

此外你还需要避开一些保留的内网段

包括：

| 网段 | 说明 |
| --- | --- |
| `172.16.0.0/16` | DN11 常规成员段 |
| `172.16.255.0/24` | 公共服务段 |
| `10.0.0.0/24` `10.42.0.0/16`<br>`10.43.0.0/16` `172.16.0.0/24` `172.16.200.0/24`<br>`172.16.254.0/24` `172.26.0.0/16`<br>`172.27.0.0/16` `192.168.1.0/24` | 保留段  |
| `172.16.128.0/24`<br>`172.16.129.0/24` | 不建议 |

## 隧道

> 本小节写给 Openwrt 用户，ros 用户应该都会，linux 用户参考 wg-quick 使用教程。但无论你是什么用户，请务必看完本章节的内容，铺设隧道这件事有一些实践上的做法可供参考。

### 安装wg-quick-op

柏喵给 openwrt 专门写了一个用来配置 WireGuard 的工具，他会帮你处理开机启动，ddns 的问题的同时你可以使用 wg-quick 配置文件的所有配置。主要是基于 wg-quick-go 修改，定制了一些实用功能。

Github: [https://github.com/BaiMeow/wg-quick-op](https://github.com/BaiMeow/wg-quick-op)

安装方法：

在 https://github.com/BaiMeow/wg-quick-op/releases 选择适合你架构的包下载

下载完成后 tar -zxvf 进行解压

之后再当前文件夹下输入

```bash
root@OP:~# ./wg-quick-op install 
INFO[0000] current binary: /root/wg-quick-op   
INFO[0000] installed wg-quick-op                        
INFO[0000] add wg-quick-op to init.d success
```

会将其安装至 /usr/sbin/目录下，并且添加开机启动

### 配置隧道

在 `/etc/wireguard`下创建配置文件（没有这个文件夹的话需要创建），一条隧道对应一个配置文件,配置文件命名为 `xxx.conf`。下面给出配置文件示例:

```txt
[Interface]
PrivateKey = <PrivateKey>
ListenPort = <Port>
PostUp = /sbin/ip addr add dev %i <my tunnel IP> peer <another tunnel IP>
Table = off

[Peer]
Endpoint = <EndPoint IP>
PublicKey = <Public Key>
AllowedIPs = 10.0.0.0/8, 100.64.0.0/10, 172.16.0.0/12, 192.168.0.0/16
```

这里主要参考了 DN42 的配置

- PrivateKey **私钥**用 `wg genkey`生成一个
- ListenPort 为WireGuard监听端口，注意打开防火墙或者配置端口映射
- PostUp 隧道建立时执行的命令，这个命令添加了一条对等路由，例如 `/sbin/ip addr add dev %i 172.16.4.254/32 peer 172.16.2.254/32`
- Table = off 请务必使用 off，路由由 bird2 来接管，不需要 WireGuard 创建
- Endpoint 填对面的 IP 和监听的端口
- PublicKey 填对面的公钥，公钥可用用 `wg pubkey`命令，然后粘贴**私钥**进去按 ctrl+d 获取
- AllowedIPs 允许所有**内网** IP 通过 WireGuard 接口

使用 `wg-quick-op up 接口名`来连接这个接口，没有意外的话，现在你能够 ping 通对面的对端IP了

#### 故障排查

### STEP1

首先你需要检查隧道有没有连接上，执行 `wg show 接口名`，看 latest handshake，如果握手时间在两分钟内都是正常的，如果大于两分钟或者没有这个字段，说明 WireGuard 连接没有连上。

这一般是因为端口没开，检查路由器的入站配置，如果是旁路由，还得检查一下端口映射是否正确。这也有可能是DNS记录的地址过期导致的，检查一下 WireGuard 的 endpoint 地址是否确实是对面的IP地址。

### STEP2

如果连接上了还是没有 ping 通，请检查路由表，有没有到对端的路由，并再次检查你的 WireGuard 配置并重启接口

## BGP

### 配置 bird2

> 本小节写给 bird2 用户，ros 和其他用户可供参考，但是依旧推荐阅读

下面给出BGP配置示例，以下示例适用于AS内只有一台路由设备的配置，如果你的AS内有多个路由设备还要做不少额外配置，之后可以另外写一篇文章来谈谈这个问题

```bird
log syslog all;
debug protocols all;

# 可以采用隧道地址，也可以采用路由所在的IP，在自己的网段内且不重复即可
router id 172.16.4.254;

# 分表，给后期的其他配置留一点回旋的余地
ipv4 table BGP_table;

protocol device{

}

# 从 master4 导出所有路由表到 kernel
protocol kernel{
    ipv4 {
        export all;
        import none;
    };
}

# 宣告 172.16.4.0/24 段
protocol static {
    ipv4 {
        table BGP_table;
        import all;
        export none;
    };

    # 只是为了让BGP的路由表里出现这条路由，不要担心 reject
    # 这个动作其实无所谓，reject 这个动作并不会被发到其他 AS
    # 后续将在导出到 master4 的时候删除这条路由，本地也不会有这一条
    # 请修改为你自己要宣告的段
    route 172.16.4.0/24 reject;
}

# 定义BGP模板
template bgp BGP_peers {
    # 修改为隧道地址和你的ASN 
    local 172.16.4.254 as 4220084444;

    ipv4 {
        table BGP_table;
        import all;
        export filter {
            if source ~ [RTS_STATIC, RTS_BGP] then accept;
            reject;
        };
    };
}

# 从 BGP_table 导入路由到 master4
protocol pipe {
    table master4;
    peer table BGP_table;
    import filter {
        # 过滤 protocol static 添加的 reject
        if source = RTS_STATIC then reject;
        accept;
    };
    export none;
}

# 从模板定义一个BGP邻居
# protocol bgp protocol名称 from 模板名称
protocol bgp hakuya from BGP_peers {
    # 对端隧道地址%接口 as ASN
    neighbor 172.16.0.254%hakuya as 4220081919;
}
```

所有相关配置指导已经写在配置文件里了，修改好覆盖bird原有的配置文件即可

### 添加更多邻居

```bird
# protocol bgp protocol名称 from 模板名称
protocol bgp hakuya from BGP_peers {
    # 对端隧道地址%接口 as ASN
    neighbor 172.16.0.254%hakuya as 4220081919;
}
```

常见故障：%后填写的接口名和wg配置文件启动的接口要完全对应

将这一块内容复制粘贴在文件后面，再修改修改内容即可

### bird故障排查

**STEP1 检查 bird 配置文件时候有还未修改为自己的信息的地方**

**STEP2 `birdc c` 应用配置了没有?**

**STEP3 用 `birdc s p`看看具体卡什么状态了**

常见状态：

- `Idle` 未启动（一般是配置填坏了）
- `Established` 链接已建立
- `Connect` 隧道没通，bgp未建立

## End But not Ended

现在 BGP 连接应该已经建立起来了，可以使用 `birdc s p` 查看所有protocol的连接状态，一切顺利的话，你的 BGP 连接应该已经 Established 了

如果你的AS里有不少子网，这一切还只是折腾 BGP 的开始，在后面还有 BGP Large Community ，BGP confederation ，RR 等内容。

## Route collector

Route Collector 用于收集所有人的路由最终绘制成一张实时更新的图。

配置详见 [Collector](./collector.md)