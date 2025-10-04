# OSPF

最近不少群友有把自己的其他服务器也接入自己的 AS 的需求，那这篇教程也是时候该出了。

## 总览

我们先不急着开始配，先了解一下我们需要一个什么效果。

DN11 作为一个发展了有一段时间的实验性网络，我们目前有很大一批人，他们手上都已经有了一个节点，并且在这个节点上配置了 BGP 从而联通到其他节点。那这个情景下，他们的自治域就是由那一个节点组成的单节点自治域。我们现在需要添加一个新的节点到这个自治域，我们需要解决两个问题。

1. 这两个节点之间需要组网
2. 需要把某一个节点获取到的 BGP 路由与其他节点做一个同步

这两件事情我们分别将通过 OSPF 和 IBGP 实现。OSPF 是 DN11 的老东西，从使用者的角度看，就一个通过获取全局拓扑计算最短路的路由协议。IBGP 是 BGP 的一种，BGP 协议分为两种 EBGP 和 IBGP, 他们分别用于将 BGP 路由发给其他 AS 和将 BGP 路由同步到自己 AS 的其他节点。

本篇我们着重解决第一个问题，AS 内部节点的组网。

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

理论上讲保证自治域内部的通畅是一个自治域的基本要求，一般需要先把自己配通了再去想着和其他人 peer。所以确保自己内网的通畅是第一步。我们下面使用 OSPF 来确保 AS 内部的连通性。

```bird
protocol ospf v2 selfnet {
        ipv4 {
                table OSPF_table;
                export all;
                import all;
        };
        area 0.0.0.0 {
                # change it
                stubnet 172.16.4.6/32；
                # change it
                interface "wg0" {
                        cost 20;
                        type ptp;
                };
                # change it
                interface "lan" {
                        type nonbroadcast;
                };
        };
}
```

上面的这段配置，声明了一个名为 selfnet ospfv2 的协议实例，名字可以随便取。在这个实例中，首先声明了启用 ipv4 并将 OSPF_table 表中的所有路由导出到 OSPF，同时也将从 OSPF 收到的所有路由导入到 OSPF_table。

随后，声明了一个 area id 为 0.0.0.0 的 area，这是一个 OSPF 的区域，用于控制 LSA 洪泛在某个特定范围内，其中 0.0.0.0 代表骨干（backbone），area id 在大型 OSPF 网络中有一些应用，就以这里的规模，无需理会。

在 area 0.0.0.0 中，声明了三个不同的东西，首先介绍 `type ptp`，它这里表示一个点对点的链路，需要在 interface 中填写和另一台服务器的隧道的接口名称，OSPF 会自动在这个接口里通过多播来发现新的 OSPF 邻居。

除此之外这个 area 块里还声明了一个 stubnet 和一个 nonbroadcast，一般来说这两个是选其一。如果该设备是你的一个云服务器，上面没有什么子网可言，写一个 stubnet 就够了，内容是你的服务器在 DN11 中的 IP。如果你不知道这是什么，可以随便取一个并将其绑定在 lo 口，例如：

```bash
ip addr add 172.16.4.6 dev lo
```

为了让这个添加到 lo 的 ip 永久生效，你需要看看你的系统的网络是怎么管理的，下面展示 ubuntu 下的 netplan 的配置。

```yaml
# cat /etc/netplan/70-lo.yaml
network:
  ethernets:
    lo:
      addresses: [172.16.4.6/32]
  version: 2
```

后续就可以使用这个 IP 在 DN11 中访问你的服务器了。

而 nonbroadcast 用于告诉 OSPF 去学习一个接口的路由但不在这个接口发送 OSPF 广播。如果你的设备下面有一个子网，比如说家里，宿舍里，建议把你的子网网段迁移到 DN11 段并且通过这个方式让 OSPF 来学习并广播这个接口上的地址。

完成上面的操作后你需要在另一台机器上做相同的操作，然后拉隧道并添加你的隧道到 ospf 的配置文件，就像上面的 wg0 一样。

ospf 的 cost 随你喜欢，我个人一般综合判断带宽和延时决定大概给多少 cost。

用于 OSPF 的隧道配置与此前在 [bgp](/connect/bgp.html) 章节讲述的一致，不再赘述

注意 OSPF 要求两边 MTU 一致，如果你在调试 bird 的时候发现日志里有提到 MTU 问题，请添加 `MTU = 1420`在两边的 `[Interface]`下。还是有问题的话尝试继续减小 MTU。

如果两边能通过隧道 IP ping 通了那说明你的 AS 内部已经通了，可以进行下一步配置了。

上面配好之后如果你先注释掉 IBGP 的配置文件的 include，你会发现你和别人起 EBGP 的那台设备一切正常，而另一台机器只有 OSPF 的路由，缺少到其他 AS 的路由，这便是 IBGP 想要解决的问题。我们在下一篇中会通过 IBGP 来同步 AS 不同边界网关获取到的外部 EBGP 路由。

## 疑难解答

### OSPF 没连上

`ip addr` 看看你的 wg 接口绑定了几个 IP 上去，多于一个那就 remake WireGuard 配置文件。如果你在 PostUp 里绑 IP 了那就不要 Address 字段了。

也有可能是 MTU 问题，看看 bird 日志 `journalctl -xeu bird`，用 op 的看 web。
