## Railway

**一句话结论**：Railway 确有官方 free forever 的 Free 计划（$0/月、每月 $1 不可累积 credit），但它只够跑极小的应用；新用户先得一次性 $5 / 30 天试用，Hobby 是 $5/月付费计划，持久化 Volumes 在 Free 计划也可用但仅 0.5 GB。

- **免费额度（具体数字）**
  - **Free 计划**：订阅费 **$0 / 月**，每月赠送 **$1 资源 credit**，**不可跨月累积**（"does not roll over month to month"）。官方博客原文称这笔额度"enough to run a small app for free in perpetuity"。
  - Free 计划每服务默认上限：**1 个副本、0.5 GB RAM、1 vCPU、1 GB 临时存储、0.5 GB Volume 存储、4 GB 镜像大小**。
  - Free 计划每项目最多 **1 个 Volume**。
  - 资源单价（所有计划相同）：RAM **$10 / GB / 月**（$0.000231 / GB / 分钟）、CPU **$20 / vCPU / 月**（$0.000463 / vCPU / 分钟）、网络出站 **$0.05 / GB**、Volume 存储 **$0.15 / GB / 月**。
  - 由此推算：$1 / 月约等于 **0.1 GB RAM 常驻一个月**，或 **0.05 vCPU 常驻一个月**——远低于 Free 计划默认的 0.5 GB / 1 vCPU，所以常驻不休眠的服务会用超 $1 额度。
  - **构建（build）免费**：不收取构建 CPU、内存、基础镜像下载、镜像导出与镜像存储费用。
  - 镜像保留（可回滚窗口）：**Free / Trial 24 小时**，Hobby 72 小时，Pro 120 小时。

- **持久化存储**：有，名为 **Volumes**（挂载到指定路径的持久磁盘）。**Free 与 Trial 计划也可用 Volume**，默认 **0.5 GB**；Hobby 5 GB；Pro 单卷默认 50 GB、可自助扩展到 1 TB。**调整卷大小（resize）只在付费计划（Hobby / Pro）可用**，Pro 及以上可自助扩容到 1 TB，超过 1 TB 需 Enterprise。限制：每个服务只能挂 1 个卷；卷不能与多副本（Replicas）同用；重新部署挂卷的服务会有短暂停机；不支持缩容。I/O 规格为读 **3,000 IOPS**、写 **3,000 IOPS**（所有计划一致）。卷支持手动与自动备份。

- **数据存活（重启/休眠/不活跃）**：
  - **重启/重新部署**：容器本地文件系统是临时的，会丢失；只有写在 Volume 挂载路径上的数据才持久。
  - **休眠**：Railway 的 **Serverless**（旧称 App-Sleeping）需在服务设置里**手动开启**，不会默认休眠。开启后按**出站流量**判定不活跃，**5 分钟后判定空闲**，实际约 **5–10 分钟**后休眠；被访问时自动唤醒，首次请求有冷启动延迟，且**首个请求可能返回 502**。开启 Serverless 会应用到该服务的所有副本。
  - **额度/试用耗尽**：当试用 credit 用尽、或触发 usage 硬上限、或欠费时，Railway 会**停掉工作负载（服务被 stop）**；若在 **30 天内**解决（充值/升级/提高上限），会自动重新部署，超过 30 天需手动从 Removed deployment 重新部署。
  - **Volume 数据删除**：官方 FAQ 表格写明——**Free 或 Trial 计划：到期（expiry）后 30 天删除卷数据**；Hobby 取消后 60 天；Pro 取消后 90 天。Free Trial 文档另写明：**Trial 账号创建的 stateful volume 会在 credit 到期后 30 天被删除**，要保留数据需在试用期内升级。删除卷本身时，卷进入删除队列，**48 小时内可申诉恢复**，之后永久删除。

