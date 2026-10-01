## Oracle Cloud Always Free

**一句话结论**：Oracle Cloud Always Free 是唯一提供「永久免费 ARM 虚拟机 + 200 GB 块存储 + 10 TB/月出站流量」的主流云，可跑小型导航应用并持久化；但注册强制信用卡/借记卡验证、无中国大陆与香港区域（最近为东京/大阪/首尔/新加坡）、且空闲实例会被回收。

- **免费额度（具体数字）**
  - **ARM Ampere A1（VM.Standard.A1.Flex）**：每月 1,500 OCPU 小时 + 9,000 GB 小时（官方原文 "the first 1,500 OCPU hours and 9,000 GB hours per month for free"）。官方文档明确："For Always Free tenancies, this is equivalent to 2 OCPUs and 12 GB of memory"（即折算为 2 OCPU + 12 GB 常驻）。可切成 1 台 2 OCPU/12 GB，或 2 台各 1 OCPU。**注意**：网上常见的「4 OCPU / 24 GB」不是当前官方口径，官方 Always Free 文档写的是 2 OCPU / 12 GB。
  - **AMD 微实例（VM.Standard.E2.1.Micro）**：最多 **2 台**；每台 1/8 OCPU（可突发）、**1 GB 内存**、1 个 VNIC + 1 个公网 IP、经互联网最高 **50 Mbps** 带宽（同区域内部/私网/DRG 方向最高 480 Mbps）。
  - **块存储（Block Volume）**：总计 **200 GB**（boot volume 与 block volume 合计），以及 **5 个**卷备份（boot + block 合计）。单实例默认 boot volume 50 GB（文档两处分别写 "default boot volume size of 50 GB" 与 "minimum boot volume size ... is 47 GB"，以 50 GB 为准并注意 47 GB 为最小值表述）。200 GB 全部用完前可自由组合。
  - **对象/归档存储**：Trial 结束后进入 Always Free-only 状态时 **20 GB**（Standard + Infrequent Access + Archive 合计）+ **50,000** 次 Object Storage API 请求/月；若账户仍是付费或 Trial 有额度状态，则是 Standard 10 GB + IA 10 GB + Archive 10 GB。
  - **出站流量（Outbound Data Transfer）**：**10 TB / 月**（官方："you get 10 TB per month of outbound data"）。
  - **Autonomous AI Database**：**2 个** Always Free 实例；每个 **1 OCPU（不可扩展）**、**20 GB 存储（不可扩展）**、Serverless Exadata。并发会话数两处文档不一致：Always Free 资源页写 "Maximum Simultaneous Database Sessions: 20"，Always Free 数据库专页写 "Maximum of 30 simultaneous database sessions"——**以实际控制台为准，按较保守的 20 理解**。HTTP 接口限速约 3–6 个并发用户（超出可能返回 HTTP 429）。
  - **MySQL HeatWave**：1 个单节点系统，**50 GB** 数据/日志存储 + 50 GB 备份存储。
  - **NoSQL Database**：1.33 亿次读/月 + 1.33 亿次写/月 + 3 张表、每表 25 GB（文档另注明 Phoenix 区域）。
  - **负载均衡**：1 个 Flexible Load Balancer（最小=最大 **10 Mbps**）、1 个 Network Load Balancer。
  - **VCN**：Free Tier 租户最多 **2 个** VCN。
  - **其他**：Monitoring 5 亿写入数据点 + 10 亿读取数据点；Notifications 100 万 HTTPS + 1,000 邮件通知/月；Email Delivery 3,000 封/月；Vault 150 个 secret + 20 个 HSM 密钥版本；Logging 10 GB/月（Free Tier 租户）；证书 5 个 CA + 150 张证书。

- **持久化存储**：**有**。200 GB 块存储（boot volume + 可挂载 block volume）为持久化块设备，实例终止前数据保留；另有 20 GB 对象存储、卷备份 5 个。官方明确块存储必须创建在租户的 **home region** 才享受 Always Free，建在其他区域会计费。Always Free 数据库不支持手动/长期备份，也不支持 restore（要备份须升级付费）。

