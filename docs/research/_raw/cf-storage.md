## Cloudflare D1 / KV / R2 / Durable Objects

**一句话结论**：Cloudflare 的 D1（SQL）、KV、R2、Durable Objects（SQLite 后端）在 Workers Free 计划下都有永久免费额度（D1 官方明确写了 "will always have a Free plan"），全部为 serverless、无需 VPS、无需自备服务器；但免费层没有中国大陆节点，从本机实测流量被送到洛杉矶（LAX），且 R2 免费额度需要先完成一次 R2 订阅 checkout、DO 只能用 SQLite 后端。

- **免费额度（具体数字）**
  - **D1（Workers Free）**：5,000,000 rows read / 天；100,000 rows written / 天；存储 5 GB（账户总计）；单库最大 500 MB；每账户 10 个数据库；Time Travel 回滚窗口 7 天；每次 Worker 调用最多 50 条查询；无 egress 费用；不跑查询不计 compute（scale-to-zero）。
  - **KV（Workers Free）**：100,000 keys read / 天；1,000 keys written / 天；1,000 keys deleted / 天；1,000 list requests / 天；存储 1 GB（账户）；单 namespace 1 GB；value 上限 25 MiB；key 上限 512 bytes；所有免费限额每天 00:00 UTC 重置；无 egress 费用。
  - **R2 免费层（仅 Standard 存储类别）**：10 GB-month / 月存储；1,000,000 Class A operations / 月；10,000,000 Class B operations / 月；egress（出网流量）完全免费（零 egress）；`DeleteObject` / `DeleteBucket` / `AbortMultipartUpload` 属免费操作；Infrequent Access 不享受免费层。注意计费"向上取整"（用 1.1 GB-month 按 2 GB-month 计）。
  - **Durable Objects 免费层（仅 SQLite 后端）**：Requests 100,000 / 天；Duration 13,000 GB-s / 天；Rows read 5,000,000 / 天；Rows written 100,000 / 天；SQL 存储 5 GB（账户总计）。KV 后端的 DO **免费层不可用**，仅 Workers Paid 可用。
  - **组合使用的注意点**：D1 / KV / DO 的免费额度都挂在 Workers Free plan 上，而非独立服务；Workers Free 本身是 100,000 requests / 天、单次调用 10 ms CPU time。静态资源请求免费且不限量。

- **持久化存储**：四者都是服务端持久化，不依赖本地进程存活。D1 每个库由单个 Durable Object 支撑，写入"需要跨多个位置持久化"（官方原文：Writes need to be durably persisted across several locations）；KV 为最终一致性（eventually consistent），数据写入中心存储后通过 push/pull 复制到各 Cloudflare 节点；R2 官方标称 99.999999999%（11 个 9）年持久性，采用多副本 / erasure coding + 同区域多数据中心 + 同步写（HTTP 200 仅在落盘后返回）；DO SQLite 存储写在对象存储中，对象被驱逐出内存后下次请求会重建（constructor 再次调用），但**存储数据仍在**。

- **数据存活（重启/休眠/不活跃）**：Worker/DO 进程休眠或重启不影响持久化数据。D1 是 scale-to-zero：不查询时不计 compute，但数据保留；KV 无过期时间（除非显式设置 expiration TTL）则永久保留；R2 对象除非用户配置 lifecycle 规则或被删除，否则保留；DO 被驱逐出内存（evict）后数据仍在存储中。**未找到任何官方文档说明"免费层不活跃数据会被自动删除"**——即官方没有 inactivity-deletion 策略，但同时也**没有**官方承诺"永不删除"（D1 免费层超额时会拒绝写入，官方明确要求用户自行清理旧数据）。R2 唯一的自动清理是默认 lifecycle 规则：未完成的分片上传（multipart upload）在发起后 7 天过期。

