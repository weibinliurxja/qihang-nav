## Fly.io

**一句话结论**：2026 年 Fly.io 对新用户已无免费层（官方明确写「There is no "free account/free tier" on Fly.io」），只剩 2 VM 小时 / 7 天的免费试用，且所有组织都必须绑定信用卡，纯免费长期部署不可行。

- **免费额度（具体数字）**
  - **新用户（2024-10-07 之后注册）：无任何 permanent free allowance。** 官方 Cost Management 文档原文：**"There is no 'free account/free tier' on Fly.io."** 唯一入口是 Free Trial。
  - **Legacy free allowance（仅限 2024-10-07 之前已购买 Hobby/Launch/Scale 的老组织，官方仍继续履行，但不给新用户）**：
    - 最多 3 台 `shared-cpu-1x` 256MB VM
    - 3GB persistent volume storage（总量）
    - 出站流量：100GB（北美 & 欧洲）、30GB（亚太/大洋洲/南美）、30GB（非洲 & 印度）
  - **Volume 存储无免费额度**：$0.15 / GB / 月，按 provisioned 容量计费，与是否挂载、机器是否运行无关。
  - **Volume snapshot 有免费额度**：$0.08 / GB / 月，**每月前 10GB 免费**（2026-01-01 起开始收费，首张账单出现在 2026-02）。
  - **Managed SSL 证书**：单主机名 $0.10/月，**每个组织前 10 张单主机名证书免费**；通配符证书 $1/月。
  - **入站流量免费**；每个 app 附赠 1 个 shared IPv4 + 不限量 Anycast IPv6；专用 IPv4 为 $2/月。
  - 参考价（`sjc`/`iad` 等基准区）：`shared-cpu-1x` 256MB = $0.0027/小时 ≈ $1.94/月；`shared-cpu-1x` 1GB ≈ $2.32/月（官方 cost-management 文案）。
  - 停机机器仍收费：按 rootfs 计费，$0.15/GB/月。

- **持久化存储**：有，产品名 **Fly Volumes**。本地 NVMe 上的一块盘，绑定**单个 app + 单个 region + 单台 server**，与 Machine 是 1:1 挂载关系（一台 Machine 同时只能挂一个 volume）。创建即加密（encryption-at-rest，默认开启，可 `--no-encryption` 关闭）。默认 1GB，最大 500GB，只能扩不能缩。**不自动复制**，官方明确警告单 volume 有硬件故障丢数据风险，建议每个 app 至少 2 个 volume 并自行做数据复制；官方自动每日快照默认保留 5 天（可设 1–60 天），但文档强调「snapshots shouldn't be your primary backup method」。

- **数据存活（重启/休眠/不活跃）**：**Volume 上的数据在 Machine 停止/挂起/重启/重新部署后依然保留**，volume 独立于 Machine 生命周期存在（Machine 销毁后 volume 可继续存在，成为 unattached volume）。但注意：**Machine 的 root filesystem 是 ephemeral**（临时盘，最高 2000 IOPS / 8MiB/s），重启或部署即重建，不能放持久数据。另外 volume 是软的，destroy 后进入 `pending_destroy` 状态 24 小时后才真正删除（迁移场景为 1 周），期间可恢复。自动停机（autostop）只影响 Machine 运行状态，不影响 volume 数据。

- **是否免费到永远**：**否**。依据：官方 Cost Management 文档明确否认存在 free tier；Discontinued Plans 页写明「Fly.io no longer offers plans to new customers」，legacy free allowance 只对 2024-10-07 前的存量组织继续履行，「If you're not on a legacy plan, see Pricing and Billing instead」。新组织只能走 Pay As You Go（按量付费），试用期结束必须绑卡或充值才能继续跑。

- **试用额度**：**Free Trial = 2 小时 VM 运行时长 或 7 天访问权，先到先得**（官方原文："2 hours of machine runtime or 7 days of access, whichever comes first"）。试用期内包含：
  - 2 总 VM 小时（所有 machine 共享；**试用机默认运行 5 分钟后自动停止**）
  - 最多 10 台 machine
  - 20GB volume 存储
  - 每台 machine 最多 2 vCPU / 4GB 内存
  - **不含**专用 IPv4、不含 performance-optimized vCPU
  - 任一额度先用完即视为 trial exhausted，app 会被停掉，直到绑定支付方式。**绑定信用卡即终结试用**，此后按量计费。

- **是否需要信用卡**：**是（对新用户而言实质上必须）**。依据：Pricing 页原文「All organizations (except for Linked Organizations) require a credit card on file.」；Billing 页原文「We require an active, valid credit card on file for most Fly.io accounts」。官方给了一个无卡替代方案：若确实没有信用卡，可以**购买 credits 充值**（dashboard 内，**最低充值 $25**），用量从余额扣；预付费卡（prepaid card）不能作为默认/保存的支付方式，但可用于充值。注册后会有一笔通常低于 US$10 的预授权（pre-auth）验证，会立即取消，银行侧可能显示最多 10 个工作日。**结论：想长期跑必须付出 $25 级别的资金门槛 + 绑卡。**

