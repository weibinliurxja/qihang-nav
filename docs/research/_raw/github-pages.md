## GitHub Pages

**一句话结论**：GitHub Pages 是免费、永久可用的**纯静态**托管（public 仓库即可），1 GB 站点、100 GB/月软带宽，但**无任何服务端持久化存储**，且明确禁止用作以商业交易或 SaaS 为主的站点，因此只能当作纯前端导航页的静态外壳，不能承担"数据要持久化"的需求。

- **免费额度（具体数字）**
  - 站点体积：发布后的 GitHub Pages 站点不得大于 **1 GB**；源仓库建议上限 **1 GB**（recommended limit）。
  - 流量：**100 GB/月**（*soft* bandwidth limit，软限制）。
  - 构建次数：**10 次/小时**（*soft* limit）；官方明确"**该限制不适用于用自定义 GitHub Actions workflow 构建并发布的站点**"。
  - 部署超时：单次 Pages 部署 **10 分钟**（超过即 timeout）。
  - Pages 产物上限：Pages artifact 为 gzip 压缩的 tar 包，**tar 必须小于 10 GB**，且不得包含符号链接/硬链接。
  - 账户级：每个账号最多 **1 个** user/organization 站点；每个仓库最多 **1 个** Pages 站点。
  - 限流：触发速率限制时返回 HTTP **429**。
  - 仅静态：官方定义 "GitHub Pages is a static site hosting service that takes HTML, CSS, and JavaScript files straight from a repository… optionally runs the files through a build process"。**无服务端运行时、无数据库、无 API 写入能力**。
  - GitHub Actions 免费分钟数：**public 仓库**使用标准 GitHub 托管 runner **完全免费（无分钟上限）**；**self-hosted runner 免费**；官方另列"标准 runner 免费"的三种场景包含 **For GitHub Pages**。**private 仓库**按计划给额度：GitHub Free = **2,000 分钟/月** + **500 MB** artifact 存储 + 每仓库 **10 GB** cache；GitHub Pro = **3,000 分钟/月** + 1 GB；Team = **3,000 分钟/月** + 2 GB；Enterprise Cloud = **50,000 分钟/月** + 50 GB。分钟数每月账单周期开始时重置为满额。
  - 超额度时：官方 "If your account does not have a valid payment method on file, usage is blocked once you use up your quota." —— 即免费账户不会自动扣费，而是被阻断。

- **持久化存储**：**没有任何服务端持久化存储**。官方对 Pages 的定义就是静态文件托管：内容来自仓库里的 HTML/CSS/JS（可经构建流程），构建产物以静态文件形式发布；没有数据库、没有 KV、没有可写文件系统、没有运行时后端。可持久化的只有两类：(1) **仓库里的源码/静态文件本身**（改数据要 commit + 重新部署）；(2) **访问者浏览器端**的存储（如 localStorage/IndexedDB，属于客户端，不跨设备、清缓存即丢）。Pages 只记录访问者 IP 用于安全目的（"the visitor's IP address is logged and stored for security purposes"），不对外开放。

- **数据存活（重启/休眠/不活跃）**：静态文件属于仓库内容，**不存在"实例休眠/重启"概念**，也不会因不活跃而被回收；只要仓库和 Pages 配置在，站点就在。但站点会因**账户计划降级**被自动取消发布：官方明确，从 GitHub Pro 降级到 GitHub Free 时，从 private 仓库发布的 Pages 站点会被 unpublish；把 private 仓库转移到 GitHub Free 个人账号同样会失去 Pages 并下线已发布站点。另外若站点超出配额，GitHub 官方说明"可能无法继续提供服务，或收到 Support 建议降载的邮件（建议加 CDN、改用 Releases、或迁移到别的托管）"。

- **是否免费到永远**：**官方没有任何"永久免费/free forever"措辞**。可核实的依据是：Pages 在 **public 仓库 + GitHub Free** 计划下可用（GitHub Free 本身是长期免费计划，无到期日），且使用标准托管 runner 的 **public 仓库 Actions 免费**、Pages 场景免费。但所有额度均被官方标为 *soft* limit，且 GitHub 保留调整权与限流权（429）。所以准确表述是"当前免费、无到期时间"，而非"承诺永久免费"。

- **试用额度**：**不存在与 GitHub Pages 相关的 trial credit**。Pages 不是试用型产品，它随 GitHub Free 计划长期提供；GitHub Actions 的免费分钟数是**计划自带额度（每月重置）**，不是一次性试用金。核心结论：**Pages 属于 free tier 永久额度（无到期），而不是 trial credit**。