- **数据存活（重启/休眠/不活跃）**：
  - 计算实例**重启/关机再开机数据保留**（boot volume 持久）；但**空闲计算实例会被回收**：官方定义 —— 在 **7 天**窗口内，若 **CPU 95 分位利用率 < 20%**、**网络利用率 < 20%**、**内存利用率 < 20%**（内存项仅适用 A1 形态）三条同时成立，Oracle 可判定为 idle 并回收该 Always Free 实例。
  - **30 天不活跃账户**：官方 FAQ 原文 "Accounts left idle for 30 days or more may be deemed abandoned and become eligible for suspension or termination."（账户闲置 30 天以上可被判为弃用，进而被暂停或终止）。
  - Always Free 数据库：**连续 7 天不活跃自动停止**（保留数据，连接或执行 SQL 会重置计数）；停止/不活跃累计 **90 天**可能被回收并永久删除。

- **是否免费到永远**：**是（有前提）**。依据：官方文档 "All Oracle Cloud Infrastructure accounts (whether free or paid) have a set of resources that are free of charge in the home region of the tenancy, **for the life of the account**"；FAQ 亦写 "The Always Free services are available for an unlimited period of time." 前提条件：① 资源必须建在 home region；② 不触发空闲回收；③ 账户不因 30 天闲置被终止；④ 遵守一人一号（多开免费号被禁止）。

- **试用额度**：**US$300 云抵扣金，有效期 30 天**（"a US$300 cloud credit ... You'll have 30 days to use it"），可用于全部符合条件的 OCI 服务；30 天到期或额度用尽（先到者）即结束。Trial 到期后有 **30 天宽限期**升级为付费账户，否则 Trial 期间创建的付费资源被回收删除；**Always Free 资源不被回收**。区分要点：**Trial = US$300 / 30 天的一次性额度**；**Always Free = 永久免费额度**，两者独立。

- **是否需要信用卡**：**是**。官方 FAQ 原文："Why do I need to provide credit or debit card information when I sign up ...? ... We use your contact information and credit/debit card information for account setup and identity verification." 接受信用卡及「功能等同信用卡的借记卡」，**不接受**带 PIN 的借记卡、虚拟卡、一次性卡、预付卡。Oracle 可能周期性做小额预授权验证（通常 3–5 天内由银行释放，不实际扣款）。

- **数据存放地区**：数据存放在所选 **home region**，且 Always Free 计算/块存储/数据库**只能在 home region** 创建。官方商用 realm 区域列表（OCI 文档 Regions and Availability Domains）**不含中国大陆、不含香港**。亚太可选最近区域：日本东京 `ap-tokyo-1`、日本大阪 `ap-osaka-1`、韩国首尔 `ap-seoul-1`、韩国春川 `ap-chuncheon-1`（**A1 不能建在春川**）、新加坡 `ap-singapore-1` / `ap-singapore-2`、印度孟买/海得拉巴、澳大利亚悉尼/墨尔本。Free Tier 租户**只能订阅 1 个区域**。注意：Always Free Autonomous AI Database 只覆盖部分区域；若要用 26ai 版本，home region 须是 PHX/IAD/LHR/CDG/SYD/BOM/SIN/NRT 之一。

- **中国大陆可达性**：**本机实测（有证据）**：本机出口 IP 归属 **广州 / 广东 / AS4134 CHINANET（中国电信，中国大陆）**；实测 `https://cloud.oracle.com/` 返回 **HTTP 200，约 1.23 s**，`https://www.oracle.com/cloud/free/` 返回 **HTTP 200，约 2.05 s**（2026-10-01 实测，走 IPv6）。这只能证明**官网/控制台登录页可直连**，**不等于**注册流程、信用卡验证、以及东京/新加坡等实际 region 的 API 与控制台长连接稳定可用。**官方区域列表中没有中国大陆和香港区域**，因此业务流量必然跨境（就近为东京/大阪/首尔/新加坡）。针对「注册是否被墙、资源创建 API 是否稳定」**无可靠官方证据**，不作延迟数字断言。

