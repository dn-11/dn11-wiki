# Large Community

::: tip
如果你在任何时候发现看不懂一段内容，请翻阅文末[前置知识](#前置知识)章节
:::

## 基础标准

### 标准内容

::: warning IMPORTANT
DN11 Large Community 基础标准**推荐**所有成员实现，但**强制**所有成员不能占用相关资源。
:::

如果您完全不知道什么是 Large Community，您可以简单地将 Large Community 视为一个可以随着 BGP 路由传递的 uint32 三元组标签列表，形如 `[(1,2,3),(4,5,6)]`。

:::details Large Community 为什么是 Large？
确实有一个不 Large 的 Community，就叫 Community 他是一个二元组，这就是 Large Community 的 Large 所在

Community 诞生于互联网早期，过于古早笔者也没动力探究他的前世今生，显然我们各种带宽资源都比较充裕，完全可以选择更灵活的 Large Community。

在 Large Community 和 Community 之间，这个世界上还有一个 Extended Community, 他虽然也是三元组，但是实际上只占用了 64bit 的空间，这是因为他每个元素长度不同，并非都是 32bit，这使得 Extended Community 难以使用的同时也完全不适配 DN11 的 4B(byte) ASN。
:::

我们将利用 Large Community 为路由附加额外的信息用于选路

| Large Community     | 用途（Function）         | 类型                    |
| ------------------- | ------------------------ | ----------------------- |
| (ASN,11000,*)       | 路由广播地区：省级行政区 | Informational Community |
| (ASN,11001,*)       | 路由广播地区：国内地区   | Informational Community |
| (ASN,11002,*)       | 路由广播地区：国家地区   | Informational Community |
| (ASN,11003,*)       | 路由广播地区：国际地区   | Informational Community |
| (ASN,11004-11009,*) | 保留                     | -                       |
| (ASN,11010,*)       | 路径跨区类型/优先级      | Control Community       |
| (ASN,11011-11999,*) | 保留                     | -                       |

对于功能 11000-11003 参数值 11111 作为永不匹配值使用。

通过 iBGP 或者 eBGP 接收路由时，应根据 11000，11001，11002，11003 四个 Large Community 计算 11010，如果 11010 已经设置，那么优先级不应该高于这个值。计算完成后应设置 11000，11001，11002，11003 四个 Large Community。如果这四个 Large Community 某些值已经被设置且与接收时想要设置的值不同，则将值设置为 11111 表示永不匹配。

通过 eBGP 或者 iBGP 导出路由时应删除本自治域的 11010，有需要可以对目标自治域设置 11010。

如果您使用 RR，需要注意的是 RR 应全面开启 add paths tx 将选路权利交给所有路由由他们自己判别。

::: warning
开启 add paths 的同时如果没有完全应用 DN11 Large Community 基础标准全套规则，可能会带来难以预知的环路风险，请在最后做此操作。
:::

对于 AS 内部天然的地理绕路，暂时没有好的办法检测 IGP 内部路径的变化并修改 Large Community ，建议您在从 iBGP 接收路由时手动修改 11010 标记为某类型的跨区。

::: details 什么是 AS 内部天然的地理绕路
以 `A` —— `B` —— `C` 为例，如果 `A` `C` 在同一个地区，但是 `B` 在异地，此时 AS 内部天然形成了一个地理位置绕路，即`A`所有要去往 `C` 的流量一定会途径 `B`，从而绕到异地。在 DN11 Large Community 基础标准中，您可以发现您的路由信息被无修改地从接收路由器传递到了 AS 内部的其他所有路由器，对于实际 AS 内部路径的绕路路由本身全无感知，此时路由本身的 11010 Large Community 已经不能反映实际链路状况了，事实上我们也尝试过改善这个问题，但最终还是推荐您手动调整这些绕路节点的选路 Large Community。
:::

### 实现示例

实现代码量较大，不适合直接贴在文档中，请参见 Github。

- [BIRD实现](https://github.com/dn-11/scripts/tree/master/bird)
- [RouterOS实现](https://github.com/dn-11/scripts/tree/master/mikrotik/lc)

BIRD 实现样例同时添加了其他 DN11 推荐配置（笔者注：OSPF 重分发不是，只是一种选择），其中 lc.conf 实现了 DN11 Large Community 基础标准 filter，ebgp.conf 和 ibgp.conf 应用了这套 filter 实现了默认 bgp protocol，而 lc.conf 需要的一些常量定义在 bird.conf 中。

RouterOS 实现相关已经编写了对应的 README。

### 标准代码参考

#### 省级行政区码 （仅中国大陆地区，不含港澳台）

用于 `11000`，目前仅中国大陆地区需要按要求设置，其他应设置为 11111

参见 <https://zh.wikipedia.org/wiki/省级行政区#省级行政区列表>

::: warning IMPORTANT
用于表示省级行政区的仅仅取前两位，如浙江省级行政区码为 `33` 而非 `330000`。
:::

#### 国内地区码（仅中国大陆地区，不含港澳台）

用于 `11001`，目前仅中国大陆地区需要按要求设置，其他应设置为 11111

下列划分虽然用了大陆地区地理区划的命名，但实际划分并非完全按照

- 41: 北京、天津、河北、山东、山西、内蒙古
- 42: 上海、江苏、浙江、安徽、福建、江西
- 43: 广东、广西、海南
- 44: 河南、湖北、湖南
- 45: 陕西、甘肃、宁夏、青海
- 46: 重庆、四川、贵州、云南
- 47: 辽宁省、吉林省、黑龙江省
- 48: 新疆
- 49: 西藏

#### 国家地区码

用于 `11002`

参见 [ISO3166](https://zh.wikipedia.org/wiki/ISO_3166-1%E6%95%B0%E5%AD%97%E4%BB%A3%E7%A0%81#%E6%AD%A3%E5%BC%8F%E5%88%86%E9%85%8D%E4%BB%A3%E7%A0%81)

#### 国际地区码

用于 `11003`

- 41: Europe
- 42: North America-East
- 43: North America-Central
- 44: North America-West
- 45: Central America
- 46: South America-Central
- 47: South America-West
- 48: Africa-N (above Sahara)
- 49: Africa-S (below Sahara)
- 50: Asia-S (BD, IN, PK)
- 51: Asia-SE (ID, MY, PH, SG, TH)
- 52: Asia-E (CN, HK, JP, KR, TW)
- 53: Pacific&Oceania (AU, FJ, NZ)
- 54: Antarctica
- 55: Asia-N (RU)
- 56: Asia-W (IR, TR, UAE)
- 57: Central Asia (AF, KZ, UZ)

#### 路径跨区类型

用于 `11010`

| parameter | 含义       |
| --------- | ---------- |
| 100       | 无跨地区   |
| 200       | 跨省       |
| 300       | 跨地区     |
| 400       | 跨国       |
| 500       | 跨世界区域 |

所有自治域应接收并更新该值，定义外的值无意义。

## 设计思路

### 前置知识

#### BGP 选路优先级

我们以 BIRD2 为例，实际上不同路由软硬件实现略有区别，实践上还是要因地制宜一下。

- Prefer route with the highest Local Preference attribute.

Local Preference 是优先级最高的一条了，需要手动在filter里设置，默认值为100，我们后续主要会通过修改 local_pref 实现选路。

- Prefer route with the shortest AS path.

最短 AS Path 老生常谈了

- Prefer IGP origin over EGP and EGP origin over incomplete.
  
还请你忘了这条，DN11 一眼望过去全都是 IGP，在 BIRD2 里通过 static protocol 声明再导入到 BGP 表的 route 似乎确实全部被标记为 IGP，我还想着 incomplete 的事情，BIRD2 并不觉得他 incomplete。

- Prefer the lowest value of the Multiple Exit Discriminator.

简称 MED，看起来是自己的 AS 内一个节点 peer 了对方两个的时候可以选选，感觉用途比较狭窄

- Prefer routes received via eBGP over ones received via iBGP.
  
eBGP 优先与 iBGP，这是我们的 Hot Potato 原则，事实上从贪心的视角来看，直接到下个 AS 确实比内部绕一下再过去快一点，减少自己 AS 内的流量，如果你愿意承担更多流量我们也可以在 local_pref 魔改出 Cold Potato。

- Prefer routes with lower internal distance to a boundary router.
  
最近的边缘路由优先，如果你在用 OSPF 的话就是依据 cost 就近路由。

- Prefer the route with the lowest value of router ID of the advertising router.

实在选的选无可选了，router ID 排序

#### BGP Large Community

参考 [RFC8092](https://datatracker.ietf.org/doc/html/rfc8092)

简单来说，BGP Large Community 是一个顺序无关的不重复的三元组列表，用于标记一条路由的一些信息，形如

```python
[(10001,1,1),(10001,2,1)]
```

三元组中的每个数组的类型均为 uint32，一般来说三元组中第一个元素是 ASN 编号，后面两个数字的含义则由该 ASN 的所有者定义，并不存在一个统一的定义。但在 DN11 中我们后续可以去占用一小段，并对这一小段给出一个推荐标准。

虽然 BGP Large Community 在提出之初没有定义后面的两个元素的用途，但是在实践中，可以想象到会产生一些通用性较好的实践案例，可以一并学习一下，参考 [RFC8195](https://datatracker.ietf.org/doc/html/rfc8195)

在本文中对于后两个元素的定义与称呼与 RFC8195 保持一致，第二个元素是功能标识符（function），第三个元素是参数标识符（parameter）

在实践中，Large Community 的用途大体上可以分为两类，分别是 Informational Communities 和 Action Communities（或者说 Control Communities）。这两种 Community 顾名思义，Informational Communities 用于给其他自治域提供一些信息，并不会直接影响选路，但可以被其他自治域用于选路；而 Control Communities 一般来说由某个自治域定义，并且会直接到影响选路。

例如目前 DN11 内 Potat0 Network 实际上已经提供了一些 Control Communities，可以控制 Potat0 Network 到您的自治域的优先出口位置，主要用于避免一些海外绕路。

### 现状

可以想象到，对于 DN11 而言，大伙应该是小聚集在一些大城市中，我们面临的主要问题是跨地区和跨运营商，其中由于 DN11 中 WireGuard 隧道居多，可能需要细化选路到跨省以尽可能避免 QoS。

我们可以先取出 Large Community 中一部分定义为 DN11 占用，并在这一部分的中规定一个 DN11 基础标准，推荐所有人以同样的方式实现。

目前，DN11 范围内大部分路由的选路策略都是由 AS-PATH 的长度决定的，长度越短越优先。我们需要做的是通过 Large Community 提供的信息，修改某些路由的 Local Preference 以实现对选路优先级的改动。由于 Local Preference 的优先级高于 AS-PATH，这样一来，问题实际上就演变成了寻找一个在多数情况都比 AS-PATH 优先级要高的选路原则。结合互联网上的案例，不难想到地理位置可以是这个选路原则。

### 地理位置选路

当一条 BGP 路由被 Informational Community 标记为在一个区域广播后，想办法去靠近这个区域是一个非常自然和正确的思路，DN11 参照 MoeQing Network 和 Potat0 Network 并对他们的 Large Community 做了一些本土化改造以及细化来初步实现基于地理位置的选路。

DN11 Large Community 基础标准将地区做了分级划分，可以分为四级，分别为省级行政区、国内地区、国家、国际地区，其中前两项在中国大陆以外的区域无效，具体划分方式见附录。你可能会觉得，有点多，确实挺多的，但是 DN11 有他的特点，不同于 DN42 不在乎选路，也不同于互联网的树状上下游，实际上在 DN11 做选路相当于在无序图里优选路径，不考虑规模和需求的情况下，实际难度是大于互联网的，DN11 需要更多的 Large Community 支持选路我认为也合理。

四个等级的地区划分实际上对应着五种大的优先级，这个优先级在每次 import 后都会更新，一般通过地理位置信息计算，也可以直接通过 Control Community 指定该路由对某一个自治域的优先级。

### 链路质量选路

除了地区划分外上面提到的跨运营商带来的链路质量下降也不可忽视，本来还再考虑加一个与运营商相关的 Large Community 但仔细一想，跨运营商带来的损耗一定会大于多走几个自治域吗？我觉得这是没道理的，强硬且路径依赖地再推一个 Large Community 出来不一定合理。对于这部分需求，实际上用 prepend 更为合理，prepend 是一种在 AS-PATH 中重复添加某个 ASN 来延长 AS-PATH 从而降低某条路由优先级的方法。

对于真的有需求通过 Local Preference 来降低优先级的，可以直接改动对应的 Control Community。
