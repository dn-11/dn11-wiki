# 申请注册

为了保证 DN11 的资源的可用性，我们需要对资源进行统一管理。DN11 的 ASN、网段等资源统一在 [dn11-registry](https://github.com/dn-11/registry) 进行登记和管理。在接入 DN11 前，你需要提交一个 Pull Request 用于向 DN11 请求分配网络资源。

## 选择一个 ASN

ASN 是一个 uint32 数字，但我们规定 4211110000-4211119999 这个范围是 DN11 目前开发申请的 ASN 范围。

你可以在 [DN11 信息表](https://github.com/dn-11/metadata/blob/main/README.md) 查看到目前所有已经被申请的 ASN，选择一个在开放申请范围内且不重复的 ASN 即可。

## 选择一个网段

对于新成员，DN11 **强制** 使用 [DN11 信息表](https://github.com/dn-11/metadata/blob/main/README.md) 中展示的“下一个建议使用的网段”。

## 成员注册

请在 [dn11-registry](https://github.com/dn-11/registry) 的 `as` 目录中创建一个 YAML 文件，文件名为 `<your-asn>.yml`，然后以 [`example.minimal.yml` (推荐的最小配置)](https://github.com/dn-11/registry/blob/main/as/example.minimal.yml) 为模板填写。填写完成后提交一个 PR，根据 Checker 回复修改您的配置，然后等待管理员合并即可。

- `ASN`

  填写在上文时选择的 ASN。

- `name`

  您的名字 / ID。

- `contact`

  联系方式，如 QQ / Email，

  如使用 QQ 号等纯数字，请使用引号包裹，确保该项的值为字符串。

- `ip`

  填写在上文时找到的“下一个建议使用的网段”。
