## Render

**一句话结论**：Render 免费层能长期跑免费 Web Service（750 小时/月、15 分钟休眠、冷启动约 1 分钟），但**没有任何免费持久化方案**——免费不能挂持久磁盘，免费 Postgres 创建 30 天后过期并最终被删除，免费 Key Value 是纯内存态，所以不适合需要长期保数据的小型导航应用。

- **免费额度（具体数字）**
  - Free instance hours：每个 workspace 每自然月 **750 小时**；服务 spun-down 时不计费；用尽则当月暂停所有免费 Web Service，月初重置为 750 小时，剩余不结转。
  - 免费 Web Service 计算规格：**512 MB RAM**、**不到 1 CPU**（on-demand，非独占）。
  - 免费 Static Site：免费部署，但同样占用下文的出站带宽与构建分钟。
  - 免费 Render Postgres：**256 MB RAM**、**1 GB SSD 存储**、**100 连接**，每个 workspace 同时只能有 **1 个**。
  - 免费 Render Key Value：**25 MB RAM**、**50 连接**，每个 workspace 同时只能有 **1 个**。
  - 出站带宽（workspace 级，Hobby 计划）：**5 GB/月**；超出按 **$0.15/GB**（公网流量）计费，私有链路流量 $0.03/GB。入站流量免费。
  - 构建流水线分钟（Hobby 计划）：**500 分钟/月**（Starter pipeline）；超出自动购买补充分钟；构建超时上限 120 分钟（免费/Starter 失败或超时为 30 分钟）。
  - 免费层不支持：多实例横向扩展（Scaling）、持久磁盘、边缘缓存、one-off jobs、SSH/Shell 访问、接收私有网络流量。
  - 免费层不支持 SMTP 出站端口 25 / 465 / 587；不能监听保留端口 18012 / 18013 / 19099。

- **持久化存储**：免费 Web Service 只有**临时（ephemeral）文件系统**，任何本地文件变更（上传图片、本地 SQLite 等）在每次 redeploy / restart / spin-down 时全部丢失。官方明确：**只有 paid 服务才能挂持久磁盘（Persistent Disk），Free Web Service 不能**。可用的免费数据存储只有 Render Postgres 与 Render Key Value，但两者都有下面的过期/易失限制。

- **数据存活（重启/休眠/不活跃）**：免费 Web Service **连续 15 分钟无任何入站流量**（HTTP 请求或 WebSocket 消息）即 spin down，spin down 时本地文件系统变更丢失；下次收到 HTTP 请求或新 WebSocket 连接时自动 spin up，**约需 1 分钟**，期间浏览器看到加载页。Render 可随时重启免费 Web Service。免费 Key Value **不落盘**，实例重启即丢全部数据；升级到付费时数据也会丢失。免费 Postgres 可随时维护/重启。

- **是否免费到永远**：**Web Service 的“免费运行”本身是长期免费额度（free forever 性质，750 小时/月，每月重置），但“数据持久化”不是**。官方文档将免费实例定位为“探索/个人项目/预览”，明确写 **Do not use them for production applications**。免费 Postgres 有 **30 天硬过期**，所以从“要持久化且只要免费”的角度，答案是**否**。

- **试用额度**：官方**没有**面向所有新用户的通用免费试用 credit（trial credit）。官方页面只列出需要申请的 credits：迁移 credit **最高 $10K**（Migration Credits，需申请），VC 支持的创业公司经 Render for Startups **最高 $100K credits**。这两者都不是自动发放的试用额度。

- **是否需要信用卡**：**否**，免费层无需信用卡即可上手。官方依据：官方教程《Your First Deploy》写明 “This tutorial uses free Render resources. **No payment is required.**”；FAQ《All of my services run on free instances. Can I still be billed?》回答 “Yes, **if you've added a payment method**… If you haven't added a payment method and you would incur charges, Render instead disables your services for the duration of the current billing period.” 即不绑卡时超额不扣费而是停服。付费功能仅支持信用卡/借记卡（Stripe 处理）。

- **数据存放地区**：官方 Regions 文档列出 5 个可选区域：**Oregon, USA / Ohio, USA / Virginia, USA / Frankfurt, Germany / Singapore**。免费服务在创建时同样可选择区域（官方对免费实例未列出区域限制）。中国大陆用户最近的是 **Singapore**。官方未提供“免费层在中国大陆的具体落地/加速”说明。

- **中国大陆可达性**：**本机实测**（2026-10-01，从本机网络）：`https://render.com/` HTTP 200，DNS 解析 0.002 s、connect 0.186 s、总耗时 1.81 s；`https://dashboard.render.com/` HTTP 200，总耗时 1.73 s；`onrender.com` 可正常解析（A 记录 34.83.64.96）。这是单点实测，不代表全国网络普遍情况；**官方未发布任何关于中国大陆访问质量的证据**，默认域名 `*.onrender.com` 的可用性**无可靠证据**。按要求不臆测延迟数字。