- **是否需要信用卡**：**不需要**。依据：Pages 在 **GitHub Free**（免费注册、无需付费方式）下的 public 仓库即可用；同时 Actions 计费文档写明"If your account does not have a valid payment method on file, usage is blocked once you use up your quota"，即**没有付款方式时超额是被阻断而不是产生欠费**，说明免费路径不强制绑定信用卡。付费仅在你主动升级计划或购买 Actions 超额用量时才需要。

- **数据存放地区**：**无用户可选区域；官方无 Pages 专属地域承诺**。可核实的一手依据是 GitHub 隐私声明："GitHub stores and processes Personal Data in a variety of locations, including your local region, the United States, and other countries where GitHub, its affiliates, subsidiaries, or subprocessors have operations."（即包含美国及其他地区，由 GitHub 决定）。GitHub 的 **data residency（GHE.com）是企业级功能**，与免费 github.com + Pages 无关，免费 Pages 用户不可选择数据落地地区。

- **中国大陆可达性**：**本机实测（2026-10-01）**：`https://octocat.github.io/` → HTTP **200**，耗时约 **0.51 s**；`https://pages.github.com/` → HTTP **200**，约 **0.63 s**。**这是本机网络环境下的实测值，不代表中国大陆全境稳定可用**——GitHub 未发布任何关于中国大陆访问质量/是否会阻断的官方说明，故"大陆全境可达性"结论为**无可靠证据**（不凭感觉写延迟数字）。另需注意：GitHub 官方对大陆用户**不提供 ICP 备案支持**，也从未承诺 github.io 在境内的可用性。

- **部署形态**：**纯静态站点托管**，两种发布源：(1) 直接指定分支/目录（可经 Jekyll 构建）；(2) **自定义 GitHub Actions workflow**（推荐，且**不受 10 次/小时构建软限制约束**）。官方推荐的工作流动作链为 `actions/checkout@v6` → `actions/configure-pages@v5` → `actions/jekyll-build-pages@v1` → `actions/upload-pages-artifact@v4` → `actions/deploy-pages@v4`，部署 job 需 `pages: write` 与 `id-token: write` 权限并使用 `github-pages` environment。**不可运行 Node/Python/PHP 等常驻后端服务**。

- **自定义域名与备案**：支持自定义域名，类型为 **apex domain（`example.com`，A/ALIAS/ANAME 记录）与 subdomain（`www.example.com`、`blog.example.com`，CNAME 记录）**；apex 官方推荐同时配 `www`，GitHub 会自动做两向 301 跳转。HTTPS：2016-06-15 之后创建的 `github.io` 站点**自动走 HTTPS**；自定义域名也支持 HTTPS 并可开启 **Enforce HTTPS**，证书由 GitHub 自动向 **Let's Encrypt** 申请并部署，证书要求域名总长 **< 64 字符**。官方强烈建议先 **verify custom domain** 以防域名接管。关于**备案**：GitHub 官方文档与站点政策**从未提及 ICP 备案**，GitHub 不提供中国大陆备案服务；使用大陆注册域名解析到 Pages 时的备案合规义务属于域名持有者自身，**官方无相关说明（无可靠证据）**。

- **2025–2026 近期变更**：本次抓取未在 GitHub 官方 changelog（`https://github.blog/changelog/feed/`，2026-09 最新）中找到标题含 "Pages" 的独立公告——**未找到官方 Pages 专项变更条目**。可核实的当前官方文档状态（反映近期演进）包括：(1) 工作流文档已使用 `actions/configure-pages@v5`、`actions/upload-pages-artifact@v4`、`actions/deploy-pages@v4`、`actions/checkout@v6`；(2) 文档明确 Pages artifact 为 gzip tar、**tar < 10 GB**、禁止符号/硬链接；(3) 计费文档新增 **Copilot code review 会消耗 Actions 分钟数**（public 仓库仍免费），属新的计费概念；(4) 超额存储单价：共享 artifact/registry 存储 **$0.25 USD/GB/月**、Actions cache **$0.07 USD/GB/月**、自定义镜像存储 **$0.07 USD/GB/月**。

