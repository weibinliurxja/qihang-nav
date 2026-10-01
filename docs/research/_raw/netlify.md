## Netlify

**一句话结论**：Netlify Free 是真正的「$0 forever 永久免费」计划，但自 2025-09-04 起新账号改为 credit 制：每月 300 credits 硬上限，带宽/请求/函数按 credit 折算，超限后**全站（所有项目）暂停**而非删除，无需信用卡，内置 Blobs 与 Netlify DB（Postgres）持久化。

- **免费额度（具体数字）**
  - **Credit-based Free（2025-09-04 起的新账号）**：$0/month，**300 credits/month，硬上限（hard limit），不能购买附加 credits、无 auto recharge**。所有项目共享这 300 credits。
  - credit 折算率（官方）：Production deploy **15 credits/次**；Compute **10 credits/GB-hour**；Web bandwidth **20 credits/GB**；Web requests **2 credits/10,000 次请求**；AI inference **180 credits / $1 USD** 模型消耗；Forms 提交 **免费且不限量**。
  - 不计费的项：**Deploy Previews 与 branch deploys 0 credits**、**失败部署 0 credits**、**回滚（rollback）0 credits**。
  - 换算成单一维度的上限（仅作理解，实际是共享池）：300 credits ≈ 15 GB 带宽，或 ≈ 150 万次 web 请求，或 ≈ 30 GB-hour 函数计算。
  - 并发构建：Free **限 1 个并发构建**（Personal 1 个、可 $40/月再加且最多 3；Pro 3 个）。
  - 项目数：Free/Personal/Pro 均为 **500 个项目**上限；Free 只能有 **1 个 Team Owner**。
  - **Legacy Free / Starter（2025-09-04 前的老账号，仍保留）**：带宽 **100 GB/月**（Free 为硬上限；Starter 超出 $55/100GB）、构建 **300 分钟/月**（Free 硬上限；Starter 超出 $7/500 分钟）、Serverless Functions **125,000 次调用/站点/月**、Edge Functions **1,000,000 次调用/月**、Form 提交 **100 次/站点/月**、并发构建 1。
  - 注意：Credit-based 计划**不再单独计算 build minutes**（构建时长不再是独立计量项，改为生产部署 15 credits/次）。

- **持久化存储**：**有，两种官方原语，Free 计划也可用。**
  - **Netlify Blobs**：key/value + 非结构化对象存储，站点级 store（跨 deploy 保留）或 deploy 专属 store；单对象 **最大 5 GB**、metadata **最大 2 KB**、store 名 **≤64 bytes**、object key **≤600 bytes**；对象在静态加密/传输加密；最终一致性默认（更新/删除 60 秒内传播），可选 strong。Blobs 本身**无独立免费容量数字**，其读写按上面的带宽/请求/函数 compute 计入 credits。
  - **Netlify Database（托管 Postgres）**：Free 计划 **3 个数据库、20 个活跃分支、7 天备份保留**；限额为单库 **max 1 compute unit**、单计费周期 **48 database compute units**、**写入 5 GB**、**带宽出 5 GB**、**存储上限 5 GB**；sleep-on-inactivity 固定 5 分钟。

- **数据存活（重启/休眠/不活跃）**：静态站点无「休眠」概念；Netlify Database 有 sleep-on-inactivity（Free 固定 **5 分钟**空闲后休眠），休眠只影响唤醒延迟，不删数据。**credits 用尽后不是删除，而是暂停（paused）**：所有项目返回 `Site not available`，不再接收请求/表单，也不能触发新的生产部署；下个计费周期开始自动恢复。关于「站点是否因长期不活跃被删除」：**未找到官方来源明确说明存在按不活跃时长删除站点的政策**。官方可查证的自动删除只针对**非关键的旧 deploy（超过 90 天的 deploy 会被批量自动删除，且不会删除当前已发布的 deploy 或某分支最新成功 deploy）**；官方支持指南还说明 Free/Starter 团队**无法主动删除团队**（只能删整个用户账号）。故本项结论：**不活跃不导致站点删除（无官方删除政策证据）**。

- **是否免费到永远**：**是（Free 计划）**。依据：官方定价页 Free 计划标明「**$0 forever** / Build and deploy free forever」；官方文档写明「**$0/month, forever, for 300 credits/month with a hard limit**」，并明确「You'll never be charged for the Free plan」。官方博客（2024-11-12）亦写「**free forever with no financial risk**」。注意：这是「永久免费额度」，不是试用额度。