- **部署形态**：IaaS（VM）。两种 Always Free 计算形态：AMD `VM.Standard.E2.1.Micro`（x86，2 台，各 1 GB 内存）与 Arm `VM.Standard.A1.Flex`（A1，合计 2 OCPU / 12 GB）。可选镜像仅限标记 "Always Free Eligible" 的：Oracle Linux Cloud Developer、Oracle Linux、Ubuntu（E2.1.Micro 另支持 CentOS）。**可跑容器**：可以在这两种完整 Linux VM 上自行安装 Docker/Podman 运行容器并做端口映射——这是标准 VM 用法，但官方 Always Free 服务清单**并未列出** OKE（Kubernetes Engine）或 Container Instances，即**没有官方「Always Free 的托管 K8s / 容器实例」承诺**；OKE 控制面本身不在 Always Free 清单中，其 worker 节点消耗的是计算资源。官方支持资源管理器（Resource Manager/Terraform）来自动化创建整套 Always Free 资源。

- **自定义域名与备案**：无官方证据表明 Oracle 提供 Always Free 的托管 DNS 记录或 SSL 证书服务用于自定义域（Always Free 清单中无 DNS 服务项；证书仅 150 张 CA 签发的证书，且非面向公网 443 托管的通用服务）。**备案**：因无中国大陆区域，服务器不在中国大陆，**不适用中国大陆 ICP 备案**；域名可直接解析到海外 IP，但受跨境网络质量影响。此项**无官方文档直接说明，按区域事实推断**。

- **2025–2026 近期变更**：
  - Oracle 品牌与命名更新：Autonomous Database 在官方文档中已改称 **Autonomous AI Database**；Always Free 文档同步更名为 Always Free Autonomous AI Database。
  - 数据库版本新增 **Oracle AI Database 26ai** 可作为 Always Free 版本（限 PHX/IAD/LHR/CDG/SYD/BOM/SIN/NRT 这些 home region），19c 与 26ai 并存，但 **Always Free 19c 不能升级为 Always Free 26ai**。
  - 免费资源清单新增项（相对早期常见介绍）：Fleet Application Management（每月前 25 个资源免费）、Email Delivery（3,000 封/月）、Console Dashboards（100 个）、Cluster Placement Groups（10–50 个）等。
  - 未发现官方公告宣布取消或缩减 AMD 微实例 / A1 / 200 GB 块存储 / 10 TB 出站等核心 Always Free 额度（截至 2026-10-01）。

- **对本需求的结论**：**可用但门槛与风险都真实存在。** 匹配点：① 需求是「中国大陆、无 VPS、只要免费、要持久化」——Oracle A1 实例（2 OCPU/12 GB，ARM）+ 200 GB 块存储 + 10 TB/月出站，跑一个小型导航应用（静态站或轻量后端 + SQLite/Postgres）**资源绰绰有余**，且是官方承诺的 **free forever**（for the life of the account），非试用额度。② 数据持久化满足：boot volume 与附加 block volume 均持久。主要风险与阻碍：① **注册必须信用卡/借记卡验证**（不接受带 PIN 借记卡、虚拟卡、预付卡），大陆用户常见障碍；② **无中国大陆/香港区域**，只能选东京/大阪/首尔/新加坡，跨境网络对终端用户延迟与稳定性有实质影响（本机实测仅验证官网可达，不代表业务链路）；③ **空闲回收政策严格**：7 天内 CPU/网络/内存三指标同时低于 20% 即可能被回收——低流量导航站很可能命中，需用定时任务制造负载规避；④ **30 天不活跃账户可被暂停/终止**；⑤ **一人一号**，多开被封；⑥ **"out of host capacity"**：A1 免费容量紧张，创建时可能反复失败（官方承认并建议换 AD 或等待），这是实践中最常见的坑；⑦ 无 SLA、Only-Always-Free 账户**不能开工单**（仅社区论坛支持）。综合：**如果能过信用卡验证且能抢到 A1 容量，是满足需求的最优免费方案；否则不要把它当作唯一方案。**

- **置信度**：high（核心额度、空闲回收、卡片要求、区域列表、免费期限均有官方一手页面直接支撑；仅并发会话数 20 vs 30 存在官方文档内部不一致，以及大陆可达性中「注册/长连接稳定性」缺乏官方证据）

