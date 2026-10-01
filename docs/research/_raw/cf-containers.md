## Cloudflare Containers

**一句话结论**：Cloudflare Containers 已于 2026-04-13 正式 GA，但仅限 Workers Paid 计划（$5 USD/月起），Free 计划完全不含额度，因此不符合「只要免费」的要求。

- **免费额度（具体数字）**
  - Free 计划：Containers 的 Memory / CPU / Disk 配额均为 **N/A**，即免费计划不含任何容器额度（官方 pricing 表逐格写明 N/A）。
  - 官方 Overview 页明确标注 **"Available on Workers Paid plan"**（仅 Workers Paid 可用）。
  - Workers Paid（$5 USD/月/账号起）**包含**的月度额度：Memory **25 GiB-hours/月**、CPU **375 vCPU-minutes/月**、Disk **200 GB-hours/月**。
  - 超额单价：Memory **+$0.0000025 / GiB-second**；CPU **+$0.000020 / vCPU-second**；Disk **+$0.00000007 / GB-second**。
  - 计费口径：按容器**活跃运行的每 10ms** 计费；从「请求发送到容器」或「手动启动」开始计费，容器进入 sleep 后停止计费（可 scale to zero）。Memory 与 Disk 按所选实例类型的**预置（provisioned）资源**计费，CPU 仅按**实际活跃用量（active usage）**计费（2025-11-21 起变更）。
  - 除容器本身外，还**另行计费** Worker 请求与每个容器对应的 Durable Object 用量。
  - 出网流量（Egress）单独计价：北美与欧洲 $0.025/GB（含 1 TB/月）；大洋洲、韩国、台湾 $0.05/GB（含 500 GB/月）；其他地区 $0.04/GB（含 500 GB/月）。
  - 实例类型（决定预置资源与费用）：lite = 1/16 vCPU + 256 MiB + 2 GB 磁盘；basic = 1/4 vCPU + 1 GiB + 4 GB；standard-1 = 1/2 vCPU + 4 GiB + 8 GB；standard-2 = 1 vCPU + 6 GiB + 12 GB；standard-3 = 2 vCPU + 8 GiB + 16 GB；standard-4 = 4 vCPU + 12 GiB + 20 GB。
  - 账号级上限：并发 Memory 6 TiB、并发 vCPU 1,500、并发 Disk 30 TB、账号镜像存储总量 50 GB。

- **持久化存储**：容器**本地磁盘默认全部是临时的（ephemeral）**，不是持久化存储。官方给出两条持久化路径：
  - **快照（Snapshots）**：仅 `durable_object` scheduling policy 支持，可对运行中的容器做**全文件系统**时点快照（`snapshotContainer()`），之后用 `ctx.container.start({ containerSnapshot })` 恢复；快照**不可变**，恢复到新镜像不通用，最大 **20 GB**，**保留期 30 天**（每次 restore 刷新 30 天 TTL），且**不能自定义 TTL**。注意快照只含文件系统，不含内存与运行进程。
  - **R2 + FUSE 挂载**：官方示例用 tigrisfs 把 R2 bucket 挂载为文件系统以持久化磁盘；官方明确警告对象存储不是 POSIX 文件系统、也非本地盘，**不要期待原生 SSD 级性能**。R2 自身有独立免费额度：**10 GB-month 存储、100 万次 Class A、1000 万次 Class B 操作/月**，出网免费。
  - 另可用 Durable Object 自身存储保存状态（与容器文件系统是两回事）。

- **数据存活（重启/休眠/不活跃）**：不活跃即可能丢盘。官方 FAQ 原文："All disk is ephemeral by default. When a Container instance goes to sleep, the next time it starts, it uses a fresh disk from the container image."
  - 休眠机制：`Container` class 的 `sleepAfter` **默认 10 分钟**（`onActivityExpired()` 默认调用 `stop()`）；Durable Object Container API 用 `setInactivityTimeout()` 自行设置。官方**不设固定最长运行时长**。
  - 平台侧强制停止（含宿主机重启、宿主迁移、镜像 rollout）：先发 **SIGTERM**，最多等 **15 分钟**，仍未退出则发 **SIGKILL**。宿主停止后，新实例可能在**另一台服务器/另一个位置**启动。
  - 冷启动：官方称通常在 **1–3 秒**区间，取决于镜像大小与入口代码执行时间。
  - OOM：超出内存会抛 OOM 错误并被重启；容器**不使用 swap**。

- **是否免费到永远**：**否**。依据：官方 Containers Overview 页标注 "Available on Workers Paid plan"；官方 Pricing 表 Free 列三个维度全为 N/A；Workers Pricing 页明确 "Containers are billed ... with included monthly usage as part of the $5 USD per month Workers Paid plan"。即没有任何 free forever 的容器额度，最低也要 $5 USD/月订阅。

- **试用额度**：**未找到官方 trial credit**。官方 Containers pricing / limits / FAQ / GA changelog 均未提供免费试用额度或赠送 credit；Workers Paid 是 $5 USD/月起的最低订阅费（非试用额度）。另有「Cloudflare for Students」类促销页面存在，但其条款与是否覆盖 Containers 未在本次抓取中证实，不作为依据。