- **试用额度**：**无。官方 Billing FAQ 明确写「We do not have a free trial but you can test out Netlify on the free plan.」**。不存在 trial credit；只有每月重置的 300 credits（不可累积/不过期结转）。

- **是否需要信用卡**：**Free 计划不需要信用卡**。依据：官方博客「**Deploy with no credit card required** and no fees. Ever.」；官方 Billing FAQ 只写「You must have a valid payment method saved to your Netlify account to keep your web projects active with the **Personal or Pro** Credit-based plans」，即支付方式要求仅针对付费计划。Free 无 auto recharge，也无可购买附加 credits。

- **数据存放地区**：Netlify Blobs 官方支持 **5 个区域**：`us-east-1`（N. Virginia）、`us-east-2`（Ohio）、`eu-central-1`（Frankfurt）、`ap-southeast-1`（Singapore）、`ap-southeast-2`（Sydney）。**站点级 store 默认落 `us-east-2`，且不会跟随 Functions 区域**（需在每次 `getStore` 显式传 `region`）；deploy 专属 store 默认跟随 Functions 区域。**Netlify Database 的数据区域在本次抓取的官方文档中未说明**，故为「未找到官方来源」。静态资源由全球 CDN 分发。

- **中国大陆可达性**：**本机实测：netlify.app 可达，1.12s（委派任务提供的数据）**。**官方证据：无。** 官方文档/定价页未提供中国大陆节点、中国大陆加速或备案相关说明；本次未找到可验证的中国大陆可达性的官方来源。故除实测外写「无可靠证据」，不给延迟估计。

- **部署形态**：静态站点/前端框架（Git 连接、CLI、API、拖拽上传）+ Serverless Functions + Edge Functions + 托管 Postgres（Netlify Database）+ Blobs + 全球 CDN + Image CDN。Free 计划可用 Functions 与全部数据原语；新账号项目**默认私有（private），需显式 publish 才对公网可见**。

- **自定义域名与备案**：Free 计划即支持**自定义域名 + 自动 SSL（Let's Encrypt）**（官方定价页 Free 列有「Add Custom domains with SSL」，文档亦列 Custom domains with SSL 对 Free **&check;**）。**中国大陆 ICP 备案：官方未提供备案服务或备案相关文档，未找到官方来源**；Netlify 无中国大陆区域节点，若有大陆合规要求需自行评估。

- **2025–2026 近期变更**
  - **2024-11-12**：推出 Free 计划，取代 Starter；当时口径为 100 GB 带宽 / 300 构建分钟 / 12.5 万函数调用 / 100 万边缘函数调用 / 10 GB 存储，且「no credit card required」。
  - **2025-09-04**：**新账号全面改为 credit-based 定价**（Free 300 credits、Personal $9/1,000 credits、Pro $20/3,000 credits）；老账号成为 Legacy 计划，价格不变但**切换到 credit 计划后不可回退**。
  - **2026-04-14**：Pro 计划**取消座位费（unlimited seats，$20/月）**；Form 提交改为**全计划免费不限量**；同时上调计量费率——**带宽 10 → 20 credits/GB、Compute 5 → 10 credits/GB-hour、Web requests 3 → 2 credits/10k**。官方称 98% 客户账单不变或下降。
  - **2026-07-14**：Pro 推出 **5 档 monthly credit tiers**（3,000 / 5,000 / 10,000 / 15,000 / 20,000，$20–$126/月），5,000 及以上支持 rollover。
  - **Deploy 保留策略**：非关键 deploy 超过 **90 天**自动删除（不含当前已发布 deploy 与各分支最新成功 deploy）。

- **对本需求的结论**（用户：中国大陆、无 VPS、小型导航应用、需持久化、只要免费）：**可用，属于合理选项之一。** 理由：(1) 真正免费永久、无需信用卡、无试用陷阱；(2) Free 即可用 Blobs 或 Postgres 做持久化，并支持自定义域名 + SSL；(3) 纯静态导航站 + 少量 Blobs 读写的资源消耗很小——按官方费率粗算，约 1 GB/月带宽（20 credits）+ 5 万请求（10 credits）+ 少量函数 compute，通常远低于 300 credits/月。风险与注意事项：(1) **300 credits 是全站共享的硬上限，一旦用尽所有项目一起暂停**，需自行监控（官方在 50%/75%/90%/100% 发通知）；(2) 若走 Netlify DB，Free 单库仅 1 compute unit、5 GB 存储、5 GB 出网、48 compute units/周期，且**官方称数据库存储自 2026-07-01 起将开始计费、费率「提前公布」——截至查证日（2026-10-01）本次未抓到已公布的费率文档**，存在成本不确定性，建议轻量场景优先用 Blobs 或纯静态 JSON；(3) **无官方中国大陆可达性/备案保证**，仅本机实测 netlify.app 1.12s，大陆用户体验需另行实测验证。

