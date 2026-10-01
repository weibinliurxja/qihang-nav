# D. 腾讯 EdgeOne Pages / Makers 评估

- 查证日期：2026-10-01
- 查证人：主 agent（非子代理）
- 用语：EdgeOne Pages 与 EdgeOne Makers 是同一产品线，官方文档中两个名字混用

## 结论摘要

EdgeOne Pages 是 Cloudflare Pages 的**功能对等物**，且在**中国大陆可达性上显著优于** Cloudflare。它同时具备：免费且官方承诺永久、持久化 KV/Blob 存储、边缘函数与云函数、以及**托管层的一键密码保护（免费）**。

唯一未落实的是：免费版函数/KV 的**具体每月配额数字**（官方文档页被导航撑爆，未抓到表格）。

## 已核实的能力

### 1. 免费且官方承诺永久

定价页 FAQ 原文：

- 「免费计划会长期提供吗？」→「**是的，我们的免费版本将永久提供！**」
- 「超出用量限制了怎么办？」→「在推出收费版之前，**即使超出免费版的用量限制也不会中断服务**。」
- 免费版权益列表：Git/AI 部署、自动 CI/CD、全球 CDN、**Cloud Functions 和 Edge Functions**、AI Agents、内置模型、**Blob 和 KV 存储**、Copilot。

来源：https://pages.edgeone.ai/zh/pricing

常见问题页补充：「EdgeOne Pages 提供**长期免费**的用量套餐……**不限量的网站安全加速流量与请求额度**；每月定额的**函数调用、KV 存储及项目构建次数**」，具体配额需在控制台首页「用量概览」查看。

来源：https://edgeone.cloud.tencent.com/pages/document/162936949996421120

### 2. 持久化存储（KV + Blob）

KV 存储官方定义：「多边缘节点部署的 **KV 持久化数据存储**……遵循最终一致性，并确保 **60s 内全球同步**」。

硬限制（来自官方文档）：

| 项 | 限制 |
|---|---|
| 账户存储容量 | **1 GB**（一个 EdgeOne Pages 账户对应一个 KV 账户） |
| 命名空间 | 每个账户 **10 个** |
| key | ≤ 512 B，仅支持数字、字母及下划线 |
| value | ≤ 25 MB |
| 调用位置 | **仅支持在 Edge Functions 中调用** |
| API | `put` / `get` / `delete`（get 可指定 text/json/arrayBuffer/stream） |

来源：https://edgeone.cloud.tencent.com/pages/document/162936897742577664

### 3. 真认证：托管层密码保护，免费

产品页明确写着这是「**免费私人页面托管**」：

- 「几秒钟为任意页面加上访问密码——**完全免费**，无需自建登录系统，**也不用写任何服务端代码**。」
- 「不需要。保护能力在**托管层**实现——开启开关并设置密码，任何访客都必须先输入密码才能看到页面。」
- 「安全。**校验发生在文件通过 HTTPS 返回之前**，受保护内容不会出现在页面源码中，也无法通过直链绕过访问。」
- 「加密页面不会被 Google 收录。」

来源：https://pages.edgeone.ai/zh/use-cases/password-protect-web-page

另有「内部应用」方案页，提供企业 SSO（钉钉/企业微信/飞书/Google/Microsoft/自定义 OIDC）、零信任准入、审计日志，并明确写「支持 **Git、直接上传和 AI 编程工具部署**，**一键开启密码保护，无需改造应用**」。

来源：https://pages.edgeone.ai/zh/solutions/internal-apps

**注意**：Drop（直接上传）形态下的密码保护已由产品页确认为免费；「Git 部署 + 带 Functions 的项目」是否同样支持一键密码保护，页面措辞支持但未见到明确的操作文档，需在控制台实测。

### 4. 运行时能力

- **Edge Functions**：标准 Web Service Worker API（Request/Response/Headers/Cache/Cookies/Fetch/ReadableStream/Web Crypto），支持 `onRequestGet/Post/Put/Delete/Patch` 等 handler、动态路由 `[id]` 与 `[[default]]`、环境变量 `env`、`waitUntil`。
- **Cloud Functions**：支持 **Node.js / Python / Go**。
- **全栈框架**：Next.js / Nuxt / Astro / React Router / SvelteKit / TanStack Start / Vike 零配置。

来源：https://edgeone.ai/document/162227908259442688

### 5. 迁移路径

官方提供从 **Cloudflare Pages**、Vercel、Netlify 迁移到 EdgeOne Pages 的指南。

来源：https://edgeone.cloud.tencent.com/pages/document/162936949996421120（迁移指南目录）

**这意味着：为 Cloudflare Pages 形态写的开源导航项目，可以直接搬到 EdgeOne 上。**

## 中国大陆可达性（本机实测）

| 域名 | 结果 |
|---|---|
| `edgeone.app` | 302，**0.63s** |
| `pages.edgeone.ai` / `edgeone.ai` | 200，**0.10–0.12s** |
| 对照：`pages.dev` | 301，0.82s |
| 对照：`github.io` | 301，0.21s |
| 对照：`netlify.app` | 301，1.12s |
| 对照：`vercel.app` | 超时（DNS 投毒） |
| 对照：`workers.dev` | 超时（DNS 投毒） |

官方宣称 3200+ 全球边缘节点，其中亚洲 2500+。

## 风险与未决项

1. **免费版配额数字未知**：函数调用次数、KV 读写次数、构建次数的具体月度上限未从官方文档取到。控制台「用量概览」可见。
2. **中国境内用户必须注册**：产品页写明「根据当地法律法规，**中国境内用户需注册并登录控制台才能获取域名访问链接**，其他地区用户无需注册即可使用」。未注册部署的链接**仅 1 小时有效**。注册大概率需要实名认证。
3. **国际站 vs 中国站**：中国站控制台 `console.cloud.tencent.com/edgeone/makers`；国际站 `console.tencentcloud.com/edgeone/makers`（定价页的注册入口指向国际站）。两条路径的实名要求可能不同，未核实。
4. **带 Functions 的 Git 项目能否用密码保护**：页面措辞支持，但缺少明确操作文档。
5. **未找到专为 EdgeOne Pages 写的开源导航项目**：需要从 Cloudflare Pages 形态的开源项目里选，再按官方迁移指南搬过来。
