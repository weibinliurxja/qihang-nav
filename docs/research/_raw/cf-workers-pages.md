## Cloudflare Workers 与 Cloudflare Pages

**一句话结论**：Workers Free 是一份长期有效的免费计划（10 万请求/日、10 ms CPU/次、静态资源请求免费不限量），配合 D1/KV/R2 的免费额度可实现小型导航应用的持久化；Pages 仍在维护但官方已明确建议新项目改用 Workers；两者免费版都无大陆官方节点，大陆可访问性「无可靠证据」。

- **免费额度（具体数字）**
  - Workers（Free 计划，Workers limits / pricing 官方表）：请求 **100,000 次/天**（按 UTC 00:00 重置，超额返回 Error 1027）；CPU 时间 **10 毫秒/次调用**；内存 **128 MB**；Worker 包体积 **64 MiB（未压缩）**，官方注明「无压缩体积限制」；启动时间上限 **1 秒**；子请求 **50 次/请求**；同时出站连接 **6 条/请求**；环境变量 **64 个/Worker**，单个变量 **5 KB**；**Worker 数量 100 个/账户**；Cron Triggers **5 个/账户**。
  - 静态资源（Workers Static Assets，Free）：**20,000 个文件/Worker 版本**，单文件 **25 MiB**；官方 pricing 页明确「Requests to static assets are free and unlimited」（静态资源请求免费且不限量，且不计入请求计费）。
  - 出站/带宽：官方 pricing 页写明「There are no additional charges for data transfer (egress) or throughput (bandwidth)」；请求体上限 **100 MB**（取决于 Cloudflare 账户计划 Free 档）。
  - Pages（Free 计划，Pages limits 官方表）：构建 **500 次/月**、**同时 1 个构建**（Pro 5、Business 20），单次构建超时 **20 分钟**；站点文件数 **20,000 个**（付费 100,000）；单文件 **25 MiB**；自定义域名 **100 个/项目**；项目数 **100 个/账户**；Preview 部署数量不限；`_redirects` 2,000 条静态 + 100 条动态；`_headers` 100 条规则。
  - Pages 带宽/请求：官方 Pages 产品页写明「All plans come with unlimited sites, seats, requests, and bandwidth」（所有计划不限站点、席位、请求与带宽）。
  - Pages Functions 不计费为独立额度：官方明示「Requests to your Pages Functions count towards your quota for the Workers Free plan」，即与 Workers 共用 **100,000 次/天** 免费请求（例如 5 万 Functions + 5 万 Workers）。

- **持久化存储**：Workers 本身是无状态执行环境；持久化需搭配官方存储产品，均有免费额度：
  - **D1（Serverless SQL）**：Free 计划 **5 GB 存储/账户**、**500 万行读取/天**、**10 万行写入/天**；单库最大 **500 MB**（Free），数据库数 **10 个**（Free）；Time Travel 时间点恢复 **7 天**（Free）。
  - **Workers KV**：Free 计划 **1 GB 存储**、**100,000 次读取/天**、**1,000 次写入/天**、**1,000 次删除/天**、**1,000 次 list/天**，每日 00:00 UTC 重置；单值最大 **25 MiB**，key 最大 512 bytes；无 egress 费用。
  - **R2（对象存储）**：每月免费 **10 GB-month 存储**、**100 万次 Class A 操作**、**1,000 万次 Class B 操作**；**出网（egress）免费**；免费额度仅适用 Standard 存储类。
  - **Durable Objects**：官方确认 Free 计划可用，但**仅限 SQLite 后端**；Free 每账户存储 **5 GB**、最多 **100 个 DO 类**、单个 DO 最大 **10 GB**。
  - 结论：小型导航应用用 **D1（SQL，适合链接/分类数据）** 或 **KV** 做持久化，均落在免费额度内，无需 VPS。

- **数据存活（重启/休眠/不活跃）**：Workers 的 isolate 会被回收，但数据不存在 isolate 里；写入 D1/KV/R2/Durable Objects 的数据在重启、休眠、长期不活跃后**仍然保留**，由存储产品的服务端持久化保证。官方未提供「不活跃即删除」的条款；Free 计划到期的是**每日操作额度**（UTC 00:00 重置），不是数据本身。D1 Free 提供 **7 天** Time Travel 恢复能力。