- **对本需求的结论**：**不适合作为"需要持久化"的导航应用后端**。
  - 适合的部分：**完全免费**（GitHub Free + public 仓库）、**无需信用卡**、静态前端 + 自定义域名 + 自动 HTTPS 全部免费、public 仓库 Actions 分钟数无上限、部署简单（push 即发布）。
  - 致命的部分：**没有服务端持久化存储**，Pages 只能托管静态文件；想"保存用户数据/收藏/配置"只有两条路——写回仓库（每次都要 commit + 重新部署，且并发写入会冲突）或存在浏览器 localStorage（换设备/清缓存即丢）。本需求要求"持久化"，Pages 单独无法满足。
  - 附加约束：**明确禁止**把 Pages 当作免费空间跑以商业交易或 SaaS 为主的站点（"not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site… or SaaS"）；个人导航站本身不构成商业用途，合规上没问题，但若日后要变现需迁走。
  - 大陆可达性只有**本机实测**（HTTP 200，约 0.5 s），**无官方全境可用性保证**，也无备案支持。
  - 结论：可作为"**静态外壳 + 客户端存储**"的免费方案（导航链接本身是静态的，这恰好够用）；一旦需要跨设备/多用户的真实持久化，必须引入外部免费后端（又是另一个平台的免费额度问题）。

- **置信度**：high
- **来源（查证日期 2026-10-01）**
  - https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages — Pages 是静态站点托管服务；public 仓库 + GitHub Free 可用；user/org 站点与 project 站点区别；支持自定义域名；访问者 IP 会被记录用于安全。（注：该 URL 302 跳到 `what-is-github-pages`，内容已成功抓取）
  - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits — **禁止商业用途原文**；1 GB 源仓库建议上限；1 GB 发布站点上限；10 分钟部署超时；100 GB/月软带宽；10 次/小时软构建限制且"custom GitHub Actions workflow 不适用"；429 限流；超额后果；教育用途条款。
  - https://docs.github.com/en/billing/concepts/product-billing/github-actions — public 仓库与 self-hosted runner 免费；"标准 runner 免费"包含 **For GitHub Pages**；私有仓库按计划给免费分钟/存储；无付款方式时超额被阻断；存储单价 $0.25 / $0.07 / $0.07 USD。
  - https://raw.githubusercontent.com/github/docs/main/data/reusables/billing/actions-included-quotas.md — 官方额度表原始数据：Free = 500 MB + 2,000 分钟/月 + 10 GB cache/repo；Pro = 1 GB + 3,000 分钟；Team = 2 GB + 3,000 分钟；GHE Cloud = 50 GB + 50,000 分钟。
  - https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages — 支持的域名类型（apex / www / 自定义子域）；apex 与 www 的自动跳转；域名验证与防接管；降级/转移导致 private 仓库 Pages 取消发布。
  - https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https — 全部 Pages 站点支持 HTTPS 与强制 HTTPS；2016-06-15 后 github.io 站点自动 HTTPS；自定义域名证书由 Let's Encrypt 自动签发；域名总长 < 64 字符；Pages 不可用于敏感交易。
  - https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages — 自定义 Actions 工作流部署形态；Pages artifact 为 gzip tar、tar < 10 GB、禁止符号/硬链接；`configure-pages@v5` / `upload-pages-artifact@v4` / `deploy-pages@v4` / `checkout@v6`；`pages: write` + `id-token: write` 权限与 `github-pages` environment。
  - https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement — "International data transfers" 原文：数据存放于本地区域、**美国**及其他 GitHub 及子处理方有业务的国家，无用户可选区域。（生效日期 2026-04-27）
  - https://github.blog/changelog/feed/ — 官方 changelog RSS，抓取成功（37,365 bytes）；检索窗口（至 2026-09-30）内**未发现标题含 "Pages" 的条目**，故「2025–2026 近期变更」一项标注为未找到专项公告。
  - 本机实测（2026-10-01，curl）：`https://octocat.github.io/` HTTP 200 / 约 0.51 s；`https://pages.github.com/` HTTP 200 / 约 0.63 s。
  - **抓取失败**：https://github.com/pricing （两次 `fetch failed`，未能抓到官方定价页，故本文未引用该页任何数字）；https://docs.github.com/en/enterprise-cloud@latest/admin/data-residency/feature-overview-for-github-enterprise-cloud-with-data-residency 与 `about-storage-of-your-data-with-data-residency`（仅返回导航骨架，正文被截断，未引用）；https://github.blog/changelog/label/github-pages/ 与 `label/pages/`（均 HTTP 404）。
