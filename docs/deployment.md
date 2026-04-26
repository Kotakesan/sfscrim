# SFScrim デプロイ手順

SFScrim は **Cloudflare Workers** にデプロイされます（`@opennextjs/cloudflare` 経由）。本ドキュメントは初回セットアップから本番運用までの手順をまとめたものです。

> ℹ️ Issue タイトルでは「Cloudflare Pages」と表記されている箇所がありますが、`wrangler.jsonc` / `open-next.config.ts` の構成上、デプロイ先は Workers (with assets binding) です。

---

## 構成概要

```
GitHub push (main) ──▶ .github/workflows/deploy.yml
                       └─ deploy-prod    ──▶ wrangler deploy        ──▶ Cloudflare Workers (本番)
GitHub PR open    ──▶ .github/workflows/deploy.yml
                       └─ deploy-preview ──▶ wrangler versions upload ──▶ Cloudflare Workers (プレビュー)
                                                                          └─ PR にコメントで preview URL 通知
```

| ジョブ | トリガー | 動作 |
|---|---|---|
| `deploy-prod` | `push` to `main` | `pnpm exec opennextjs-cloudflare build` → `wrangler deploy` |
| `deploy-preview` | `pull_request` | 上記 build → `wrangler versions upload` → preview URL を PR にコメント |

両ジョブとも **`vars.DEPLOY_ENABLED == 'true'`** が無いとスキップされます（ガード）。

---

## 初回セットアップ（手動）

### 1. Cloudflare API token を作成

Cloudflare ダッシュボード → My Profile → API Tokens → **Create Token**

「Edit Cloudflare Workers」テンプレートをベースに、以下の権限を含む token を作成：

- **Account** → Workers Scripts → Edit
- **Account** → D1 → Edit
- **Account** → Account Settings → Read（Account ID 検証用）

→ 生成された token を控える（再表示できない）。

### 2. Cloudflare Account ID を取得

Workers & Pages ダッシュボード右側のサイドバー、または以下で取得：

```bash
pnpm wrangler whoami
```

### 3. GitHub Secrets / Variables を設定

リポジトリの Settings → Secrets and variables → Actions:

**Secrets**:
- `CLOUDFLARE_API_TOKEN` = （手順 1 の token）
- `CLOUDFLARE_ACCOUNT_ID` = （手順 2 の Account ID）

**Variables**:
- `DEPLOY_ENABLED` = `true`

> `DEPLOY_ENABLED` を未設定 / `false` のままにしておくと、deploy.yml は何もしない状態を維持します（CI 履歴が無駄に汚れない）。

### 4. D1 本番データベースを作成

```bash
pnpm wrangler d1 create sfscrim-db
```

出力された `database_id` を `wrangler.jsonc` の `PLACEHOLDER_RUN_WRANGLER_D1_CREATE` に置き換える：

```diff
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "sfscrim-db",
-     "database_id": "PLACEHOLDER_RUN_WRANGLER_D1_CREATE",
+     "database_id": "<手順 4 で出力された UUID>",
      "migrations_dir": "migrations"
    }
  ],
```

その上で本番 migration を適用：

```bash
pnpm db:migrate:prod
```

### 5. 初回デプロイ確認

ローカルから手動で deploy を試す（任意）:

```bash
pnpm run deploy
```

成功したら、`DEPLOY_ENABLED = true` を設定した状態で main に変更を push。GitHub Actions の `deploy-prod` が走り、Cloudflare Workers にデプロイされる。

---

## ローカル開発・プレビュー

```bash
# OpenNext 経由で Workers エミュレーションを起動
pnpm preview
```

D1 の local instance（`.wrangler/state/v3/d1/`）を使うので、本番 DB に影響しない。

---

## トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| GitHub Actions の deploy ジョブが起動しない | `vars.DEPLOY_ENABLED` が `true` になっているか確認 |
| `Authentication error` | `CLOUDFLARE_API_TOKEN` の権限不足。Workers Scripts:Edit / D1:Edit を再確認 |
| `D1_ERROR: no such database` | `wrangler.jsonc` の `database_id` が placeholder のまま、または本番 migration 未適用 |
| Preview URL が PR にコメントされない | `wrangler-action` の `deployment-url` output は `versions upload` で常に取得できるとは限らない。Cloudflare ダッシュボード → Workers & Pages → 該当 Worker → Versions から確認 |

---

## 関連ファイル

- `.github/workflows/deploy.yml` — デプロイワークフロー
- `wrangler.jsonc` — Cloudflare 設定
- `open-next.config.ts` — OpenNext 設定
- `migrations/` — D1 schema migration
