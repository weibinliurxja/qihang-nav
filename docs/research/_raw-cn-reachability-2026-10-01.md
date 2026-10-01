# 本机实测原始记录（中国大陆网络）

- 实测时间：2026-10-01 16:2x–16:5x CST（UTC+8）
- 实测环境：macOS 本机 curl (LibreSSL/3.3.6) + dig + nc，未使用代理/VPN
- 命令形态：`curl -4 -s -o /dev/null -w '%{http_code} total=%{time_total} ip=%{remote_ip}' --max-time 12 https://<host>/`

## 1) HTTPS 可达性（IPv4）

| 域名 | 结果 |
|---|---|
| vercel.app | 超时（000, 12s） |
| pages.dev | 301, 0.82s, 104.18.21.135 |
| netlify.app | 301, 1.12s |
| workers.dev | 超时（000, 12s） |
| edgeone.app | 302, 0.63s, 43.168.176.154 |
| github.io | 301, 0.21s, 185.199.110.153 |
| huggingface.co | 超时（000, 12s） |
| railway.app | 301, 1.25s, 104.18.11.246 |
| onrender.com | 301, 0.96s, 34.83.64.96 |
| fly.dev | 超时（000, 12s）, 77.83.140.34 |
| koyeb.app | TLS 证书错误（self-signed "Kubernetes Ingress Controller Fake Certificate"） |
| deno.dev | 307, 0.96s |
| supabase.co | 307, 0.20s |
| r2.dev | TLS alert handshake failure（SSL alert 40），无对端证书 |
| claw.cloud | TCP 通但 TLS 超时（000, 10s） |
| run.claw.cloud | NXDOMAIN（AliDNS 也不存在） |
| hf.space | 308, 1.65s, Let's Encrypt 证书正常 |
| turso.tech | 200, 0.38s |
| vercel.com | 200, 0.40s |
| cloudflare.com | 301, 0.55s |
| dash.cloudflare.com | 403（未登录，正常）, 0.96s |
| render.com | 200, 2.73s |
| glitch.com | 307, 2.01s |
| northflank.com | 200, 2.80s |
| sevalla.com | 200, 1.69s |
| neon.tech | 308, 3.18s |
| back4app.com | 301, 0.71s |
| val.town | 301, 1.00s |
| cloud.oracle.com | 200, 0.40s |
| deno.com | 000（12s 超时） |
| pages.edgeone.ai / edgeone.ai | 200, 0.10–0.12s |

## 2) DNS 对照（AliDNS DoH 明文解析 vs 本机系统解析）

GFW 投毒的典型特征：解析结果落在与目标毫无关系的境外公司 IP 段（如 `face:b00c`、`199.59.148.96` Twitter、`108.160.x` Dropbox、`202.160.129.37` Yahoo）。

| 探测域名 | AliDNS DoH 结果 | 本机解析结果 | 判读 |
|---|---|---|---|
| zz9probe.workers.dev | 202.160.129.37 | 199.59.150.45 | 双方均为无关 IP → 后缀级投毒 |
| zz9probe.vercel.app | 162.125.32.5 | 199.59.148.96 | 双方均为无关 IP → 后缀级投毒 |
| vercel.app | 128.242.250.148 | 108.160.172.200 | 同上 |
| workers.dev | 157.240.16.50 | 108.160.163.106 | 同上 |
| huggingface.co | 75.126.115.192 | 31.13.83.34 | 同上 |
| fly.dev | 77.83.140.34 | 77.83.140.34 | 已知黑洞 IP |
| zz9probe.netlify.app | 13.215.239.219（AWS 新加坡，真实） | 同 | 未投毒 |
| zz9probe.edgeone.app | 43.168.176.154（真实） | 同 | 未投毒 |
| zz9probe.pages.dev | NOANSWER（不存在） | — | 通配未投毒 |
| r2.dev | 104.18.50.34 / 104.18.54.45（真实 Cloudflare） | 同 | DNS 正常但 TLS 被阻断 |

## 3) SNI 定向阻断的关键证据（claw.cloud）

```
nc -z 172.67.137.200 443            ->  succeeded（TCP 层可达）
curl --resolve cloudflare.com:443:172.67.137.200 https://cloudflare.com/  -> 301, 0.74s
curl --resolve claw.cloud:443:172.67.137.200      https://claw.cloud/      -> 000, 10.0s 超时
```

同一个 Cloudflare 边缘 IP、同样 TCP 可达，仅更换 TLS SNI 就从「通」变成「超时」→ 对该域名存在 SNI 层定向阻断（而非 IP 封锁或 DNS 投毒）。

## 4) TLS 层证据

- `r2.dev`：`openssl s_client` 返回 `ssl/tls alert handshake failure (SSL alert number 40)`，`no peer certificate available` → 握手阶段被中途打断，无法完成 TLS。
- `koyeb.app`：`subject=O=Acme Co, CN=Kubernetes Ingress Controller Fake Certificate`（自签名），即解析到的 34.76.79.153 返回的是与 koyeb.app 无关的默认证书。
- `hf.space`：`subject=CN=hf.space, issuer=Let's Encrypt`，证书链校验通过（Verify return code 0）。

## 5) 局限说明

- 以上是**单点单次**测量（一个网络、一个时刻），只能说明「此刻这条线路上的表现」，不能替代全国范围结论。
- 未使用代理或 VPN；curl 未走系统代理。
- 可达性不等于稳定性，也不代表峰期表现。
