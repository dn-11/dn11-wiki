# Route Collector

[Status](https://status.dn11.top)

Route Collector 用于收集所有人的路由最终绘制成一张实时更新的图。

bird导出的数据每分钟更新一次，读数据延时一分钟，加起来极限延时2分钟。

Route Collector 位于 172.16.255.1

## 配置 Route Collector

### Bird

对于 bird 用户，建议添加以下配置到 bird 配置文件中

```txt
protocol bgp collect_self {
        # 修改为你的ASN
        local as 4220084444;
        neighbor 172.16.255.1 as 4211110101;
        multihop;
        ipv4 {
                add paths tx;
                # 修改为你的 BGP Table
                table BGP_table;
                import none;
                # 如果你使用 protocol static 宣告网段无需修改
                # 如果你使用重分发，自行修改过滤规则
                export filter {
                        if source ~ [RTS_BGP,RTS_STATIC] then accept;
                };
        };
}
```

### ROS

Input 全拒绝，output 保持和其他 peer 一致即可
记得开 add path 和 multihop

### 原理

Bird 开动态BGP，接受所有人 peer，通过 peer 收发 addpath 的 ASPath，获得尽可能多的ASPath，再利用这些ASPath制图

```txt
ipv4 table collector_table;

protocol mrt {
        table collector_table;
        filename "/var/log/bird/%m-%d-%Y-%H-%M.mrt";
        period 60;
        always add path;
}

protocol bgp collector {
        source address 172.16.255.1;
        local as 4211110101;
        neighbor range 0.0.0.0/0 external;
        multihop;
        dynamic name "collect";
        ipv4 {
                add paths rx;
                table collector_table;
                import all;
                export none;
        };
}
```

mrt 数据解析,fork并修改自开源项目 go-mrt

https://github.com/BaiMeow/go-mrt

数据处理与展示写了一个 NetworkMonitor

https://github.com/BaiMeow/NetworkMonitor

欢迎 Star ⭐
