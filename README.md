# 启航导航

个人自用的网址导航起始页。纯静态三文件 + 两个 Cloudflare Pages Functions，没有构建、没有依赖。

**线上地址**：https://qihang-nav.pages.dev

## 组成

| 文件 | 说明 |
|---|---|
| `index.html` | 单页，图标全部内联 SVG |
| `style.css` | 设计令牌 + 玻璃三档配方 + 四档响应式 |
| `app.js` | 渲染 / 搜索 / 编辑，经典脚本（非 module） |
| `functions/api/data.js` | 数据读写：口令校验 + KV 整份文档读写 |
| `functions/api/icon.js` | 站点图标：服务端抓取 + KV 缓存 + 手动上传 |
| `dev-server.mjs` | **本地预览用，不部署**。直接 import 上面两个函数，只把 KV 换成文件 |
| `docs/` | 开发规范、ADR、术语表、调研记录 |

## 本地预览

```bash
node dev-server.mjs      # 打开 http://127.0.0.1:8788，默认口令 qihang
```

`dev-server.mjs` 会把 KV 注入成全局变量 `NAV_KV`（模拟 EdgeOne 的注入方式），并同时保留
`env.NAV_KV`（Cloudflare 的方式），所以两种运行时的代码路径本地都能跑到。
数据落在 `data.local.json`，删掉即重置。

## 部署（Cloudflare Pages）

已经配好了，日常只需要 `git push`，Cloudflare 会自动构建部署。

关键配置留档，重建项目时照填：

| 位置 | 项 | 值 |
|---|---|---|
| 构建设置 | 框架预设 | 无 |
| 构建设置 | 构建命令 | `exit 0` |
| 构建设置 | 构建输出目录 | `/` |
| 变量和密钥 | `NAV_PASSWORD` | 访问口令 |
| 绑定 | KV 命名空间，变量名 | `NAV_KV` |

## 三个容易踩的坑（已处理，改动时别踩回去）

1. **KV 的取法**：EdgeOne 把 KV 注入成**以绑定名为名字的全局变量**（`NAV_KV.get(...)`），
   Cloudflare 则走 `env.NAV_KV`。代码里用 `kvOf(context)` 兼容两者，别改成单一写法。
2. **函数目录必须是 `functions/`**。官方 EdgeOne 模板实测用的是 `functions/`；
   Cloudflare Pages 也是同一约定。不要改成 `edge-functions/` 或 `node-functions/`。
3. **Cloudflare 新版控制台默认走 Workers 流程**，那条路不认 `functions/` 目录。
   创建项目时要走「需要使用旧版 Pages 工作流？继续前往 Pages」那个入口。

## 站点的运维小事

- **图标抓不到怎么办**：部分站点（如 bilibili）会拦截机房 IP，图标会退回「识别色方块 + 首字」。
  在编辑模式里给那个站点手动传一张图即可，手动图标优先级最高且不会被自动抓取覆盖。
- **改口令**：Cloudflare 项目 → 设置 → 变量和密钥 → 改 `NAV_PASSWORD` → 重新部署。
  本地 `.env` 里的也要同步改。