- **数据存放地区**：官方 Regions 页共列出 17 个 region（截至查证日）：`ams` 阿姆斯特丹、`arn` 斯德哥尔摩、`cdg` 巴黎、`dfw` 达拉斯、`ewr` Secaucus、`fra` 法兰克福、`gru` 圣保罗、`iad` Ashburn、`jnb` 约翰内斯堡、`lax` 洛杉矶、`lhr` 伦敦、`nrt` 东京、`ord` 芝加哥、`sin` 新加坡、`sjc` 圣何塞、`syd` 悉尼、`yyz` 多伦多。**Volume 与 Machine 绑定创建时的 region**，数据留在该机房的物理 NVMe 上。**注意：官方 region 列表中没有 `hkg`（香港）**，多个历史来源提到的香港节点已不在当前官方列表中；距离中国大陆最近的是 `nrt`（东京）和 `sin`（新加坡）。官方未提供任何中国大陆 region。

- **中国大陆可达性**：**本机实测可用（单点、仅控制面 + 一个示例 app，2026-10-01）**。本机出口为**中国大陆广州、中国电信 AS4134（CHINANET，IP 113.100.124.156）**，实测：
  - `https://fly.io/` → HTTP 200，TTFB 约 0.97s，总耗时约 1.58s
  - `https://docs.fly.io/` → HTTP 200，TTFB 约 1.59s，总耗时约 3.56s
  - `ping fly.io` → 3/3 收包，RTT min/avg/max = 192.3 / 198.2 / 203.0 ms
  - 示例 app 运行面 `https://autoscale-to-zero-demo.fly.dev/` → HTTP 200，TTFB 约 6.63s（很可能包含从 stopped 状态冷启动的时间，不代表稳态延迟）
  - 说明：以上是**单一广州电信出口的一次性实测**，未覆盖移动/联通线路，也未做多时段重复测试；官方文档中**没有任何关于中国大陆访问质量或网络限制的说明**，因此除上述实测外**无可靠证据**。"官网可打开"不等于"部署后的 app 在国内可用"，且官方无中国大陆节点，实际服务延迟取决于所选的 `nrt`/`sin` 等区域。

- **部署形态**：**容器（Docker image）为主的 PaaS，底层是 Firecracker microVM**。核心对象是 **Fly Machines**（可秒级启停的 microVM）与 **Fly Apps**；`flyctl`/`fly launch` 从 Dockerfile 或 buildpack 构建镜像部署，也可直接用 Machines API 编程式创建 Machine。支持 `auto_stop_machines`（`"off"` / `"stop"` / `"suspend"`）与 `auto_start_machines` 做 scale-to-zero，`fly launch` 生成的默认配置即为 `auto_stop_machines = "stop"`、`auto_start_machines = true`、`min_machines_running = 0`。另有 Fly Kubernetes（FKS，$75/月/集群）与 Sprites 等产品。

- **自定义域名与备案**：**自定义域名支持**——官方文档说明用 Let's Encrypt 签发证书，单主机名证书 $0.10/月、通配符 $1/月，每个组织前 10 张单主机名证书免费；每 app 自带 shared IPv4 与不限量 Anycast IPv6。**但没有任何中国大陆 ICP 备案相关能力**：官方 region 列表中无中国大陆节点，官方文档中也**未找到任何关于 ICP 备案/大陆域名备案的说明**，因此「备案」一项**无官方来源支持**；若把域名指向 Fly.io 的海外节点，在中国大陆不构成需要备案的境内接入，但也无法获得大陆加速。

- **2025–2026 近期变更**：
  - **2024-10-07**：官方公告《We're making pricing simpler!》取消 Launch/Scale 等 plans，全面转为 Pay As You Go；存量老用户保持原有 free allowance，新用户不再有。同日 Discontinued Plans 页声明不再向新客户提供 plans。官方博客/论坛由 Fly.io 员工发布并置顶于 Fresh Produce 板块。
  - **2025-10-15**：官方社区公告**将从 2026-01-01 起对 volume snapshot 收费**：$0.08/GB/月，每月前 10GB 免费，首张含费账单出现在 2026-02；并说明快照按块设备增量去重后计费、不可手动删除、可把保留期调到 1 天或直接关闭自动快照。据其说法 98% 客户无额外费用。
  - **文档站迁移**：`fly.io/docs/*` 现 301 跳转到新域名 **`docs.fly.io`**（本次抓取实际落在 `docs.fly.io`）。
  - 2026 年 pricing/营销页仍维持「Start for free, pay as you grow」措辞，但正文只提供 per-second 计费与试用，**未见重新引入永久免费层的迹象**。