- **是否免费到永远**：
  - D1：**是（官方明确）**。D1 Pricing FAQ 原文："Yes, the Workers Free plan will always include the ability to prototype and experiment with D1 for free."（注意措辞是"prototype and experiment"，偏向原型/实验，非明确的"生产永久免费"承诺）。
  - KV：**官方未明确承诺 forever**，仅说明"Workers KV is included in both the Free and Paid Workers plans"，免费额度按天重置，超额报错。
  - R2：**官方未明确承诺 forever**，仅列出 Free tier 表格（10 GB-month 等），且该页最后更新日期为 2026-10-01。
  - Durable Objects：**官方未明确承诺 forever**，仅说明 DO 在 Free 和 Paid 计划都可用，Free 只能用 SQLite 后端；SQLite 存储计费自 2026-01 起在 Paid 生效，官方明确 "Developers on the Workers Free plan will not be charged."
  - 综合：这些是**长期免费层（free tier）**，不是限时试用；但只有 D1 有"always"级别的文字承诺。

- **试用额度**：**无独立 trial credit**。Cloudflare 这四类产品不走"AWS 式 12 个月试用 / 一次性赠送 credit"模式，而是"每月/每天固定免费额度 + 超额付费或报错"。官方页面中未出现任何 trial credit / promotional credit 说明（未找到官方来源）。因此不要把它们和 GCP/AWS 的试用金混为一谈。

- **是否需要信用卡**：
  - **Workers / D1 / KV / Durable Objects（Workers Free plan）**：官方文档未提及需要绑定支付方式；Workers Free 是默认计划（"By default, users have access to the Workers Free plan"），文中未出现付费方式要求。
  - **R2**：官方 Get started 明确要求 "You need a Cloudflare account with an **R2 subscription**"，并需 "Complete the **checkout flow** to add an R2 subscription to your account"。即 R2 即使只用免费额度也要先走一次订阅 checkout，实务上需要绑定支付方式（信用卡 / PayPal / UnionPay 等）。
  - 官方 Billing FAQ 列出接受的支付方式：Visa、Mastercard、American Express、Discover、PayPal、Apple Pay、Google Pay、Stripe Link、**UnionPay（银联）**，每个账户最多绑定 2 个支付方式。
  - 关于"免费额度是否强制要求信用卡"，官方页面没有逐字写明，**此项为 medium 置信度**。

- **数据存放地区**：
  - D1：默认在"发起创建请求的最近位置"创建主库；可给 location hint：`wnam / enam / weur / eeur / apac / oc`（**不支持南美 sam、非洲 afr、中东 me**，D1 不在这些地区运行）；可限制 jurisdiction：`eu`、`fedramp`。Read replication（beta）会在每个可用区域建只读副本。
  - KV：默认**全局复制到 Cloudflare 全网，无地域限制**；可选 jurisdiction（`eu` / `us` / `fedramp`）目前处于 **private beta**，需联系 Cloudflare 开通。
  - R2：默认 Automatic，按创建请求来源选最近的可用区域；可给 location hint：`wnam / enam / weur / eeur / apac / oc`；可设 jurisdiction：`eu` / `fedramp` / `us`（创建后不可更改）。
  - Durable Objects：默认在首次 `get()` 请求附近的机房实例化，之后**不会自动迁移**；location hint 支持 `wnam / enam / sam / weur / eeur / apac / apac-ne / apac-se / oc / afr / me`（sam / afr / me 目前不会真正 spawn，会落到邻近区域）；可限制 jurisdiction：`eu` / `us` / `fedramp`。
  - **四者均无"中国大陆"区域选项**。

- **中国大陆可达性**：
  - **官方证据**：Cloudflare 中国大陆节点只通过 **Cloudflare China Network** 提供，由合作伙伴 JD Cloud（京东云）运营，**仅作为 Enterprise 计划的独立订阅售卖**，且要求每个顶级域名持有有效的 **ICP 备案/许可证**（"You must have a valid ICP (Internet Content Provider) filing or license for each apex domain"）。免费层用户无法获得中国大陆境内数据中心。
  - **本机实测（2026-10-01，本机 curl）**：`https://www.cloudflare.com/cdn-cgi/trace` 返回 `loc=CN`、`colo=LAX`——即本机位于中国，但请求由中国境外（洛杉矶 LAX）的 Cloudflare 边缘节点响应；`https://workers.cloudflare.com/` 返回 HTTP 301（0.61s）；`https://dash.cloudflare.com/` 返回 HTTP 403（3.39s，疑似风控/机器人拦截，不能据此判定为被墙）。
  - 结论：**官方无"中国大陆免费层可用/不可用"的说法**；可验证证据显示免费层流量落在中国境外节点，因此大陆访问需要跨境，延迟/稳定性取决于跨境链路。**不给出具体延迟数字（无可靠证据）**。