- **置信度**：high

- **来源（查证日期 2026-10-01）**
  - https://www.netlify.com/pricing/ — Free「$0 forever」、300 credit limit/month、各计量费率（部署 15、compute 10 credits/GB-hour、带宽 20 credits/GB、请求 2 credits/10k）、Pro unlimited members、自定义域名与 SSL 属于 Free。
  - https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans.md — 2025-09-04 新账号转 credit 制、Free 300 credits 硬上限、并发构建 1、500 项目、Netlify DB 3 库/20 分支/7 天备份、Forms 免费、非计量项。
  - https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work.md — credit 用量细则、**credits 用尽后全部项目暂停并返回 `Site not available`**、月度 credits 不结转。
  - https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans.md — **无免费试用**、暂停与恢复、500 项目、支付方式要求仅 Personal/Pro、Free 不可加购。
  - https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-legacy-plans/legacy-pricing-plans.md — Legacy Free/Starter 的 100 GB 带宽、300 构建分钟、125k 函数调用、1M 边缘函数调用、100 表单提交、1 并发构建。
  - https://www.netlify.com/blog/introducing-netlify-free-plan/ — 2024-11-12 推出 Free 计划：**free forever、no credit card required**、100 GB/300 分钟/10 GB 存储口径。
  - https://www.netlify.com/blog/new-pricing-credits/ — 2025-09-04 credit-based 定价公告、老客户不强制变更、Personal $9。
  - https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/ — 2026-04-14：Pro 无限座位、Forms 免费、带宽 10→20、Compute 5→10、Web requests 3→2。
  - https://www.netlify.com/changelog/2026-07-14-pro-plan-credit-tiers/ — 2026-07-14：Pro 五档 credit tiers 与 rollover。
  - https://www.netlify.com/blog/pricing-netlify-for-3-billion-builders/ — 2026-04-14 CEO 公告，确认计量费率调整与「无隐藏费用」口径。
  - https://docs.netlify.com/build/data-and-storage/netlify-blobs.md — Blobs 对象上限（5 GB/2 KB/600 bytes/64 bytes）、store 类型、一致性与 **5 个区域**、站点级 store 默认 us-east-2。
  - https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage.md — Netlify DB 计量（10 credits/unit、20 credits/GB）、**存储至 2026-07-01 免费、之后费率待公布**、Free 限额（3 库、20 分支、48 compute units、5 GB 写入/带宽/存储）。
  - https://docs.netlify.com/build/data-and-storage/netlify-database.md — Netlify Database 仅限 credit-based 计划、存储免费至 2026-07-01。
  - https://docs.netlify.com/build/functions/usage-and-billing.md — 函数按 GB-hour 计费、默认 1024 MB 内存、credit-based 无免费调用额度（Legacy 为按调用计费）。
  - https://docs.netlify.com/build/functions/overview.md — Functions 形态与能力（未给出 Free 专属调用次数上限）。
  - https://docs.netlify.com/manage/projects/disable-project.md — 项目可 disable/enable，用于停止消耗资源，不会删除。
  - https://www.netlify.com/blog/automated-deploy-cleanup-and-new-deploy-retention-policies/ — 非关键 deploy 超过 90 天自动删除，不影响生产站点与源码。
  - https://answers.netlify.com/t/website-missing-link-broken/129280/8 — 官方论坛确认 90 天自动删除 deploy 与「保留最新成功 deploy」机制（用于佐证不涉及站点删除）。
  - https://answers.netlify.com/t/support-guide-how-to-cancel-an-account/10856 — 官方支持指南（Support Team 2025 年 8 月复核）：Free/Starter 团队无法删除，只能删用户账号。
  - https://www.netlify.com/legal/terms-of-use/ — 服务条款（Last Updated 2026-03-26），索引页；未包含不活跃站点删除条款。
  - 抓取失败：https://www.netlify.com/pdf/self-serve-subscription-agreement.pdf/（HTTP 返回 PDF，工具不支持该 content type，未能读取内容）。
  - 抓取失败（404）：https://docs.netlify.com/manage/accounts-and-billing/billing/free-plan/、https://docs.netlify.com/platform/limits/、https://docs.netlify.com/build/functions/limits/（旧/错误路径，已用新路径替代）。
