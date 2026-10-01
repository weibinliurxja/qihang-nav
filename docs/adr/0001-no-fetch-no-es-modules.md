# 本地 file:// 直开，禁用 fetch 与 ES modules

> **状态：已被 ADR-0002 取代。** 本决策的前提（双击 `file://` 打开）已经不成立——站点现在跑在 EdgeOne Pages 的 HTTPS 域名上，数据由边缘函数提供。保留下来的只有一条间接后果：`app.js` 仍然写成经典脚本而非 ES module，这样万一还要用 `file://` 打开也不会白屏。

起始页曾是**双击 `file://` 直接打开**的（并随 OneDrive 同步到各设备），因此链接数据必须写成随页面一起加载的 JS 数组（`data.js`），而不是 `fetch()` 回来的 JSON —— Chrome、Safari、Firefox 都会以 CORS 为由拒绝 `file://` 下的 fetch。同理，两个脚本都用经典 `<script src>` 而不是 `type="module"`，因为模块加载在 `file://` 下同样被当作跨源请求拦截。

代价是放弃了「数据与逻辑分离成纯数据文件」和现代模块语法，这是刻意的：把它们「修好」会导致页面直接白屏。除非同时引入本地 HTTP 服务或改用静态托管，否则不要改回去。