- **部署形态**：纯 serverless / PaaS，无需 VPS。D1、KV、R2、DO 都通过 Workers（或 Pages Functions）的 binding 使用；R2 另有 S3 兼容 API 和 REST API，可脱离 Workers 单独从任意环境调用；KV 也有 REST API。导航类应用典型形态：Workers（Hono/静态资源）+ D1（导航条目 SQL）或 KV（配置/JSON）+ R2（图标/静态文件），全部在 Cloudflare 边缘运行。

- **自定义域名与备案**：
  - Workers 支持 Custom Domains / Routes；R2 公开桶支持绑定自定义域名（要求该域名是**同一账户下的 zone**，非 Cloudflare 托管域名可用 partial/CNAME setup）。`r2.dev` 公共开发域名仅供非生产用，有可变速率限制，生产应绑自定义域名。
  - **ICP 备案**：Cloudflare 官方仅在 China Network 文档中要求 ICP；使用**全球网络**的自定义域名，官方文档未要求 ICP。但若要让站点在中国大陆合规落地/接入大陆节点，则必须 Enterprise + 每域名 ICP（官方证据见 China Network 页面）。

- **2025–2026 近期变更**：
  - **Durable Objects SQLite 存储开始计费**：2025-12-12 changelog 公告，SQLite 后端存储计费自 **2026 年 1 月**启用，目标日期不早于 **2026-01-07**；仅计费目标日期之后的使用，且**Workers Free 计划不收费**。
  - **D1 全球读复制（read replication）Beta**：文档中已作为 Beta 功能，读副本不额外收费（按 `rows_read/rows_written` 正常计费）。
  - **R2 免费层维持 10 GB-month + 零 egress**：R2 Pricing 页面最后更新日期为 **2026-10-01**（本日），免费层表格无变化；R2 新增 Basin Catalog / Basin SQL 等付费附加服务，不影响免费层。
  - **DO 数据位置**：`apac-ne` / `apac-se` 作为 apac 的子区域新增；DO 动态迁移仍在计划中（尚未实现）。
  - 各定价页最后更新日期：D1 Pricing/Limits 2026-04-21、KV Pricing 2026-04-21、Workers Pricing 2026-08-28、DO Pricing 2026-09-30、R2 Pricing 2026-10-01。

- **对本需求的结论**：对"中国大陆、无 VPS、部署小型导航应用、需要持久化、只要免费"的需求，**Cloudflare 是四个候选里持久化能力最完整、免费额度最明确的一档**，可以做到零成本、零服务器。推荐组合：**Workers（承载 API/前端）+ D1（导航条目与分类的 SQL 持久化）**，静态图标/文件放 R2（免费 10 GB + 零 egress）或直接作为 Workers Static Assets（免费不限量）。需要注意四点：(1) 免费层无大陆节点，大陆访问走境外（本机实测落 LAX），首屏/TTFB 会受跨境链路影响，建议加缓存与 CDN；(2) D1 免费层单库仅 500 MB、全账户 5 GB、每天 10 万行写入与 500 万行读取，对小型导航应用非常充裕，但要注意全表扫描会快速消耗 rows read（用索引）；(3) R2 需要先完成一次 R2 订阅 checkout（可能需绑定支付方式，银联可用），若目标是"完全不填卡"，只用 Workers + D1 即可，D1 的 5 GB 对导航数据足够；(4) 免费层超额是**报错停止**而非静默扣费，对"只要免费"的用户是安全的（前提是不手动升级到 Workers Paid）。

- **置信度**：high

