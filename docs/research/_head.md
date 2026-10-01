# C. 2026 年个人免费托管平台调研（中国大陆可达性 × 数据持久化）

- **查证日期**：2026-10-01（UTC+8）
- **查证方式**：子代理逐个平台核对**官方一手来源**（官方定价页、官方限额/配额文档、官方状态页、官方变更日志/公告）；官方页面抓取失败的条目明确标注「抓取失败」，不以第三方博客充数。
- **实测方式**：在本机（中国大陆网络，无代理/VPN）用 `curl` / `dig` / `nc` / `openssl s_client` 实测域名可达性与阻断类型，原始记录见 `_raw-cn-reachability-2026-10-01.md`。
- **目标场景**：一个轻量的个人网址导航应用（静态站或小型容器/单二进制），**数据必须持久化**，**只要免费**，**没有 VPS**，**中国大陆使用**。

---

## 0. 先回答那个最重要的问题

> **「一个需要持久化存储的小型自托管应用，在 2026 年有没有真正免费、无需信用卡、且中国大陆可稳定访问的托管选择？」**

**答案：不是「只有 Cloudflare 一家」，但确实只有两家真正同时满足全部条件 —— Cloudflare（Pages/Workers + D1/KV）与腾讯 EdgeOne Pages（Pages Functions + KV）。**

两者的共同点是：**永久免费额度（不是试用点数）+ 不需要绑卡 + 自带持久化 KV/数据库 + 中国大陆实测可达**。差别在取舍：

| | Cloudflare（Pages/Workers + D1 或 KV） | 腾讯 EdgeOne Pages |
|---|---|---|
| 大陆可达性 | `pages.dev` 实测 0.82s 通；但 `workers.dev` 被 DNS 投毒、完全不可达 | `edgeone.app` 302/0.63s，`pages.edgeone.ai` 200/0.10s，**明显更快** |
| 持久化 | D1 5 GB SQL / KV 1 GB / R2 10 GB（对象） | KV 1 GB（账户级），Blob 存储 |
| 免费永久性 | 官方明文长期 Free plan（D1 FAQ：「will always include…for free」） | 定价页 FAQ：「免费版本将**永久**提供」 |
| 卡门槛 | 注册流程无付款步骤 | 无卡门槛，但**中国境内用户需注册并实名**才拿到访问链接 |
| 主要风险 | 大陆无境内节点（China Network 仅 Enterprise + ICP）；`workers.dev` 不可用，必须用 Pages 子域或自有域名 | 免费版函数/KV 的**具体月度配额数字官方未公开成表**，需在控制台「用量概览」查看；注册实名 |

**被排除的常见候选，以及排除的硬理由**（详见下文各节）：

- **Oracle Cloud Always Free** —— 额度真实且永久（2 OCPU/12 GB ARM + 200 GB 块存储），**但注册强制信用卡/借记卡**，直接违反「无需信用卡」；另有 7 天空闲回收与 30 天账户不活跃暂停。
- **Render** —— 免费 Web Service 永久免费，但**免费层不给持久磁盘**（只有临时文件系统），且**免费 Postgres 30 天后过期删除**。数据必然丢，违反「不能因为免费额度就定期丢失」。
- **Railway / Zeabur / Koyeb / Fly.io / ClawCloud** —— 要么只有试用点数，要么要绑卡，要么免费容器无持久卷，且 ClawCloud 在中国大陆存在 SNI 定向阻断、控制台域名已 NXDOMAIN。
- **Hugging Face Spaces** —— 免费 Space 的持久存储是付费特性，且 **`huggingface.co` 在大陆被 DNS 投毒、完全不可达**（托管运行时 `hf.space` 反而可达，但没有控制面）。
- **Vercel / Netlify / GitHub Pages** —— Vercel 在大陆彻底不可达（`vercel.app` 与全部子域 DNS 投毒）；Netlify 可达但**无持久化存储**（Blobs 是最终一致的对象存储且无数据库）；GitHub Pages 纯静态、官方明令不得当作通用存储/CDN。三者都只能当「静态站托管」，装不下导航应用的可写数据。

**结论一句话**：如果只想要一个答案 —— **首选腾讯 EdgeOne Pages（大陆最快、有 KV）；其次 Cloudflare Pages/Workers + D1（额度最大、生态最成熟，但 `workers.dev` 在大陆不可用，须用 Pages 域名或自有域名）。** 其余「免费容器」平台在 2026 年没有任何一家能同时满足「免费 + 不绑卡 + 真持久化」。

---