- **是否需要信用卡**：**需要**（准确说是需要绑定主支付方式，不限于实体信用卡）。依据：官方 Billing 文档 "A primary payment method is required to purchase Cloudflare products and services."；支持方式为 Visa、Mastercard、American Express、Discover、**UnionPay（银联）**、PayPal、Apple Pay、Google Pay、Stripe Link，最多可加 2 个支付方式。Workers Paid 属于付费订阅，因此必须先绑定支付方式。付款失败有 5 天宽限期，逾期账号会被自动降级到 Free 计划。

- **数据存放地区**：默认「Region:Earth」——按请求就近选择**已预取镜像**的位置启动，但官方明确**不保证**容器与其 Durable Object 同位置，也不保证一定在用户同区域（容量不足时可能落到更远位置）；实例重启后可能换到**不同位置**。可用 placement 约束：`regions` = ENAM、WNAM、EEUR、WEUR、APAC、SAM、ME、OC、AFR（其中 ME/OC/AFR 为有限容量，**不能单独使用**，必须搭配其他区域）；`jurisdiction` = `eu`（EEUR+WEUR）、`fedramp`（ENAM+WNAM）。**区域清单中没有中国大陆**，距离大陆最近的是 APAC。

- **中国大陆可达性**：**无可靠证据**（未做本机实测）。
  - 官方证据层面：Containers placement 区域列表不含中国大陆；Cloudflare China Network（由 JD Cloud 运营）的官方「可用产品与功能」Developer Services 清单列出 Workers、Workers KV、R2、Assets 等，**未列出 Containers**，即官方未声明 Containers 在中国大陆网络可用。R2 官方脚注亦说明「R2 bucket 不能在中国大陆创建，且大陆内不支持自定义域名」。
  - 因此从大陆访问属于走 Cloudflare 海外网络，具体延迟/丢包**无官方数据**，本次也未做实测，故不下结论。备案方面：官方 ICP 文档说明面向大陆访客（含通过 CDN 提供）的网站按大陆法规需 ICP 备案/许可；而使用 Cloudflare 全球网络不需要向 Cloudflare 提交备案号。

- **部署形态**：Serverless 容器。把 Docker 镜像（`linux/amd64`）交给 Wrangler 构建并推送到 Cloudflare Registry，容器由 Worker 代码通过 Durable Object（`ctx.container` 或 `Container` class）按需拉起；每个容器实例跑在独立 Firecracker microVM 中。计费与生命周期均由 Worker/DO 代码控制。**不支持**终端用户直连容器的非 HTTP TCP/UDP（所有流量必须过 Worker）。

- **自定义域名与备案**：Containers 不能单独对外暴露，必须经由 Worker，因此自定义域名按 **Workers Custom Domains** 配置：需要一个**已接入 Cloudflare 的 active zone**，Cloudflare 会自动建 DNS 记录并签发证书（精确 hostname 匹配，不支持泛解析）；或直接用 `*.workers.dev` 子域。**备案（ICP）**：使用 Cloudflare 全球网络 + Containers 时，Cloudflare 侧不要求备案；但按官方 ICP 文档，面向中国大陆用户提供服务的网站按大陆法规需取得 ICP 备案（信息类）或 ICP 许可证（经营类），且大陆内托管/中国网络场景由服务商强制。由于 Containers 不在中国网络可用产品清单中，走全球网络方案在大陆合规风险由使用者自行承担。

- **2025–2026 近期变更**：
  - **2026-04-13**：Containers 与 Sandboxes **正式 GA（generally available）**。
  - **2026-04-05**：新增 `regions` / `jurisdiction` 区域与合规放置约束。
  - **2026-03-26**：通过 hostname 便捷连接 Workers 及其他 bindings（outbound Workers）。
  - **2026-03-24**：支持 Docker Hub 镜像。
  - **2026-03-12**：支持 SSH 进入运行中的容器调试。
  - **2026-02-25**：账号级资源上限提升 **15 倍**——并发内存 400 GiB → **6 TiB**，并发 vCPU 100 → **1,500**，并发磁盘 2 TB → **30 TB**。
  - **2025-11-21**：CPU 计费改为**仅按实际活跃用量**（active-CPU pricing），单价 $0.00002/vCPU-second；Memory 与 Disk 仍按预置资源计费。
  - 期间还新增/演进：Durable Object Container API、容器快照（30 天 TTL）、R2 FUSE 挂载、自定义实例类型（1–4 vCPU，内存/磁盘上限 12 GiB / 20 GB）。

- **对本需求的结论**：**不符合**。用户条件为「中国大陆、无 VPS、小型导航应用、需要持久化、只要免费」，而 Cloudflare Containers 有四重障碍：(1) **强制 Workers Paid**（$5 USD/月起），Free 计划内存/CPU/磁盘额度全为 N/A，无 free forever 额度也无试用 credit；(2) 必须**绑定支付方式**（可用银联/PayPal，但仍是付费订阅）；(3) 容器**本地磁盘临时**，休眠或宿主重启即重置，持久化必须额外依赖快照（30 天 TTL、仅 durable_object 策略、20 GB 上限）或 R2+FUSE（性能非 SSD 级）；(4) **无中国大陆区域**，官方未声明 Containers 在中国网络可用，大陆访问路径为海外节点且**无官方延迟证据**。若用户接受付费或改用 Workers + 静态资源/R2/D1 这类有真正 free tier 的组合，可另作评估；单就 Containers 而言不满足「只要免费」。