- **是否免费到永远**：**是**，依据是官方将其定义为一份常设计划而非试用——Workers pricing 页首句「By default, users have access to the Workers Free plan」，且产品页与文档以 Free/Paid 两档并列展示额度。Pages 官方标注「Available on all plans」，其免费计划同样常设。注意：Cloudflare 保留调整额度的权利，官方未承诺额度永不变更。

- **试用额度**：**未找到官方 trial credit 计划**。Workers/Pages 没有「试用额度」概念——免费使用的是常设 Workers Free / Pages Free 计划本身；Paid 计划为最低 **$5 USD/月**的付费订阅。切勿把 Workers Free 的每日额度与「试用 credit」混为一谈。

- **是否需要信用卡**：**否**。官方 Cloudflare Workers 产品页与 Pages 产品页均写明「Start building for free — no credit card required」（免费开始构建，无需信用卡）。升级到 Workers Paid（$5/月起）才需要付款方式。

- **数据存放地区**：部署在 Cloudflare 全球边缘网络（官方称 **335+ 城市**，产品页另称 330+），Workers 代码与静态资源按边缘分发，Workers 本身不提供用户可选区域；D1/KV/R2 为全球分布式存储，R2 另有 jurisdiction 选项（本任务未涉）。官方未承诺免费版数据落在特定国家/地区。

- **中国大陆可达性**：**无可靠证据（服务层面有官方证据，延迟层面无）**。官方证据：Cloudflare China Network 明确「Delivering content quickly and securely to users in Mainland China requires infrastructure within China itself. Traffic routed through servers outside the country faces significant latency and reliability issues due to China's network boundaries.」该 China Network 由京东云（JD Cloud）运营，**必须先拥有 Enterprise 计划**，再单独订阅 China Network 包，并取得 **ICP 备案**、经 JD Cloud 内容审核后方可启用。即：**Workers/Pages 免费计划不含大陆境内节点**，免费版流量走境外边缘，官方未给出任何大陆延迟数字；本机无法实测，故不写具体延迟。`*.workers.dev` / `*.pages.dev` 默认域名的可达性亦无官方保证。

- **部署形态**：Pages 支持 Git 连接自动构建、Direct Upload（直传预构建产物）、C3 CLI；Workers 支持 Wrangler CLI / C3 / Dashboard，静态资源与 Worker 脚本**一次部署为同一单元**（`assets.directory`）。两者都是边缘 Serverless / 静态托管，无需自管服务器；Pages Functions 与 Workers 同源计费。Workers 还独有 Durable Objects、Cron Triggers、更完整 Observability 等（官方迁移指南列出差异矩阵）。

- **自定义域名与备案**：两者都支持自定义域名；Workers Custom Domain 要求该域名处于一个**已接入 Cloudflare 的 active zone**（DNS 托管在 Cloudflare），Cloudflare 会自动创建 DNS 记录并签发证书；`workers.dev` 子域开箱即用，官方建议生产用自定义域名/路由，否则按 Free website 对待。**备案方面**：若要让域名在大陆境内合法提供 Web 服务，需 ICP 备案；官方路径是 Enterprise + China Network（含 ICP 与 JD Cloud 审核）。免费版无官方备案/大陆接入方案。

- **2025–2026 近期变更**：
  - **2025-04-08**（Developer Week）官方博客《Your frontend, backend, and database — now in one Cloudflare Worker》宣布 Workers 支持静态资源托管，并给出关键定调原文：「Now that Workers supports both serving static assets and server-side rendering, **you should start with Workers**. Cloudflare Pages **will continue to be supported**, but, going forward, **all of our investment, optimizations, and feature work will be dedicated to improving Workers**.」——Pages 不会被关停，但不再是投入重点。
  - Pages 文档总览页顶部常驻提示（抓取于 2026-10-01）：「Are you sure you want to use Pages? Workers supports most Pages use cases and offers a broader feature set. It is Cloudflare's primary platform for building applications. **Start new projects with Workers.**」
  - Pages 官方 release notes 中最后一则实质性功能条目为 **2025-04-18**（Node.js 18 EOL 提醒），其后无新功能投入条目；Pages limits 页仍在更新（页面标注 Last updated **2025-09-05**，正文最后更新 Sep 5, 2026），说明文档仍维护。
  - Workers 免费计划现已覆盖：静态资源、Durable Objects（SQLite 后端）、D1、KV、R2 等（各文档确认 Free 可用）。官方未将 Pages 标记为 deprecated，但明确 Workers 是「primary platform」。

