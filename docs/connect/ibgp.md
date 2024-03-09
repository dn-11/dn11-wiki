# IBGP

原文链接: [IBGP FullMesh 实现多节点自治域](https://baimeow.cn/posts/dn11/configureibgp/)

最近不少群友有把自己的其他服务器也接入自己的 AS 的需求，那这篇教程也是时候该出了。

## 总览

这个事情比较复杂，我们先不急着开始配，先了解一下我们需要一个什么效果。

DN11 作为一个发展了有一段时间的实验性网络，我们目前有很大一批人，他们手上都已经有了一个节点，并且在这个节点上配置了 BGP 从而联通到其他节点。那这个情景下，他们的自治域就是由那一个节点组成的单节点自治域。我们现在需要添加一个新的节点到这个自治域，我们需要解决两个问题。

1. 这两个节点之间需要组网
2. 需要把某一个节点获取到的 BGP 路由与其他节点做一个同步

这两件事情我们分别将通过 OSPF 和 IBGP 实现。OSPF 是 DN11 的老东西，从使用者的角度看，就一个通过获取全局拓扑计算最短路的路由协议。IBGP 是 BGP 的一种，BGP 协议分为两种 EBGP 和 IBGP, 他们分别用于将 BGP 路由发给其他 AS 和将 BGP 路由同步到自己 AS 的其他节点。

IBGP 需要配置 fullmesh，这是由他的设计决定的，IBGP 只会把自己收到的 EBGP 路由转发给自己的邻居，对于自己收到的 IBGP 路由他并不会做一个转发，这主要是为了防止产生环。这其实无所谓，节点多了我们可以用 rr 反射器甚至多级 rr，还可以玩联邦，这个日后再说。下面将以双节点为例，配置一个多节点的 AS。

## 入口文件

由于这次的配置文件比较长，我们会把他切分到各个文件中，所以先介绍一下入口文件 `bird.conf`的配置

```bird
log syslog all;
debug protocols all;

router id 172.16.4.6;

protocol device{
}

protocol kernel{
    ipv4 {
        import none;
        export all;
    };
}

ipv4 table OSPF_table;
ipv4 table BGP_table;

include "/etc/bird/ospf.conf";
include "/etc/bird/bgp.conf";
include "/etc/bird/ibgp.conf";

protocol pipe pipe_ospf_table{
    table master4;
    peer table OSPF_table;
    import filter {
        krt_prefsrc=172.16.4.6;
        accept;
    };
    export none;
}

protocol pipe pipe_bgp_table {
    table master4;
    peer table BGP_table;
    import filter {
        if source != RTS_BGP then reject;
        krt_prefsrc=172.16.4.6;
        accept;
    };
    export none;
}
```

我们很容易会发现，入口文件这里使用了三个 `include`关键字，我们在这个入口文件里分别引用了三个文件，后续我们的 OSPF IBGP 和 EBGP 的实际逻辑都会在里面去实现。

需要注意的时候，bird 的配置文件是有序的，从上面的配置文件中可以看出来，在我们 include 之前，我们声明了两张路由表。如果我们调换一下位置，bird 就会报错说这个 symbol 是未定义的。当然你也可以把这几个表的声明给放到相应的文件内，这是没有问题的，bird本身不存在作用域问题。我这里放在入口文件是为了入口文件本身能够逻辑自洽，也是为了整体看上去比较清真。

后面两个 pipe 分别是为了导入 ospf 路由和 bgp 路由到 master4, master4表的路由最终在 kernel 协议里导入到系统表。这里给 BGP_table 加了 filter 是为了防止用于静态宣告的 Static 路由进入系统表。

## 铺设 OSPF

理论上讲保证自治域内部的通畅是一个自治域的基本要求，一般需要先把自己配通了再去想着和其他人 peer。所以确保自己内网的通畅是第一步。我们下面使用 OSPF 来确保 AS 内部的连通性

```bird
protocol ospf v2 selfnet {
        ipv4 {
                table OSPF_table;
                export all;
                import all;
        };
        area 0.0.0.0 {
                # change it
                interface "wg0" {
                        cost 20;
                        type ptp;
                };
                # may change it
                interface "lo" {
                        type bcast;
                };
        };
}
```

OSPF 的教程前面有一篇文章讲解过了。这里我们在回环口 lo 配置了 bcast 是为了将回环口的 ip 广播到 OSPF，不用担心 127.0.0.1 这个 IP 进路由表，bird 自己会过滤掉，也可以手动写 filter 过滤，这样显式一点。

对于这个 bcast，如果你想把这台机器的内网广播到 OSPF 的话，把 lo 改成 br-lan 这种 lan 的接口名就可以了，此时你的路由设备在 OSPF 的 IP 就是你 br-lan 接口上的 IP；如果你是云服务器，下面压根没有子网，这种时候建议手动在 lo 接口配置一个 ip 并通过广播 lo 接口的 ip 的方式把你的设备广播在你的OSPF里。

```bash
ip addr add 172.16.4.6 dev lo
```

为了让这个添加到 lo 的 ip 永久生效，你需要看看你的系统下的网络是怎么管理的，下面展示一下 netplan 的配置。

```yaml
# cat /etc/netplan/70-lo.yaml
network:
  ethernets:
    lo:
      addresses: [172.16.4.6/32]
  version: 2
```

以上是我的一台机器 lo 接口的的 netplan 配置，这里绑定了 172.16.4.6/32 到 lo 接口上，广播出去后就可以使用这个 IP 访问我的这台设备。

配置好要广播的 IP 后你需要在另一台机器上做相同的操作，然后拉隧道并添加你的隧道到 ospf 的配置文件，就像上面的 wg0 一样。

ospf 的 cost 随你喜欢，我个人一般综合判断带宽和延时决定大概给多少 cost。下面给出一个标准 WireGuard 隧道配置样例。

**yourIP 最好另起隧道 ip（即不要和 lo 上面的 ip 冲突）**

```txt
[Interface]
ListenPort = <listenPort>
PrivateKey = <privateKey>
PostUp = /sbin/ip addr add dev %i <yourIP>/32 peer <peerIP>/32
Table = off

[Peer]
PublicKey = <publicKey>
AllowedIPs = 10.0.0.0/8, 100.64.0.0/10, 172.16.0.0/12, 192.168.0.0/16
Endpoint = <endpoint>
```

注意，如果你像上面一样使用 PostUp 来给接口绑定IP，那么请务必删除掉 Address 字段。否则 OSPF 会认为你有两个 IP（其实这个两个IP是一样的，但是 network 不一样）并在这个接口上使用这两个一样的 IP 分别做一次广播，结果会导致对端混乱，无法建立 OSPF 邻居。

如果你在调试 bird 的时候发现日志里有提到 MTU 问题，请添加 `MTU = 1420`在两边的 `[Interface]`下。还是有问题的话尝试继续减小 MTU。

如果两边网络配通了那说明你的 AS 内部已经通了，可以进行下一步配置了。

## EBGP 静态宣告

一个 AS 所拥有的网段基本是固定的，只需要宣告固定的网段就好了，这里推荐使用静态宣告。当然你也可以把 OSPF 重分发出来，但是重分发很容易重分发出一些内部的隧道段出来，也会让漏油的风险++，个人不推荐这个配法。不过他也有一个好处，就是即使你AS内部炸了，你依然有可能可以绕路其他的 AS 访问到裂开的另一块。但这不清真，一般来说 **保证自己的 AS 内部的连通性是 AS 自身的义务** 。

```bird
protocol static {
    ipv4 {
        table BGP_table;
        import all;
        export none;
    };
    # change it
    route 172.16.4.0/24 reject;
}

template bgp BGP_peers {
    # change it
    local 172.16.4.253 as 4220084444;
    ipv4 {
        table BGP_table;
        import all;
        export filter {
            if source ~ [RTS_STATIC, RTS_BGP] then accept;
            reject;
        };
    };
}

# change it
protocol bgp hakuya_tokyo_aws from BGP_peers {
    neighbor 100.64.0.253%'hakuya-aws' as 4220081919;
}
```

和之前的配法没有什么差别，就是一个静态宣告，不再做讲解。

> 在边缘节点上，和其他人 EBGP peer 时，你可以只宣告那个节点自己所拥有的网段，从而减少途径那个节点的流量。

## IBGP 内部通告

上面配好之后如果你先注释掉 IBGP 的配置文件的 include，你会发现你和别人起 EBGP 的那台设备一切正常，而另一台机器只有 OSPF 的路由，缺少到其他 AS 的路由，这便是 IBGP 想要解决的问题。我们通过 IBGP 来同步 AS 不同边界网关获取到的外部 EBGP 路由。下面先给出配置样例：

```bird
template bgp ibgp_peers {
    # change it
    local as 4220084444;
    # change it
    source address 172.16.4.6;
    ipv4 {
        next hop self;
        igp table OSPF_table;
        table BGP_table;
        import all;
        export filter {
            if source = RTS_STATIC then reject;
            accept;
        };
    };
}

# change it
protocol bgp IBGP_dorm from ibgp_peers {
    neighbor 172.16.4.5 internal;
}
```

其实和 EBGP 非常相似，前面的 `local`和 `source address`和EBGP保持一致。

在 ipv4 块，我们添加了一句 `next hop self` 也就是设置自己为下一跳网关，由于 AS 内部的 OSPF 已经跑通了，所以设为自己的递归路由一下就可以通过 OSPF 的表找到下一跳网关的位置。下面紧接着的 `igp table OSPF_table`就是对于接收到的 IBGP 路由 bird 去搜索递归路由用的路由表，我们给他设置为我们 OSPF 的表。

至于为什么这里突然提到了递归路由，这是因为我们把路由通过 IBGP 通告到了我们的 AS 内部后其实这个路由的网关往往并不能直接路由得到。当我们收到一个 IBGP 路由后我们需要根据 OSPF 表做递归路由从而决定真正的下一跳地址。

再往后我们在 `export` 里做了一个过滤拒绝了 Static 路由，这是因为我们静态宣告自己的网段是 Static 路由做的。而 IBGP 从设计上来说，并不适用于传递这些信息，更何况对于内部而言这是错误的，因此这里做一个过滤。

最后我们依旧和使用 EBGP 一样，根据上面的模板定义一个新的 IBGP 连接，不同的是现在不需要指定接口，IBGP 的 peer 默认是multihop 的，他会自己根据路由表路由过去，最终连上就可以了，后面标识 internal 表示这是一个 IBGP。

## 继续增加节点

这里涉及三个协议，OSPF IBGP EBGP。对于 OSPF 增加节点只要有一条隧道通上就好了，不过我还是建议有条件的做 fullmesh，这会大幅度提升你的网络稳定性。EBGP 照样配就是，尽可能就近 peer。而IBGP，你每增加一个节点，这个节点要和现存的所有节点 peer，也就是说 IBGP 需要 fullmesh。这是因为 IBGP 只会发自己的路由给邻居，而不转发不属于自己的路由，这个设计在上面介绍过了。

所以如果节点数量上来了，就需要其他方案辅助了。

## 疑难解答

### 一堆 unreachable

检查 igp table 配了没，检查 ospf 路由表是否正确。

### OSPF 没连上

`ip addr` 看看你的 wg 接口绑定了几个 IP 上去，多于一个那就 remake WireGuard 配置文件。如果你在 PostUp 里绑 IP 了那就不要 Address 字段了。

也有可能是 MTU 问题，看看 bird 日志 `journalctl -xeu bird`，用 op 的看 web。
