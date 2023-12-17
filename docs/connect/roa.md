# ROA

## 什么是 ROA？

路由源授权（Route Origination Authorization）详细说明了哪个 AS 被授权公布哪些起源 IP 前缀。ROA 还可能包括前缀长度信息。

## 什么是 RPKI？

资源公钥基础设施（Resource Public Key Infrastructure）是一个确保路由基础设施安全的框架。是当前用于保护互联网码号资源分配真实性的技术。

## 什么是 RTR（RPKI-to-Router）？

在RPKI系统中，网络运营商通过生成ROA（Route Origin Authorization）来声明他们有权宣告某些IP地址。RTR协议的作用是将这些ROA信息实时传输给路由器。这样，路由器在处理BGP（边界网关协议）路由宣告时，可以根据这些信息来验证宣告的合法性。

它为路由器提供有关前缀起源的有效性信息：

VALID 有效：路由通告由 ROA 覆盖，且通告 AS 已通过验证
INVALID 无效：路由公告由 ROA 覆盖，且公告 AS 无效（可能被劫持）
UNKNOWN 未知：路由公告没有 ROA

你可以使用goRTR来搭建RTR服务器，我们采用另外一种方式，直接使用bird2

## 配置 ROA

在/etc/bird/bgp.conf中添加以下内容（同时删除原来的template bgp BGP_peers）：

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
