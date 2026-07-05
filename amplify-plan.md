# Amplify 部署 Northstar

将 Northstar（Next.js 15 + Auth.js + Turso）通过 AWS Amplify Hosting 的 Web Compute SSR 从 GitHub 仓库 [`LiamYaoLian/northstar`](https://github.com/LiamYaoLian/northstar) 部署，核心是添加 `amplify.yml` 让服务端环境变量在运行时可用，并在 Amplify Console 配置密钥与 SMTP。

## 待办清单

- [ ] 新增 `amplify.yml`：npm ci、migrate、env 写入 `.env.production`、`npm run build`，`baseDirectory: .next`
- [ ] 可选：新增 `.nvmrc` 锁定 Node 20
- [ ] Amplify Console 连接 GitHub `main`，配置 TURSO/AUTH/EMAIL 等环境变量并启用 SSR logs
- [ ] 首次部署后验证 Magic Link 登录、Turso 数据与核心页面

## 架构概览

```mermaid
flowchart LR
  User[Browser] --> Amplify[Amplify Hosting Web Compute]
  Amplify --> NextJS[Next.js 15 SSR]
  NextJS --> Turso[Turso libSQL]
  NextJS --> SMTP[SMTP Magic Link]
  NextJS --> OpenAI[OpenAI optional]
  GitHub[GitHub main branch] -->|push triggers| Amplify
```

Northstar 已是标准 Next.js 15 App Router 应用，[`middleware.ts`](middleware.ts) 与 [`src/auth.ts`](src/auth.ts) 均可在 Amplify Compute 上运行。仓库已有远程 [`LiamYaoLian/northstar`](https://github.com/LiamYaoLian/northstar)，无需改框架或 adapter。

**关键约束：** Amplify 是无状态环境，[`src/lib/db/index.ts`](src/lib/db/index.ts) 中的本地 `data/northstar.db` 回退**不能**用于生产；生产环境必须使用 Turso 云数据库。

---

## 1. 代码变更（最小化）

### 1.1 新增 [`amplify.yml`](amplify.yml)

Amplify SSR 下，Next.js **服务端**读不到 Console 里配置的环境变量，必须在 build 阶段写入 `.env.production`（[AWS 官方文档](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html)）。

建议内容：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - node --import tsx src/scripts/migrate.ts
    build:
      commands:
        - env | grep -E '^(TURSO_|AUTH_|EMAIL_|OPENAI_|NORTHSTAR_)' >> .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

要点：

- `baseDirectory: .next` — 有 `amplify.yml` 时必须手动指定（Amplify 文档要求）
- `preBuild` 中跑 `migrate.ts` — 每次部署自动同步 Drizzle schema 到 Turso（本地已有 Turso 数据，不会丢失）
- `grep` 写入 `.env.production` — 覆盖 Auth、Turso、SMTP、OpenAI 等**服务端**变量

**不需要**改 [`next.config.ts`](next.config.ts)：`trustHost: true` 已在 [`src/auth.ts`](src/auth.ts) 中启用，Amplify 默认域名下 Magic Link 回调可自动识别 host。

### 1.2 可选：新增 [`.nvmrc`](.nvmrc)

写入 `20`，与 `@types/node` ^20 一致，避免 Amplify 使用旧 Node 导致 build 失败。

---

## 2. Amplify Console 配置（一次性）

### 2.1 创建 App

1. 登录 [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. **Create new app** → 选 **GitHub** → 授权并选择 `LiamYaoLian/northstar`，分支 `main`
3. Amplify 应自动识别为 **Next.js — SSR (Web Compute)**；若未识别，在 App settings 中确认 Platform 为 Web Compute
4. 勾选 **Enable SSR app logs**（便于排查 Auth / API 错误）

### 2.2 环境变量（Hosting → Environment variables）

在 Console 中为 **所有分支**（至少 `main`）添加：

| 变量 | 必填 | 说明 |
|------|------|------|
| `TURSO_DATABASE_URL` | 是 | `libsql://...` |
| `TURSO_AUTH_TOKEN` | 是 | Turso token |
| `AUTH_SECRET` | 是 | 随机字符串，`openssl rand -base64 32` 生成 |
| `EMAIL_SERVER` | 是 | SMTP URL，如 `smtp://user:pass@smtp.resend.com:587` |
| `EMAIL_FROM` | 是 | 发件人，如 `Northstar <no-reply@yourdomain.com>` |
| `OPENAI_API_KEY` | 否 | AI 分类 / 拆解 |
| `OPENAI_MODEL` | 否 | 默认 `gpt-4o-mini` |
| `NORTHSTAR_DEFAULT_USER_EMAIL` | 否 | 仅首次 migration 时关联 legacy 数据 |

**注意：** 这些值会通过 `amplify.yml` 写入 `.env.production` 并打进部署包。这是 Amplify SSR 的推荐做法，但意味着有部署 artifact 访问权限的人能看到它们；Turso token 应使用最小权限 token，并可在泄露时轮换。

### 2.3 保存并首次部署

点击 **Save and deploy**，等待 build 完成（约 3–8 分钟）。

---

## 3. 部署后验证

1. 打开 Amplify 分配的 URL（形如 `https://main.xxxxx.amplifyapp.com`）
2. 访问 `/login`，输入邮箱，确认收到 Magic Link 邮件（非仅 CloudWatch 日志）
3. 登录后检查 `/today`、`/tasks` 数据是否与 Turso 一致
4. 若 Auth 回调失败，在 Console 追加 `AUTH_URL=https://main.xxxxx.amplifyapp.com`（并加入 `amplify.yml` 的 grep 前缀），重新部署

**日志位置：** Amplify Console → 该 App → Monitoring → Hosting compute logs（CloudWatch）

---

## 4. 可选后续

- **自定义域名：** Amplify → Domain management → 添加域名，DNS CNAME 指向 Amplify；更新 `AUTH_URL` 为新域名
- **分支预览：** 每个 PR 分支可自动部署 preview URL（同一套 env vars 或分支级 override）
- **CI 门禁：** 在 merge 前本地 `npm run build && npm run test`（Amplify 默认不跑 test，可在 `amplify.yml` preBuild 加 `npm run test`）

---

## 风险与说明

| 项 | 说明 |
|----|------|
| 本地 DB 回退 | 未设 `TURSO_*` 时 build 可能成功但 runtime 写 ephemeral 磁盘，**生产必须设 Turso** |
| Middleware | Amplify 支持 Next.js middleware；当前 [`middleware.ts`](middleware.ts) 无需改动 |
| 邮件发件域 | 部分 SMTP（Resend/SES）要求验证发件域名，`EMAIL_FROM` 需与已验证域一致 |
| Secrets 暴露 | SSR env 写入 `.env.production` 是 Amplify 官方模式；敏感 key 应定期轮换 |

---

## 实施顺序

1. 提交 `amplify.yml`（+ 可选 `.nvmrc`）到 `main`
2. Amplify Console 连接 GitHub 并配置环境变量
3. 首次 Deploy → 验证登录与数据
4. （可选）绑定自定义域名并更新 `AUTH_URL`