- **置信度**：high

- **来源（查证日期 2026-10-01）**
  - https://developers.cloudflare.com/containers/ — Overview 标注 "Available on Workers Paid plan"；Region:Earth；Wrangler/Durable Object 基本形态（抓取成功）
  - https://developers.cloudflare.com/containers/platform/pricing/ — 免费列为 N/A；Workers Paid 含 25 GiB-hours/375 vCPU-minutes/200 GB-hours；超额单价；每 10ms 计费；实例类型表；出网区域价；Worker/DO 单独计费（抓取成功）
  - https://developers.cloudflare.com/containers/platform/limits/ — 实例类型（lite…standard-4 具体 vCPU/内存/磁盘）；自定义实例类型约束（1–4 vCPU、≤12 GiB、≤20 GB）；账号级 6 TiB/1,500 vCPU/30 TB/50 GB 镜像；快照 ≤20 GB、30 天保留（抓取成功）
  - https://developers.cloudflare.com/containers/faq/ — 磁盘默认临时、休眠后用镜像新盘；快照与 R2 FUSE；冷启动 1–3 秒；无固定最长运行时长；SIGTERM→15 分钟→SIGKILL；OOM 重启；位置选择不保证同区（抓取成功）
  - https://developers.cloudflare.com/containers/concepts/architecture/ — 容器生命周期、冻结/停止流程、Firecracker microVM、linux/amd64、请求必须过 Worker、无 TCP/UDP 直连（抓取成功）
  - https://developers.cloudflare.com/containers/concepts/placement/ — regions 枚举（ENAM/WNAM/EEUR/WEUR/APAC/SAM/ME/OC/AFR）；ME/OC/AFR 有限容量不可单独用；jurisdiction eu/fedramp；无中国大陆区域（抓取成功）
  - https://developers.cloudflare.com/containers/guides/snapshots/ — 快照仅 durable_object 策略；不可变；30 天 TTL 且 restore 刷新；不可自定义 TTL；不跨镜像（抓取成功）
  - https://developers.cloudflare.com/containers/examples/r2-fuse-mount/ — R2 通过 tigrisfs/FUSE 挂载持久化；性能非 SSD 级警告（抓取成功）
  - https://developers.cloudflare.com/containers/get-started/ — 需本地 Docker 构建并推送镜像；部署后需等待数分钟 provision（抓取成功）
  - https://developers.cloudflare.com/workers/platform/pricing/index.md — Workers Free 仅 100,000 请求/天；Workers Paid 最低 $5 USD/月/账号；Containers 段落与 Free 列 N/A；R2 免费 10 GB-month/1M Class A/10M Class B（抓取成功）
  - https://developers.cloudflare.com/changelog/post/2026-04-13-containers-sandbox-ga/ — 2026-04-13 Containers 与 Sandboxes 正式 GA（抓取成功）
  - https://developers.cloudflare.com/changelog/post/2025-11-21-new-cpu-pricing/ — CPU 改为仅按活跃用量计费；$0.00002/vCPU-second；内存磁盘仍按预置计费（抓取成功）
  - https://developers.cloudflare.com/changelog/post/2026-02-25-higher-container-resource-limits/ — 并发上限 6 TiB/1,500 vCPU/30 TB，较此前 400 GiB/100/2 TB 提升 15 倍（抓取成功）
  - https://developers.cloudflare.com/changelog/post/2026-04-05-regional-placement/ — regions/jurisdiction 放置约束上线（抓取成功）
  - https://developers.cloudflare.com/billing/get-started/create-billing-profile/ — "A primary payment method is required to purchase Cloudflare products and services"；支持卡组织与 PayPal/钱包（抓取成功）
  - https://developers.cloudflare.com/billing/understand/faq/ — 支持的支付方式（含 UnionPay）；最多 2 个；失败 5 天宽限期后降级 Free（抓取成功）
  - https://developers.cloudflare.com/china-network/reference/available-products/ — 中国网络（JD Cloud 运营）Developer Services 列 Workers/KV/R2/Assets，**未列 Containers**；R2 脚注：大陆不能创建 bucket、大陆不支持自定义域名（抓取成功）
  - https://developers.cloudflare.com/china-network/concepts/icp/index.md — 大陆网站（含通过 CDN 面向大陆访客）需 ICP 备案/许可的官方说明（抓取成功）
  - https://developers.cloudflare.com/workers/configuration/routing/custom-domains/index.md — Custom Domain 需 active Cloudflare zone，自动建 DNS 与证书，精确 hostname 匹配（抓取成功）
  - https://www.cloudflare.com/plans/developer-platform/ — 抓取失败（返回内容为空，无可用文本）
