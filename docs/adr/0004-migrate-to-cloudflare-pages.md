# 从腾讯 EdgeOne Pages 迁到 Cloudflare Pages

## 背景

选定 EdgeOne 的理由是大陆可达性（实测 `pages.edgeone.ai` 0.10s、`edgeone.app` 0.63s，比 Cloudflare 快一个数量级）、
官方承诺免费永久、以及有 KV 和边缘函数。项目按 EdgeOne Pages 的约定部署，**构建与部署本身完全成功**
（日志 `Found Functions directory at /functions`，缩略图正确渲染出页面）。

但部署完成后，**站点无法公开访问**。

## 关键发现：EdgeOne Pages 的默认域名不能长期公网访问

控制台分配的域名 `qihang-nav-0gcsb06x.edgeone.cool` 对**所有路径**（含 `/`、`/style.css`）返回：

```
HTTP/1.1 401 Authorization Required
X-EOP-MSG: eo_time missing
```

页面正文：`Site Owner: Click "Preview" in the console for a new link.`

也就是说默认域名要求**带签名的访问链接**（`eo_time` 参数），而该链接由控制台「预览」按钮生成、
**有效期 3 小时**。官方部署指南印证：「您可以通过『预览』按钮生成一个有效期为三个小时的访问链接」，
并「强烈建议您添加自定义域名」。

社区实测进一步明确（[关于我折腾了一晚上 EdgeOne](https://2x.nz/posts/edgeone/)）：

> 不管你的加速区域在哪，都建议绑定自己的域名，否则可能出现访问 401。含中国大陆的区域需要域名备案。

结论：**EdgeOne Pages 免费版实际上要求使用者拥有自己的域名；选「含中国大陆」加速还必须完成 ICP 备案。**
这个限制官方文档没有明写，是部署之后才撞上的。

## 决策：迁到 Cloudflare Pages

代价与收益：

| | EdgeOne Pages | Cloudflare Pages |
|---|---|---|
| 默认域名可用性 | ❌ 仅 3 小时签名预览链接 | ✅ `*.pages.dev` 是真正公网域名 |
| 需要备案 | ✅ 含中国大陆加速必需 | ❌ 不需要 |
| 需要自有域名 | ✅ 必需 | ❌ 不需要 |
| 大陆延迟 | 50ms 以内（备案后） | 实测 0.5–1.4s |

**代码一行未改**：两个函数用的都是标准 Web API（`onRequestGet/Post/Delete`、`Request`/`Response`、
KV 的 `get/put/delete`），`functions/` 目录约定两边相同，而 `kvOf(context)` 当初就写成了
「优先取全局、回退取 `env`」，恰好同时兼容 EdgeOne（全局注入）与 Cloudflare（`env` 注入）。
在 EdgeOne 上暴露的 KV 注入差异，反而成了这次迁移能零改动的原因。

## 后果

- 服务商从腾讯换成 Cloudflare，绑定与环境变量在 Cloudflare 侧重新配置。
- `kvOf()` 里的全局分支现在只在本地 dev-server 生效，但**不要删**——删了本地就跑不到线上那条路径。
- Cloudflare 免费额度（KV 每天 10 万读 / 1000 写）对个人导航页远远够用。
- Cloudflare 的 KV 单键写入有约 1 次/秒的限制。当前设计是保存时整份文档写同一个键，
  单用户不会触及；若将来改成自动保存，需要留意。