- **来源（查证日期 2026-10-01）**
  - https://developers.cloudflare.com/d1/platform/pricing/ — D1 免费额度（5M rows read/天、100k rows written/天、5 GB 存储）；"Will D1 always have a Free plan? Yes"；无 egress 费用；空库约 12 KB；免费限额每天 00:00 UTC 重置
  - https://developers.cloudflare.com/d1/platform/limits/ — 单库 500 MB（Free）/10 GB（Paid）、每账户 10 个库（Free）、Time Travel 7 天（Free）、D1 由单个 Durable Object 支撑、写入跨多位置持久化
  - https://developers.cloudflare.com/d1/configuration/data-location/ — D1 location hints（wnam/enam/weur/eeur/apac/oc）、jurisdiction（eu/fedramp）、不支持 sam/afr/me、read replication
  - https://developers.cloudflare.com/d1/reference/faq/ — 免费层超额报错、需自行清理数据、无 egress 费用
  - https://developers.cloudflare.com/kv/platform/pricing/ — KV 免费额度（100k reads/天、1k writes/天、1k deletes/天、1k list/天、1 GB 存储）、无 egress 费用、所有操作含未命中 key 均计费
  - https://developers.cloudflare.com/kv/platform/limits/ — KV Free 上限（Reads 100k/天、Writes 1k/天、Storage 1 GB）、value 25 MiB、key 512 bytes、namespace 1 GB
  - https://developers.cloudflare.com/kv/reference/faq/ — KV 最终一致性、key 过期不计 delete 操作
  - https://developers.cloudflare.com/kv/reference/data-location/ — KV 默认全局复制无地域限制、jurisdiction（eu/us/fedramp）为 private beta
  - https://developers.cloudflare.com/workers/platform/pricing/ — Workers Free 100k requests/天、10 ms CPU/调用、D1/KV/R2/DO 汇总表、静态资源请求免费
  - https://developers.cloudflare.com/durable-objects/platform/pricing/ — DO Free plan 仅 SQLite 后端；100k requests/天、13,000 GB-s/天、5M rows read/天、100k rows written/天、5 GB SQL 存储；KV 后端仅 Paid；SQLite 存储计费自 2026-01 启用且 Free 不收费；空 SQLite 约 12 KB
  - https://developers.cloudflare.com/durable-objects/reference/data-location/ — DO location hints（含 apac-ne/apac-se/sam/afr/me）、jurisdiction（eu/us/fedramp）、首次 get() 决定位置且之后不迁移
  - https://developers.cloudflare.com/r2/pricing/ — R2 免费层 10 GB-month/月、1M Class A/月、10M Class B/月、egress 免费、仅 Standard 类别、删除操作免费、计费向上取整
  - https://developers.cloudflare.com/r2/reference/durability/ — R2 11 个 9 年持久性、多副本/erasure coding、同区域多数据中心、同步写
  - https://developers.cloudflare.com/r2/reference/data-location/ — R2 Automatic / location hints / jurisdiction（eu/fedramp/us），创建后不可改
  - https://developers.cloudflare.com/r2/platform/limits/ — R2 每桶存储与对象数不限、单对象 5 TiB、r2.dev 有可变速率限制、生产应用自定义域名
  - https://developers.cloudflare.com/r2/buckets/public-buckets/ — R2 自定义域名需同账户 zone、r2.dev 仅供非生产
  - https://developers.cloudflare.com/r2/buckets/object-lifecycles/ — R2 对象仅按用户配置的 lifecycle 规则删除；默认规则仅清理 7 天未完成的分片上传
  - https://developers.cloudflare.com/r2/get-started/ — R2 需要 Cloudflare 账户 + R2 subscription，并完成 checkout flow
  - https://developers.cloudflare.com/billing/understand/faq/ — 接受的支付方式（含 UnionPay）、最多 2 个支付方式、R2 产生 7 条账单行但免费层均为 $0.00
  - https://developers.cloudflare.com/changelog/2025-12-12-durable-objects-sqlite-storage-billing/ — DO SQLite 存储计费 2026-01（目标不早于 2026-01-07），Free 计划不收费
  - https://developers.cloudflare.com/china-network/ — 中国大陆节点为 Enterprise 专属订阅、由 JD Cloud 运营、每域名需有效 ICP 备案
  - 本机实测 2026-10-01：`curl https://www.cloudflare.com/cdn-cgi/trace` → `loc=CN`、`colo=LAX`；`workers.cloudflare.com` HTTP 301；`dash.cloudflare.com` HTTP 403