- **对本需求的结论**（用户：中国大陆、无 VPS、要部署小型导航应用、需要持久化、只要免费）：**不推荐，基本不满足「只要免费」。** 理由：（1）2026 年新用户已无永久免费层，官方白纸黑字否认 free tier，唯一免费入口是 2 VM 小时/7 天的试用，而试用机还被限制为运行 5 分钟后自动停止，做不了长期在线的导航站；（2）试用结束必须绑信用卡或充值至少 $25 才能继续，直接与「只要免费」冲突；（3）持久化要靠 Fly Volumes，而 volume 没有免费额度（$0.15/GB/月），且不绑卡连 volume 都挂不上；（4）官方无香港/大陆区域，最近只有 `nrt`、`sin`，国内访问延迟与实际体验无法用官方证据保证（本次广州电信实测官网可开、ping 约 198ms，属单点证据）。**若一定要用 Fly.io，最低可行性方案是绑定信用卡后跑 1 台 `shared-cpu-1x` 256MB + 1GB volume 并开启 autostop**，官方给出的量级约为「auto-stop 时可能低于 $1/月，常开约 $2.32/月」，但**这不是免费**。若硬性要求零成本，应转向提供永久免费层的平台。

- **置信度**：high
- **来源（查证日期 2026-10-01）**
  - https://docs.fly.io/about/pricing/ — 计算与存储价格、`$0.15/GB/月` volume、`$0.15/GB/月` 停机 rootfs、volume snapshot `$0.08/GB/月 + 每月前 10GB 免费`（2026-01-01 起）、SSL 证书价格与「每组织前 10 张单主机名证书免费」、出站流量分档、专用 IPv4 $2/月、以及「All organizations (except for Linked Organizations) require a credit card on file」。
  - https://docs.fly.io/about/cost-management/ — 决定性证据：「**There is no "free account/free tier" on Fly.io.** We do have a Free Trial program」；以及「Free allowances don't cap your bill」「volumes don't stop billing when your machines do」、$1/月与 $2.32/月量级示例。
  - https://docs.fly.io/about/free-trial/ — 试用额度：2 VM 小时或 7 天；10 台 machine 上限；20GB volume 存储；2 vCPU / 4GB per machine；试用机 5 分钟后自动停止；绑卡即结束试用。
  - https://docs.fly.io/about/discontinued-plans/ — legacy free allowance 明细（3× shared-cpu-1x 256MB、3GB volume、100/30/30 GB 出站），以及「Fly.io no longer offers plans to new customers」与 2024-10-07 时间点。
  - https://docs.fly.io/about/billing/ — 信用卡要求原文、无卡可充值（最低 $25）、prepaid card 不可作为默认支付方式、预授权说明、volume 计费与 `pending_destroy` 不收费。
  - https://docs.fly.io/reference/regions/ — 官方 17 个 region 列表，**其中无 `hkg`**。
  - https://docs.fly.io/volumes/overview/ — volume 为本地 NVMe、属于单 app/单 region/单机、1:1 挂载、默认 1GB 最大 500GB、默认加密、无自动复制、快照默认保留 5 天且不应作为主备份、rootfs 为 ephemeral（2000 IOPS / 8MiB/s）。
  - https://docs.fly.io/volumes/volume-states/ — volume `pending_destroy` 24 小时（迁移场景 1 周）后永久删除。
  - https://docs.fly.io/launch/autostop-autostart/ — `auto_stop_machines` / `auto_start_machines` / `min_machines_running` 语义、`fly launch` 默认值（stop / true / 0）、停止状态不计 CPU/RAM 费用。
  - https://fly.io/pricing/ — 面向新用户的「Start for free, pay as you grow」措辞与 per-second 计费、$15,000 startup credit、Support/Compliance 单独售卖；正文未见永久免费层。
  - https://community.fly.io/t/were-making-pricing-simpler/22168 — Fly.io 员工 2024-10-07 官方公告，取消 plans 转 Pay As You Go，存量用户 free allowance 不变。
  - https://community.fly.io/t/we-are-going-to-start-charging-for-volume-snapshots-from-january-2026/26202 — Fly.io 员工 2025-10-15 官方公告，快照 2026-01-01 起计费、$0.08/GB/月、每月前 10GB 免费、可关闭自动快照。
  - 本机实测（2026-10-01，中国大陆广州、中国电信 AS4134，出口 IP 113.100.124.156）：`fly.io` HTTP 200 / TTFB 0.97s；`docs.fly.io` HTTP 200 / TTFB 1.59s；`ping fly.io` avg 198.2ms；`autoscale-to-zero-demo.fly.dev` HTTP 200 / TTFB 6.63s — 大陆可达性的直接实测证据（单点）。