- **是否免费到永远**：**是（官方明确表述为长期/永久）**。依据：Railway 官方将 **Free** 列为一个正式计划（$0/月，$1/月 credit），且 2025-08-27 官方博客《Bring Back the Free Plan》原文写明 "we will fund your account with $1 of non-rollover credits each month. This is enough to run a small app for free in perpetuity."。需注意：这是官方承诺的长期免费计划，仍受平台条款与未来定价调整约束；且 $1/月额度一旦用尽，服务会被停机而非继续欠费运行。

- **试用额度**：**新用户一次性 $5 credit，30 天有效**（不是每月发放）。$5 用尽或 30 天到期后，自动转为 **Free 计划**（$1/月）。试用可访问与 Hobby 相同的功能，但限制为 **1 GB RAM、共享（非独占）vCPU、每项目最多 5 个服务**；试用默认资源表中为 2 副本、1 GB RAM、2 vCPU、1 GB 临时存储、0.5 GB Volume、4 GB 镜像。**Full Trial vs Limited Trial**：绑定并通过 GitHub 账号验证为 Full Trial（完整网络访问）；未验证为 **Limited Trial**（出站网络受限、仅开放有限端口）。Trial 用户不能自行购买 credit，需先升级到 Hobby。

- **是否需要信用卡**：**注册免费试用不需要信用卡**——官方 Pricing FAQ 明确写 "Can I try Railway without a credit-card? Yes."，并给出免账号的 `ssh railway.new` 免费 VM 途径。**Hobby / Pro 订阅只能用信用卡支付**（"Railway only accepts credit cards for plan subscriptions"），企业可走定制发票。文档未明确声明 Free 计划本身是否需要绑卡；官方博客（2026-08）称"我们差不多算是要求你绑卡才能做平台上的大多数事"，措辞模糊，因此"Free 计划是否需要卡"这一点置信度低于前面的明确结论。付费方式另有变更：文档称自 3 月 30 日起**不再支持预付（prepay）**，须使用后付卡（该条目未标注具体年份）。

- **数据存放地区**：官方部署区域共 4 个，全部在 Railway Metal 上，Trial / Hobby 也可用：**US West Metal（美国加州）`us-west2`、US East Metal（美国弗吉尼亚）`us-east4-eqdc4a`、EU West Metal（荷兰阿姆斯特丹）`europe-west4-drams3a`、Southeast Asia Metal（新加坡）`asia-southeast1-eqsg3a`**。**没有中国大陆或香港节点**。区域可随时切换且不改域名，但**挂了 Volume 的服务切区域需要迁移卷并会停机**。官方建议按合规与用户就近原则选区域，未提供面向特定国家/地区的数据驻留承诺。

- **中国大陆可达性**：**无可靠证据**。官方文档、定价页与状态页均未声明中国大陆境内可达性、未被墙或任何大陆延迟指标；本次也未做本机网络实测（无可靠证据，不凭感觉给延迟数字）。可确认的官方事实仅有：**最近的地理区域是新加坡（Southeast Asia Metal）**，且所有流量走 Railway 自家 anycast 边缘网络。面向大陆用户的实际连通性需自行实测。

- **部署形态**：托管 PaaS / 容器平台（非 VPS）。支持从 **GitHub 仓库、CLI（`railway up`）、Docker 镜像（Docker Hub / GHCR / Quay / GitLab）、模板市场**部署；自动构建 Docker 镜像；支持静态站点、Postgres/Redis 等数据库、Volumes、Cron、私有网络、PR 预览环境、Config as Code。默认是常驻容器，**Serverless 缩容到零需手动开启**。

- **自定义域名与备案**：支持自定义域名：添加 Railway 提供的 **CNAME 与 TXT 两条记录**（两条都必需），并自动签发与续期 **免费 SSL/HTTPS**，另提供 `*.railway.app` 默认域名。**备案**：Railway 无中国大陆节点，托管不在大陆境内，因此不适用中国大陆 ICP 备案流程；官方文档亦未提及任何中国备案支持。面向大陆用户时，域名可达性仍受实际网络状况影响（无可靠证据）。

