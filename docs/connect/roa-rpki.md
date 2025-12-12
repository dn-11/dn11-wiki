# ROA / RPKI

## 什么是 ROA？

路由源授权（Route Origination Authorization）详细说明了哪个 AS 被授权公布哪些起源 IP 前缀。ROA 还可能包括前缀长度信息。

DN11 的 ROA 信息可以在 [DN11 Registry](https://github.com/dn-11/registry) 查阅到

## 什么是 RPKI？

资源公钥基础设施（Resource Public Key Infrastructure）是一个确保路由基础设施安全的框架。是当前用于保护互联网码号资源分配真实性的技术。

## 什么是 RTR（RPKI-to-Router）？

在RPKI系统中，网络运营商通过生成ROA（Route Origin Authorization）来声明他们有权宣告某些IP地址。RTR协议的作用是将这些ROA信息实时传输给路由器。这样，路由器在处理BGP（边界网关协议）路由宣告时，可以根据这些信息来验证宣告的合法性。

它为路由器提供有关前缀起源的有效性信息：

VALID 有效：路由通告由 ROA 覆盖，且通告 AS 已通过验证
INVALID 无效：路由公告由 ROA 覆盖，且公告 AS 无效（可能被劫持）
UNKNOWN 未知：路由公告没有 ROA

你可以使用 stayRTR 来搭建 RTR 服务器，通过 RPKI 协议 检查 ROA 我们也可以采用另外一种方式，直接使用 bird2 从文件读取 roa 文件来检查地址有效性

## StayRTR

### RPKI 服务

单机搭建可以直接

```bash
stayrtr -checktime=false -bind=:323 -cache=https://metadata.dn11.baimeow.cn/dn11_roa_stayrtr.json
```

> - Q: 为什么需要 `-checktime=false`
> - A: 该选项会验证 RTR 文件的最后更新且应当于 24 小时内更新。DN11 的变更频率达不到也无需达到这个标准。

kubernetes 可以参考

```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stayrtr
  namespace: dn11rpki
spec:
  replicas: 1
  selector:
    matchLabels:
      app: stayrtr
  template:
    metadata:
      labels:
        app: stayrtr
    spec:
      containers:
        - name: stayrtr
          image: rpki/stayrtr:latest
          args:
            - '-checktime=false'
            - '-bind=:8083'
            - '-cache=https://metadata.dn11.baimeow.cn/dn11_roa_stayrtr.json'
          ports:
            - name: rpki-plain
              containerPort: 8083
              protocol: TCP
          resources:
            limits:
              cpu: 500m
              memory: 1Gi
            requests:
              cpu: 100m
              memory: 768Mi
          imagePullPolicy: Always
---
apiVersion: v1
kind: Service
metadata:
  name: dn11rpki-lb
  namespace: dn11rpki
spec:
  ports:
    - name: rpki-plain
      protocol: TCP
      port: 323
      targetPort: 8083
  selector:
    app: stayrtr
  type: LoadBalancer
```

### 路由器配置

#### BIRD2

在 BIRD 侧需要配置 protocol RPKI 来连接到 RPKI 服务器

```bird
/* DO NOT EDIT OR YOU KNOW WHAT YOU ARE DOING*/
/* DN11 Bird Configure */
/* RPKI */
/* Updated At 20250624 */

roa4 table r4;
roa6 table r6;

protocol rpki DN11_RPKI {
        debug all;

        roa4 { table r4; };
        roa6 { table r6; };

        remote DN11_RPKI_SERVER port 323;

        retry keep 5;
        refresh keep 30;
        expire 600;
}

function dn11_check_rpki(){
    if (roa_check(r4, net, bgp_path.last) = ROA_INVALID) then {
        print "[DN11]Ignore RPKI invalid ", net, " for ASN ", bgp_path.last;
        reject;
    }
}
```

请替换 DN11_RPKI_SERVER 和端口号，RPKI 协议默认端口为 323，以具体监听端口为准

#### RouterOS

首先请在 routing - RPKI 新建一个 RPKI 服务器给他起名为 dn11 并填写您的 RPKI 服务器 IP 和端口。

随后请在 routing - filters 中您需要添加 RPKI 的 filter（一般为您的 ebgp input filter）中较前的位置添加 RPKI 检查配置

```
if ( protocol bgp ) { rpki-verify dn11; if (not rpki valid) { reject }}
```

您可以在 ip - route 里校验 RPKI 检查结果。

## Bird2 ROA

在`/etc/bird/bgp.conf`中添加以下内容（同时删除原来的`template bgp BGP_peers`）：

```bird
roa4 table dn11_roa4;
protocol static DN11_ROA4 {
    roa4 { table dn11_roa4; };
    include "/etc/bird/dn11_roa_bird2.conf";
}
template bgp BGP_peers {
    local 172.16.3.254 as 4211112243;
    hold time 60;
    keepalive time 20;
    ipv4 {
        table BGP_table;
        import filter{
            if roa_check(dn11_roa4, net, bgp_path.last) !~ [ROA_VALID, ROA_UNKNOWN] then {
                print "[DN11] ROA check failed for ", net, " ASN ", bgp_path.last;
                reject;
            }
            accept;
        };
        export filter {
            if source ~ [RTS_STATIC, RTS_BGP] then accept;
            reject;
        };
    };
}
```

然后从registry下载roa文件：

```bash
nano /root/update_roa.sh
```

```bash
#!/bin/sh
FILE_URL="https://metadata.dn11.baimeow.cn/dn11_roa_bird2.conf"
DEST_DIR="/etc/bird"
DEST_FILE="${DEST_DIR}/dn11_roa_bird2.conf"
curl -sS -o "${DEST_FILE}" "${FILE_URL}" || {
    echo "Failed to download dn11_roa_bird2"
    exit 1
}
echo "File downloaded and saved to ${DEST_FILE}"
```

crontab -e 添加以下内容：

```bash
5 3 * * * /root/update_roa.sh
```

`5 3 * * *` 是每天凌晨3点5分执行一次，可以自行修改。

## RPKI Over SSH

### 创建 SSH Key

```bash
ssh-keygen
```

该命令是可交互的，请记得修改储存的位置。

### StayRTR 配置

```bash
stayrtr -checktime=false -cache=https://metadata.dn11.baimeow.cn/dn11_roa_stayrtr.json -ssh.bind :8282 -ssh.key /somepath/private.pem -ssh.method.key=true -ssh.auth.key.bypass=true -ssh.auth.user rpki -bind ""
```

这里给出在和普通配置不同部分的解释：

- `-ssh.bind :8282` 指定 SSH 的监听端口为 8282。
- `-ssh.key /somepath/private.pem` 指定 SSH 的私钥。
- `-ssh.method.key=true` 允许通过密钥验证连接。
- `-ssh.auth.key.bypass=true` 允许任意 SSH Key 链接。
- `-ssh.auth.user rpki` 指定 SSH 的用户为 rpki。
- `-bind ""` 不监听普通 RTR 的端口。

### Bird 配置

对应的 bird 配置片段：

```
roa4 table r4;

protocol rpki DN11_RPKI {
        roa4 { table r4; };

        remote x.x.x.x port 8282;

        retry keep 1;
        refresh keep 30;
        expire 600;

        transport ssh {
                user "rpki";
                bird private key "/etc/bird.d/private.pem";
                remote public key "/etc/bird.d/rpki_public.pem";
        };
}
```

较普通配置只有几行修改。

其中 `x.x.x.x` 为 stayrtr 监听的 IP 地址。

bird 会要求你提供自己的 private key （第 14 行）和对端的 public key（第 15 行）。

需要指出的是，此处的 public key 文件格式实际上是 `.ssh/authorized_keys` 的格式，即列出对端地址和其公钥指纹，如：

```plain
[172.16.20.1]:8282 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHA0ySnKyMp69ia5dTG2gCnexgzLauLl2hLdeifKkGNM
```

### Q&A

- Q: bird 持续无法建立连接，且 StayRTR 的日志中有类似于 `ssh: disconnect, reason 11: Bye Bye` 的输出。
- A: 考虑密钥（公钥和私钥）的权限（能否被 bird 读取？）和密钥格式问题。