- **来源（查证日期 2026-10-01）**
  - https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm — 支撑：Always Free for the life of the account；A1 1,500 OCPU 小时 / 9,000 GB 小时 = 2 OCPU/12 GB；E2.1.Micro 2 台、1 GB 内存、50 Mbps；块存储 200 GB + 5 个备份、默认 boot 50 GB、须建在 home region；对象存储 20 GB + 50,000 请求/月；出站流量 10 TB/月；Autonomous DB 2 个、1 OCPU、20 GB、并发 20；NoSQL / MySQL HeatWave / Vault / Monitoring / Email / Logging 额度；**空闲回收 7 天 CPU 95 分位 <20%、网络 <20%、内存 <20%（A1）**；VCN 上限 2。
  - https://www.oracle.com/cloud/free/ — 支撑：US$300 credit / 30 天；3 步 Free Tier 说明；Always Free 服务清单；"accounts left idle for 30 days or more may be deemed abandoned"；必须提供信用卡/借记卡用于身份验证；不接受带 PIN 借记卡/虚拟卡/预付卡；一人一号。
  - https://www.oracle.com/cloud/free/faq/ — 支撑：Always Free "available for an unlimited period of time"；Free Trial 30 天/credits 过期规则；Trial 到期 30 天宽限期；Always Free 资源不被回收；Trial 期间超额 A1 会被 disable 并在 30 天后删除；无 SLA、Always-Free-only 不支持工单；out of host capacity 官方解释；不支持降级。
  - https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm — 支撑：OCI 商用 realm 完整区域列表（**无中国大陆、无香港**，含东京/大阪/首尔/春川/新加坡）；A1 不可建在 South Korea North (Chuncheon) 的对应说明见 Always Free 文档；Trial/Free Tier/Pay-as-you-go 租户**限 1 个订阅区域**。
  - https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/doc/autonomous-always-free.html — 支撑：Always Free Autonomous AI Database 2 个、20 GB、**30 并发会话**、HTTP 接口限速约 3–6 并发用户；不支持备份/restore/Data Guard；**7 天不活跃自动停止、90 天累计可能被回收删除**；26ai 仅限 PHX/IAD/LHR/CDG/SYD/BOM/SIN/NRT。
  - https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengoverview.htm — 支撑：OKE 为托管 K8s 服务、支持 managed/self-managed/virtual nodes；**未声明 Always Free 额度**（用于确认「官方 Always Free 清单不含 OKE」）。
  - https://www.oracle.com/cloud/distributed-cloud/service-availability/ — 支撑：服务在所有商用区域一致性、OKE / Container Registry / Container Instances 属「Containers and Functions」类别（非 Always Free 免费额度证据）。
  - https://www.oracle.com/cloud/price-list/ — **部分有效但无数字**：页面抓到，但价格表由 JS 渲染，抓到的 HTML 中价格为空，**无法据此引用任何单价**。
  - https://www.oracle.com/cloud/data-regions.html 与 https://www.oracle.com/cloud/public-cloud-regions/data-regions/ — **抓取失败（被重定向到 /cloud/distributed-cloud/#service-availability，未渲染出 "Always Free Cloud Services" 区域表格）**：因此「Always Free 各服务的区域可用性表」未能取得，相关结论改用 OCI 文档区域列表与 Always Free 文档中的区域说明。
  - https://www.oracle.com/cloud/cloud-native/kubernetes-engine/pricing/ — **抓取失败（重定向到 /cloud/price-list/#container-engine-kubernetes，价格表 JS 渲染，无数字）**；https://www.oracle.com/cloud/cloud-native/container-registry/pricing/ — **抓取失败（HTTP 404）**。
  - 本机实测（非网页来源，2026-10-01，本机出口 IP 113.100.124.156 归属 Guangzhou / Guangdong / CN / AS4134 CHINANET）：`cloud.oracle.com` HTTP 200 / ~1.23 s；`www.oracle.com/cloud/free/` HTTP 200 / ~2.05 s。