- **2025–2026 近期变更**：
  - **2025-08-27**：官方博客《Bring Back the Free Plan》宣布重新上线免费计划——新用户 $5 / 30 天，之后每月 $1 不可累积 credit，"in perpetuity"。
  - **2025-09-22**：官方博客《Pricing to Encourage Use》解释免费计划的商业与单位经济逻辑。
  - **Railway Metal 迁移与降价**（2024-12 起分批，2025 年完成主体迁移）：迁移 80% 工作负载到自有硬件后，**网络出站从 $0.10/GB 降至 $0.05/GB，磁盘存储从 $0.25/GB 降至 $0.15/GB**；Trial 与 Hobby 用户也可用全部 Metal 区域。
  - **付费方式**：文档称自 3 月 30 日起不再支持预付 credit，改用后付卡（年份未注明）。
  - **2026-08-17**：官方博客《Railway for Everyone: Deploy for free without a Railway account》宣布免账号部署（`railway.new` / `dev.new`）：免费 Linux VM **2 vCPU / 2 GB RAM**，**60 分钟构建时间**，**24 小时认领窗口**，**每 IP 每天 3 个**；未认领的 box 连同文件被删除。
  - **2026-09-25**：changelog 条目《Free VMs without an account》（标题来自搜索结果；`railway.com/changelog` 与 `railway.com/llms-changelog.md` 均被 bot 校验拦截，**正文抓取失败**，仅标题可确认）。
  - 成本控制：所有计划均可设 usage 硬上限；Hobby 的 Agent 用量默认硬上限 **$5**、Pro **$20**。

- **对本需求的结论（中国大陆、无 VPS、小型导航应用、需要持久化、只要免费）**：
  - **能满足"免费 + 持久化"的最低门槛**：Free 计划 $0/月 + **0.5 GB Volume + 每项目 1 个卷**，用来放一个 SQLite 文件的小型导航站理论上够用；持久化由 Volume 提供，重新部署不丢数据。
  - **但"免费"极为紧张**：每月只有 **$1** credit，而常驻 0.5 GB RAM 一个月就要约 **$5**。要活在 $1 以内，**必须开启 Serverless 让服务休眠**（空闲 5–10 分钟休眠），把月用量压到 $1 以下；这意味着**首访有明显冷启动、首个请求可能 502**，对"随时可打开"的导航站体验较差。
  - **数据风险**：一旦免费额度耗尽导致停机、或因任何原因离开免费状态，**Free/Trial 的 Volume 数据在到期后 30 天被删除**，必须自行做好外部备份（如定期导出到对象存储/GitHub）。
  - **信用卡**：注册试用不需要卡（官方 FAQ），这是它相对 Render 等要求绑卡平台的优势；但只要不绑卡就无法升级 Hobby，也就无法扩容卷或解除资源限制。
  - **大陆可达性未证实**：无官方证据表明大陆可稳定直连；最近节点为新加坡。若面向大陆用户，需自行实测，并考虑前置 CDN 或国内托管替代方案。
  - **备案**：Railway 不涉及大陆 ICP 备案，但这也意味着不能借备案解决大陆访问的合规与速度问题。
  - 综合：**能免费起步且支持持久化，适合做原型/低频访问的小导航站；若要求"随时秒开、稳定可访问大陆"，仅靠 Railway 免费计划不达标**，需接受冷启动与 30 天数据删除风险，或改用别的方案。

- **置信度**：high（Free/Hobby/Trial 的价格与额度、Volumes 免费可用及 0.5 GB 上限、休眠与数据删除策略、区域列表均有官方文档/博客支撑；仅"Free 计划是否需要信用卡"为 medium，官方措辞不明确）

