# 发布指南

核对日期：2026-11-11。本轮未购买托管，也未部署付费完整服务。

建议先发布免费样例站；需要让访客实时生成时，再选择 **Render 单实例＋持久盘**。这是按当前 Node HTTP 服务和文件存储结构作出的建议。

| 选择 | 适合的用途与费用 |
| --- | --- |
| GitHub Pages | 免费公开仓库的静态展示：浏览指定的预生成样例。Pages 只托管 HTML/CSS/JS，不能运行本项目的生成后端。[官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) |
| Render | 完整应用首选。付费 Web Service 从 US$7/月起，持久盘 US$0.25/GB/月；另计适用的流量等费用，创建时复核报价。持久盘可保留重启及重新部署后的文件。[官方价格说明](https://render.com/articles/best-netlify-alternatives-in-2026)、[磁盘文档](https://render.com/docs/disks) |
| Railway | 完整应用备选。Hobby US$5/月，包含 US$5 用量，超额另计；Volume US$0.15/GB/月，CPU、内存及出网按用量计费。[官方定价](https://docs.railway.com/pricing/plans) |

## 免费样例站

在 GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，运行仓库的 Pages 工作流，发布静态构建产物。该模式只展示经过选择的公开研究样例，关闭实时生成，不放 API 密钥。[工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

仓库工作流运行 `npm test` 与 `npm run build:demo -- --base=/scholar-persona/`；本地可用同一构建命令及 `npm run preview:demo -- --base=/scholar-persona/` 检查项目子路径。示例只发布元数据和解读，不转载论文摘要全文。

## 完整应用：Render 最短路径

1. 导入 GitHub 仓库，创建 **Web Service**，Language 选 **Docker**，使用仓库根目录的 Dockerfile；启动入口为 `npm start`。[Docker 部署](https://render.com/docs/docker)
2. 选择付费单实例，添加持久盘，挂载到 `/var/data`。Render 只保留挂载路径内的数据；带盘服务限单实例，重新部署会有短暂停机。[磁盘规则](https://render.com/docs/disks)
3. 设置以下服务端环境变量；`PORT` 使用平台注入值，替换域名占位符。服务监听 `0.0.0.0`。[端口规则](https://render.com/docs/web-services#port-binding)

```text
HOST=0.0.0.0
PUBLIC_ORIGIN=https://你的服务域名
SCHOLAR_DATA_DIR=/var/data
DEEPSEEK_API_KEY=在平台密钥界面设置
```

云端使用 `DEEPSEEK_API_KEY`，本机 Windows DPAPI bridge 留作开发集成。密钥只供服务器运行时读取，不写入仓库、前端代码、Dockerfile 或构建参数。[DeepSeek 接入](https://api-docs.deepseek.com/)

建议配置 `OPENALEX_API_KEY`：基本请求可匿名，免费 key 提高额度，游标翻页需要 key。[OpenAlex 认证](https://help.openalex.org/api/authentication/)

4. 检查首页、样例、生成进度与报告链接；重启后确认报告、人物图像缓存、`call-budget.json` 和 action 幂等记录仍在。备份及恢复整个数据目录；验收生成仍遵守已有调用授权。

Railway 的等价操作是导入仓库（自动识别根 Dockerfile）、挂载 Volume 到 `/var/data`、设置同样变量，再在 Networking 点击 **Generate Domain**。Volume 运行时才挂载，数据初始化应在启动后执行。[Dockerfile](https://docs.railway.com/builds/dockerfiles)、[Volume](https://docs.railway.com/volumes)、[域名](https://docs.railway.com/networking/public-networking)

## 公网生成的运行约束

本机 **30 次**是本次实验授权额度。公网生成需另定预算，在付费入口配置登录或邀请码、按用户/IP 限速、生成并发上限及服务器侧每日/总调用额度和单次 token 上限，按最高单次费用约束总支出；到限即拒绝，失败计入额度。保留原子预留与 action 去重，先运行单实例。控制完成前用 `SCHOLAR_DISABLE_MODEL=1` 保留样例。

托管与 DeepSeek 分别计费。Railway 可设置 Compute **Hard limit**，达到后停服务；它不限制本应用向 DeepSeek 支付的费用。[费用控制](https://docs.railway.com/pricing/cost-control) DeepSeek 侧使用经批准的小额余额，并结合应用端预算控制；勿把账单提醒当作硬上限。

数据目录留在私有持久盘。当前 UUID 报告链接属于持链接可访问；私人报告需增加用户归属校验。公开仓库和静态产物只保留选定样例，排除用户报告、输入记录、原始模型返回、密钥与本机配置。

保留肖像的来源、作者、许可链接及必要修改说明，随样例一起发布。[Wikimedia 复用要求](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) 报告继续显示实际检索来源、论文抽样和摘要覆盖；Google Scholar 不提供批量数据访问，Scholar 链接不代表抓取到完整成果列表。[Scholar 官方帮助](https://scholar.google.com/intl/en/scholar/help.html#export)

## 其他平台为何暂居次选

Vercel 现支持 Docker 容器（Beta），但仍沿用 Functions 时长限制与临时文件存储：报告、预算和幂等状态要迁到数据库/对象存储，并验证长请求。[容器](https://vercel.com/docs/functions/runtimes/container)、[限制](https://vercel.com/docs/functions/limitations)、[文件系统](https://vercel.com/docs/functions/runtimes#file-system-support)

Cloudflare Workers 已支持部分 `node:http`，需适配 Worker 入口；其 `node:fs` 是内存虚拟文件系统，持久数据需外置。据此，保留现有 Node＋磁盘结构的迁移工作更少。[HTTP 接入](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/)、[文件系统](https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/)
