# BFD

[原文链接](https://csmantle.top/misc/networking/2024/09/22/using-bfd-in-bird2.html)

> 本文为 [DN11](https://dn11.top/) 项目编写.
>
> BIRD2 路由软件支持在链路上搭建 BFD 故障检测协议, 能够以流量为代价实现灵敏的故障检测, 为其他路由协议提供邻居状态的辅助性信息.

## 1. 前言

双向转发检测 ([Bidirectional Forward Detection](https://datatracker.ietf.org/doc/html/rfc5880), BFD) 通过在一条链路的两端建立会话 (session) 以检测链路连通性. 链路的两端协商 Hello 包的发包间隔, 在一定数量的包丢失后, 链路即被判断发生故障. 由于 BFD 本身不支持对端发现, 因此在某一条链路上建立 BFD 需要链路的两端均正确配置协议.

BFD 协议本身仅负责进行链路连通性检测, 其得到的结果如何处理由使用者决定. 多种路由协议 (如 OSPF 和 BGP) 均可利用 BFD 提供的连通性信息来判断是否需要更新路由信息, 一般在配置 BFD 协议之后需要在上层路由协议的配置中同时进行相关配置.

每个 BFD 控制包 ([BFD Control Packet](https://datatracker.ietf.org/doc/html/rfc5880#section-4)) 通常为 24 字节长. 当给定了双方协商发包速率与链路上的封装开销后便可方便地计算出其所需的流量消耗.

## 2. 在 BIRD2 中使用 BFD

BIRD2 支持 BFD 协议. 在 BIRD2 中为一个链路搭建 BFD 协议非常简单.

### 2.1. 配置 BFD 协议

```bird
protocol bfd {
    # 你的链路接口名称
    interface "wg_hgh" {
        # 同时设置期望的对端发包间隔与自己的发包间隔
        interval 2s;
        # 当链路故障后可以降低发包速度来减少无效流量
        idle tx interval 3500ms;
        # 3 个丢包后即认为链路故障
        multiplier 3;
    };
}
```

更详细的配置说明见 [BIRD2 文档](https://bird.network.cz/doc/bird-6.html#ss6.2).

需要注意的是, 直到目前版本的 BIRD2 (2.15.1) [不支持使用多个 `protocol bfd`](https://bird.network.cz/doc/bird-6.html#:~:text=Note%20that%20BFD%20implementation%20in%20BIRD%20is%20currently,at%20most%20one%20protocol%20instance.). 尝试使用多个 `protocol bfd` 会导致所有 BFD 协议无法正常工作, 如:

```bird
# 警告: 至 BIRD 2.15.1 无法正常工作!
protocol bfd bfd1 {
    interface "if0" { ... };
}

protocol bfd bfd2 {
    interface "if1" { ... };
}
```

### 2.2. 在路由协议中使用 BFD 提供的连通性信息

BIRD2 中 OSPF, BGP 和静态路由协议都支持从 BFD 协议获取连通性信息.

#### 2.2.1. OSPF

配置 OSPF 时需要为每一个邻居链路接口开启 BFD, 如下所示.

```bird
protocol bfd {
    interface "ifs0" { ... };
}

protocol ospf v2 selfnet {
    ...
    area 0.0.0.0 {
        interface "ifs0" {
            cost ...;
            type ptp;
            # 使用接口上的 BFD 获取链路状态
            bfd on;
        };
    };
}
```

#### 2.2.2. BGP

配置 BGP 时需要为每一个邻居 protocol 实例开启 BFD, 如下所示.

```bird
protocol bfd {
    interface "ifp0" { ... };
}

protocol bgp bgp_p0 from bgp_peer_template {
    neighbor ...%ifp0 as ...;
    # 使用接口上的 BFD 获取链路状态
    bfd on;
    # 使用 BFD 获取链路状态并使用 graceful restart
    #bfd graceful;
}
```

#### 2.2.3. 静态路由

在静态路由中开启 BFD 后, 当 BFD 检测到链路故障时 BIRD2 会移除该路由的宣告. 若 BFD 协议报告链路连通或未配置到 nexthop 的 BFD, 那么 BIRD2 会忽略该选项.

### 2.3. 查看 BFD 协议状态

使用 `birdc show bfd sessions` 可以查看 BFD 会话的状态与参数.

```bash
user@host:~# birdc show bfd sessions
BIRD 2.13.1 ready.
bfd1:
IP address                Interface  State      Since         Interval  Timeout
172.16.23.253             wg_sg      Up         14:15:40.881    2.000    6.000
172.16.23.252             wg_hgh     Up         12:35:43.585    2.000    6.000
```
