# 启航导航

个人自用的网址导航起始页。纯静态三文件 + 两个 EdgeOne Pages 边缘函数，没有构建、没有依赖。

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

`dev-server.mjs` 会把 KV 注入成全局变量 `NAV_KV`（**和线上 EdgeOne 的注入方式一致**），
所以本地跑过的代码路径就是线上要跑的那条。数据落在 `data.local.json`，删掉即重置。

## 部署到 EdgeOne Pages

1. 推送到 GitHub 仓库。
2. EdgeOne 控制台 → Pages → 从 Git 仓库导入。
3. 绑定 KV 命名空间，**变量名必须是 `NAV_KV`**。
4. 配置环境变量 `NAV_PASSWORD`（访问口令）。
5. 部署。

之后每次 `git push` 都会自动重新构建部署。

## 两个容易踩的坑（已处理，改动时别踩回去）

1. **KV 的取法**：EdgeOne 把 KV 注入成**以绑定名为名字的全局变量**（`NAV_KV.get(...)`），
   而不是 `env.NAV_KV`。代码里用 `kvOf(context)` 同时兼容全局注入与本地 env 注入。
2. **函数目录必须是 `functions/`**，不是 `edge-functions/` 或 `node-functions/`
   （以官方模板 `pages-containers`… 实测：官方 `functions-kv` / `functions-geolocation` 模板都用 `functions/`）。