- **部署形态**：PaaS（托管平台），支持 **Web Service**（Node.js / Python / Rails / Go / Rust / Docker 等）、**Static Site**、Render Postgres、Render Key Value、Private Service、Background Worker、Cron Job、Workflow（较新）。免费层可用：Web Service、Static Site、Postgres、Key Value。小型导航应用通常用 Static Site 或 Web Service 即可。

- **自定义域名与备案**：免费 Web Service **支持自定义域名 + 托管 TLS 证书**（官方免费文档将 Custom domains、Managed TLS certificates 列为免费层支持特性）。备案方面：Render 无中国大陆区域/节点，官方文档**未提及 ICP 备案**；按中国大陆规则，服务器位于境外通常不涉及 ICP 备案（此为一般规则，非 Render 官方说明）。

- **2025–2026 近期变更**（来自官方 Changelog）
  - 2026-02-24：**Free web services now remain active while receiving WebSocket messages**（调整免费服务休眠判定）。
  - 2025-09-11：**免费 Web Service 不再允许 SMTP 端口 25/465/587 出站流量**。
  - 2025-06-26：**Upcoming changes to outbound bandwidth**（出站带宽计费规则调整，官方页面现行为 Hobby 5 GB/月、公网超量 $0.15/GB）。
  - 2025-07-15：Web Service 边缘缓存进入 Early Access（免费层不支持）。
  - 2026 年陆续新增：Render Workflows 进入 public beta / Blueprint 支持、Sandboxes EA、CLI v2.28.0、Python/TS SDK v1.2.0。
  - （背景，非 2025–2026）**2024-05-01 起免费 Postgres 过期时间从 90 天缩短为 30 天**，该政策在 2026-10-01 的官方文档中仍然有效。

- **对本需求的结论**：用户条件为「中国大陆、无 VPS、小型导航应用、需要持久化、只要免费」。
  - **Web 服务部分可用**：免费 Web Service + 自定义域名 + 750 小时/月可以长期免费跑，但会有 15 分钟无访问休眠、约 1 分钟冷启动，对导航站体验有影响（可用外部定时 ping 缓解，但官方对“service-initiated traffic”过高可暂停）。
  - **持久化部分不合格**：免费不能挂磁盘；免费 Postgres 创建 **30 天后过期**，过期后仅 **14 天宽限期**可升级付费，之后数据被**删除**；免费 Key Value 重启即丢数据。因此**任何免费方案都无法长期保住导航应用的数据**。
  - 若坚持“只要免费 + 需持久化”，Render **不是合适选择**；若可接受把数据放在外部（如免费对象存储/Git 仓库/第三方 DB）或每 30 天导出重建 Postgres，才勉强可用，但这已超出“纯免费持久化”的原始诉求。
  - 另外 Hobby 仅 **5 GB/月出站带宽**，导航站流量不大通常够用，但超量会按 $0.15/GB 计费或在未绑卡时停服。

- **置信度**：high（核心数字均来自官方文档/定价页并已实际抓取；仅中国大陆落地质量与备案属推断/实测单点）

- **来源（查证日期 2026-10-01）**
  - https://render.com/docs/free — 750 小时/月、15 分钟休眠、约 1 分钟冷启动、临时文件系统、免费不能挂磁盘、免费 Postgres 30 天过期+14 天宽限+1 GB+单实例、免费 Key Value 纯内存单实例、免费层不支持的特性清单、“Do not use them for production applications”
  - https://render.com/pricing — Hobby 计划 $0/mo、5 GB 带宽、免费 Web Service 512 MB RAM/不到 1 CPU、免费 Postgres 256 MB RAM/100 连接、免费 Key Value 25 MB RAM/50 连接、付款方式与 credits 说明、$1 验卡说明
  - https://render.com/docs/disks — “You can attach a persistent disk to a **paid** Render web service…”，默认文件系统为 ephemeral
  - https://render.com/docs/outbound-bandwidth — Hobby 5 GB/月、超出 $0.15/GB（公网）、$0.03/GB（私有链路）、哪些流量计费
  - https://render.com/docs/build-pipeline — Hobby 500 pipeline minutes/月、超量自动购买、构建超时（30/120 分钟）
  - https://render.com/docs/regions — 5 个区域：Oregon / Ohio / Virginia / Frankfurt / Singapore
  - https://render.com/docs/faq — “All of my services run on free instances. Can I still be billed?” 说明未绑卡则停服；免费服务 15 分钟休眠、约 1 分钟恢复
  - https://render.com/docs/your-first-deploy — “This tutorial uses free Render resources. No payment is required.”（免费无需付款/信用卡）
  - https://render.com/docs/postgresql（经 /docs/postgresql-redirect）— Render Postgres 概述与连接能力（具体免费限制以 /docs/free 为准）
  - https://render.com/changelog — 2026-02-24 WebSocket 休眠判定调整、2025-09-11 SMTP 端口封禁、2025-06-26 出站带宽变更、2026 年 Workflows/Sandboxes/SDK 等变更；2024-05-01 免费 Postgres 由 90 天改为 30 天