- **来源（查证日期 2026-10-01）**
  - https://docs.railway.com/pricing/plans.md — 计划与订阅价（Free $0、Hobby $5、Pro $20）、默认计划资源表（Free 0.5GB RAM/1 vCPU/0.5GB Volume、Trial 0.5GB）、资源单价（RAM $10/GB/月、CPU $20/vCPU/月、Egress $0.05/GB、Volume $0.15/GB/月）、Hobby/Pro 包含额度、镜像保留策略、Free/Trial 卷数据到期后 30 天删除、Hobby 非免费、预付改为后付卡、Freelance 等
  - https://docs.railway.com/pricing/free-trial.md — 试用为一次性 $5、30 天有效，之后转 Free 计划 $1/月不可累积；Full/Limited Trial 区别与网络限制；`ssh railway.new` 免账号 VM 限额（2 vCPU/2GB、60 分钟构建、24 小时认领、每 IP 每天 3 个）；Trial 卷在 credit 到期后 30 天删除
  - https://docs.railway.com/pricing.md — Free $0/月、$1 免费资源；Hobby $5/月；资源单价汇总
  - https://docs.railway.com/volumes/reference.md — Volumes 在 **Free 与 Trial 计划可用，默认 0.5GB**；Hobby 5GB；Pro 50GB 可扩到 1TB；只对付费计划开放 resize；Free 每项目最多 1 个卷、Trial 3 个；3,000 IOPS 读写；删除后 48 小时内可恢复
  - https://docs.railway.com/pricing/faqs.md — "Can I try Railway without a credit-card? Yes."；只接受信用卡支付订阅；服务被停的四种原因及 30 天内自动恢复；卷不会被随之删除
  - https://docs.railway.com/pricing/cost-control.md — usage 软/硬上限（最低 $10）、Serverless 开启方式、私有网络降 egress
  - https://docs.railway.com/pricing/understanding-your-bill.md — 订阅费为最低用量承诺、$5/$20 包含额度与超额计费、空闲也计费的原因
  - https://docs.railway.com/pricing/credits.md — 促销 credit 仅限新注册，且升级 Hobby 需填信用卡
  - https://docs.railway.com/deployments/serverless.md — 基于出站流量、5 分钟判定闲置、实际 5–10 分钟休眠、冷启动与首个请求可能 502
  - https://docs.railway.com/deployments/regions.md — 四个区域（US West 加州、US East 弗吉尼亚、EU West 阿姆斯特丹、Southeast Asia 新加坡）及卷迁移会停机
  - https://docs.railway.com/platform/railway-metal.md — Metal 区域对所有用户（含 Trial & Hobby）开放；egress $0.10→$0.05/GB、disk $0.25→$0.15/GB；迁移时间线
  - https://docs.railway.com/networking/public-networking.md — 自动 SSL、`*.railway.app` 域名、自定义域名需 CNAME 与 TXT 两条记录
  - https://blog.railway.com/p/free-plan — 2025-08-27 官方博客《Bring Back the Free Plan》：$5/30 天试用 + 之后每月 $1 不可累积 credit，"free in perpetuity"
  - https://blog.railway.com/p/free-plan-part-two — 2025-09-22 官方博客《Pricing to Encourage Use》，免费计划的商业逻辑
  - https://blog.railway.com/p/deploy-without-account — 2026-08-17 官方博客：免账号部署限额（60 分钟构建、24 小时认领、每 IP 每天 3 个、$3 LLM credit）
  - https://blog.railway.com/news — 官方博客新闻索引，用于确认 2025–2026 公告时间线
  - https://railway.com/pricing — **抓取失败**（返回 "Checking your browser…" 人机校验页，未取得任何内容）
  - https://railway.com/changelog 与 https://railway.com/llms-changelog.md — **抓取失败**（同为人机校验拦截）；仅通过搜索结果得知 2026-09-25 存在标题为 "Free VMs without an account" 的条目
  - https://docs.railway.com/llms-full.txt — 抓取成功但内容被截断，未作为任何具体数字的依据
