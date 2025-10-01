# rDNS

请先阅读 DNS 一章再阅读本章。

本文只介绍 IPv4 相关情况。

## 名词解释

### PTR 记录

> a domain name pointer
> 
> -- RFC1035 3.2.2. TYPE values

一个指向域名的指针

```plain
;; ANSWER SECTION:
woshiluo.dn11.          600     IN      PTR     hello.world.
```

### rDNS (Reverse DNS)

> A reverse DNS lookup is a DNS query for the domain name associated with a given IP address. This accomplishes the opposite of the more commonly used forward DNS lookup, in which the DNS system is queried to return an IP address.
> 
> -- [What is reverse DNS?](https://www.cloudflare.com/learning/dns/glossary/reverse-dns/)

从给定 IP 地址反查出对应的域名。某种程度上，是 A 记录的逆运算。

## rDNS 是怎么工作的？

> The Internet uses a special domain to support gateway location and
Internet address to host mapping.
>
> The domain begins at IN-ADDR.ARPA and has a substructure which follows
the Internet addressing structure.
> 
> -- RFC1035 3.5. IN-ADDR.ARPA domain

在同章节描述了所谓的 "substructure"，即具体的工作原理。下文以中文转述。

rDNS 使用 `in-addr.arpa.` 域来进行解析。

我们知道，IPv4 可以使用十进制点分法表示成 `a.b.c.d`，其中 a b c d 表示一个 8 位整数（即 0-255）。

那么 `a.in-addr.arpa` 即表示 `a.0.0.0/8` 的相关信息，
`b.a.in-addr.arpa` 即表示 `a.b.0.0/16` 的相关信息，以此类推。

对于 rDNS 记录，使用 PTR 记录来表示。

```plain
10.IN-ADDR.ARPA.           PTR MILNET-GW.ISI.EDU.
10.IN-ADDR.ARPA.           PTR GW.LCS.MIT.EDU.
18.IN-ADDR.ARPA.           PTR GW.LCS.MIT.EDU.
26.IN-ADDR.ARPA.           PTR MILNET-GW.ISI.EDU.
22.0.2.10.IN-ADDR.ARPA.    PTR MILNET-GW.ISI.EDU.
103.0.0.26.IN-ADDR.ARPA.   PTR MILNET-GW.ISI.EDU.
77.0.0.10.IN-ADDR.ARPA.    PTR GW.LCS.MIT.EDU.
4.0.10.18.IN-ADDR.ARPA.    PTR GW.LCS.MIT.EDU.
103.0.3.26.IN-ADDR.ARPA.   PTR A.ISI.EDU.
6.0.0.10.IN-ADDR.ARPA.     PTR MULTICS.MIT.EDU.
```

> Make sure your PTR and A records match.  For every IP address, there
> should be a matching PTR record in the in-addr.arpa domain. 
> 
> -- RFC1912 2.1 Inconsistent, Missing, or Bad Data

你应该确保 PTR 记录和 A 记录互相匹配。

## 如何查询 rDNS

显然你可以直接查询对应的 PTR 记录。

```bash
$ dig PTR 1.20.16.172.in-addr.arpa  
; <<>> DiG 9.20.13 <<>> PTR 1.20.16.172.in-addr.arpa
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 63999
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;1.20.16.172.in-addr.arpa.      IN      PTR

;; ANSWER SECTION:
1.20.16.172.in-addr.arpa. 587   IN      PTR     nas.node.woshiluo.dn11.

;; Query time: 0 msec
;; SERVER: 127.0.0.1#53(127.0.0.1) (UDP)
;; WHEN: Sun Sep 28 10:59:15 CST 2025
;; MSG SIZE  rcvd: 89
```

也可以使用 host 命令。

```bash
$ host 172.16.20.53
53.20.16.172.in-addr.arpa domain name pointer woshiluo.dn11.
```

使用 ping/traceroute/mtr 都会通过该方法来查询主机名，不过有可能会被其他东西覆盖结果（比如 hosts）。

## 如何在 DN11 中使用 rDNS

根据原理，我们要做的操作其实只有两个：

1. 将对应域委托给自己进行解析；
2. 添加对应的 PTR 记录。

下文假设你的 IP 为 `172.16.20.0/24`，权威 dns 为 `ns1.woshiluo.com`，请自行修改。

### 注册

首先，你应该在 [registry](https://github.com/dn-11/registry) 中注册自己 IP range 的 NS。

比如你申请了 `172.16.20.0/24` 段，那么你应该将 `20.16.172.in-addr.arpa` 委托到自己的权威服务器上：

```diff
diff --git a/as/4211111460.yml b/as/4211111460.yml
index 58395ef..52f5a2e 100644
--- a/as/4211111460.yml
+++ b/as/4211111460.yml
@@ -5,5 +5,7 @@ ip:
 domain:
   woshiluo.dn11:
     - ns1.woshiluo.dn11
+  20.16.172.in-addr.arpa:
+    - ns1.woshiluo.dn11
 ns:
   ns1.woshiluo.dn11:  172.16.20.53
```

### 添加解析

参照 DNS 一文，你需要添加对该 zone （20.16.172.in-addr.arpa）的解析，并通过 zonefile 添加 PTR 记录。

```shell
$ORIGIN 20.16.172.in-addr.arpa.
$TTL  60
@       IN  SOA ns1.woshiluo.dn11. hostmaster.woshiluo.dn11. 2025092717 60 60 604800 60
;
@       IN  NS    ns1.woshiluo.dn11.  ; announce the name server of current zone(domain) to be ns1.woshiluo.dn11.
1       IN  PTR   nas.node.woshiluo.dn11.
2       IN  PTR   laptop.node.woshiluo.dn11.
3       IN  PTR   dorm210.node.woshiluo.dn11.
10      IN  PTR   jp.node.woshiluo.dn11.
11      IN  PTR   hk.node.woshiluo.dn11.
12      IN  PTR   us.node.woshiluo.dn11.
53      IN  PTR   woshiluo.dn11.
```

### 同步他人 zoneinfo

在 registry 注册的 rDNS 委托信息会被自动汇总到 metadata 仓库下的 `dn11-rdns.zone` 文件，你可以查询该仓库的 README 文件以获取其在腾讯云上的镜像链接。

你可以参考 dns 一章中拉取同步一节的脚本来进行自动同步。