- **对本需求的结论**：用户（中国大陆、无 VPS、小型导航应用、需持久化、只要免费）**可以零成本落地，但大陆访问体验无官方保障**。推荐路径：**Workers Free + Static Assets（免费不限量）+ D1 Free（5 GB / 5 万行读/日级额度足够小型导航）+ 自定义域名**，无需 VPS、无需信用卡；Pages 也能做（500 构建/月、2 万文件、带宽不限），但官方已建议新项目用 Workers，新项目应选 Workers。**唯一硬伤**是免费版不在大陆境内节点：官方只提供 Enterprise + ICP + 京东云的 China Network，免费版走境外边缘，大陆可访问性与延迟**无可靠证据**，需自行实测。若大陆直连是硬指标，Cloudflare 免费方案不构成有官方保障的答案。

- **置信度**：high

- **来源（查证日期 2026-10-01）**
  - https://developers.cloudflare.com/workers/platform/pricing/ — Workers Free 100,000 请求/日、10 ms CPU/次；静态资源请求免费不限量；无 egress/带宽费用；Paid $5/月与单价（抓取成功）
  - https://developers.cloudflare.com/workers/platform/limits/ — 免费计划逐项限制：CPU 10 ms、内存 128 MB、Worker 体积 64 MiB（未压缩）、100 个 Worker、50 子请求、静态资源 20,000 文件/25 MiB；请求体 100 MB（抓取成功）
  - https://developers.cloudflare.com/pages/platform/limits/ — Pages Free：500 构建/月、1 并发、20,000 文件、25 MiB/文件、100 自定义域名、100 项目（抓取成功）
  - https://developers.cloudflare.com/pages/functions/pricing/ — Pages Functions 与 Workers 共用 100,000/日免费请求；静态资源请求免费不限量（抓取成功）
  - https://developers.cloudflare.com/pages/ — 官方提示原文「Workers supports most Pages use cases… Start new projects with Workers」；Pages 标注 Available on all plans（抓取成功）
  - https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/ — Pages→Workers 迁移路径与能力差异（抓取成功）
  - https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ — 静态资源请求免费不限量、无额外存储成本、免费档 run_worker_first 超额返回 429（抓取成功）
  - https://developers.cloudflare.com/d1/platform/pricing/ — D1 Free：5 GB 存储、500 万行读/日、10 万行写/日（抓取成功）
  - https://developers.cloudflare.com/d1/platform/limits/ — D1 Free：10 库/账户、单库 500 MB、Time Travel 7 天（抓取成功）
  - https://developers.cloudflare.com/kv/platform/pricing/ 与 https://developers.cloudflare.com/kv/platform/limits/ — KV Free：1 GB、100,000 读/日、1,000 写/日、1,000 删/日、1,000 list/日、值 25 MiB（抓取成功）
  - https://developers.cloudflare.com/r2/pricing/ — R2 免费层：10 GB-month、100 万 Class A、1,000 万 Class B、egress 免费（抓取成功）
  - https://developers.cloudflare.com/durable-objects/platform/pricing/ 与 https://developers.cloudflare.com/durable-objects/platform/limits/ — Free 计划可用但仅限 SQLite 后端；Free 5 GB/账户、100 类、单对象 10 GB（抓取成功）
  - https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/ — 2025-04-08 官方博客，Pages「will continue to be supported」但全部投入转向 Workers 的原文（页面抓取成功；正文经 HTML 解析取得，`datePublished: 2025-04-08`）
  - https://www.cloudflare.com/developer-platform/products/workers/ — 「Free 100k / day」「CPU Time Free 10 ms / request」与「no credit card required」（抓取成功）
  - https://www.cloudflare.com/developer-platform/products/pages/ — 「All plans come with unlimited sites, seats, requests, and bandwidth」「no credit card required」（抓取成功）
  - https://developers.cloudflare.com/workers/configuration/routing/workers-dev/ 与 https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ — workers.dev 定位与自定义域名需 active zone、自动签发证书（抓取成功）
  - https://developers.cloudflare.com/china-network/ 与 https://developers.cloudflare.com/china-network/get-started/ — 大陆需境内基础设施、Enterprise + China Network 订阅 + ICP 备案 + JD Cloud 审核（抓取成功）
  - https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/release-notes/pages.yaml — Pages release notes，最后功能条目 2025-04-18（抓取成功）
