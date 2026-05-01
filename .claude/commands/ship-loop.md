---
name: ship-loop
description: SFScrim 専用ワークフロー — simplify → PR 作成 → review ループ → approve でマージ → 次の issue へ
---

# /ship-loop — SFScrim ワークフロー

issue 実装が完了したら必ずこのコマンドを使う。`gh pr create` / `gh pr merge` は hook によりこのワークフロー経由でしか通らない。

> ⚠️ ユーザー個人の汎用 `/ship` skill（PR 作成までで停止する別物）と区別するため、本プロジェクトでは **`/ship-loop`** という名前で運用している。`/ship` を呼ばないこと。

## 🌳 ブランチ運用（本番リリース後）

本番リリース済のため、開発フローは Git Flow ベースの 2 段階:

```
feature/* / chore/* / fix/*  ← develop から切る
        ↓ PR (base: develop)
     develop  ← merge で開発環境 (sfscrim-dev.sf6.workers.dev) に自動デプロイ
        ↓ PR (base: main, 本番反映タイミングで手動)
       main   ← merge で本番 (sfscrim.sf6.workers.dev) に自動デプロイ
```

**ship-loop 中の base ブランチは常に `develop`**。`main` への merge は本番リリースタイミングで人間が判断（複数 develop の変更を 1 本にまとめて main に上げる運用も可）。

## 🛑 最重要：Claude が止まりやすい節目

過去の運用で **「Skill ツールから戻った直後にテキスト応答を返してターン終了」** という失敗が複数回発生している。これは ship-loop が「自動継続」を期待しているのに、Skill 戻りが「ターンの自然な終端」になることで Claude が止まる罠。

**対策（厳守）**:

1. **Skill `/review` を使わない**。代わりに **Agent tool で独立レビュアーを並列起動** する (Step 5 参照)。Agent 戻りは tool result としてメインターンに帰るので ship-loop 自動継続が壊れない。Skill 経由だと「Skill 完了 = 応答節目」になって止まる
2. **マーカー発行は Write tool で行う**（後述）。Bash redirect (`>`) は権限プロンプトで止まりやすい
3. **`APPROVED` 判定後はテキスト応答を返さず、即座に次の Bash/Write tool 呼び出しを行う**。1 文字も返してはならない
4. **「指摘あり」判定後も同じく、即座に修正の Edit/Write/Bash を呼ぶ**。「修正します」とテキスト返してから止まらない

## 全体フロー

```
1. /simplify でコード整形・冗長削除（変更が UI/機能なら必須、ドキュメント/CI 設定のみなら省略可）
2. コミット & push
3. Write tool で .claude/.simplify-done に現ブランチ名を書き込み
4. gh pr create --base develop  ← hook が .simplify-done を検証して通す（→ 削除）
5. Agent tool で独立レビュアー (correctness / security / a11y) を**並列起動**して PR diff をレビュー（Skill /review は使わない）
6. レビュー判定:
   ├ "APPROVED" → break、即 Step 7 へ（応答テキスト返さない）
   └ 指摘あり → 修正 Edit/Write/Bash を即座に実行 → コミット → push → Step 5 に戻る（応答テキスト返さない）
7. Write tool で .claude/.review-approved に現ブランチ名を書き込み
8. gh pr merge --squash --delete-branch  ← hook が .review-approved を検証して通す（→ 削除）
9. ローカルで develop を pull、issue ブランチを削除
10. 次の open issue を選んで develop から checkout → 実装開始（再帰的に /ship-loop）
11. open issue が 0 になったら停止
```

## 実装手順（Claude が従うべき詳細）

### Step 1: /simplify を実行

`/simplify` Skill を呼ぶ。コードの冗長削除・整形・無駄なロジック検出を行う。指摘があれば修正する。

> 例外：差分が「ドキュメント / CI 設定 / リネーム」のみで、コード再利用・品質・効率の観点が実質ゼロの PR では、Skill 起動の重さに見合わないので **手動チェックでスキップして良い**。スキップする場合は PR 本文で「simplify はドキュメント PR のため省略」と明記。

### Step 1.5: 画面変更がある PR はスクリーンショット必須

ページ追加 / route 追加 / UI コンポーネント変更 / レイアウト変更が含まれる PR は、**Playwright MCP でスクショを取って PR に含める**。

手順:
1. `pnpm dev` を background で起動
2. `mcp__playwright__browser_navigate` → `mcp__playwright__browser_take_screenshot` で必要画面を撮影
3. `docs/screenshots/issue-{N}/{場面名}.png` に保存（リポジトリにコミット）
4. PR 本文で `![desc](https://raw.githubusercontent.com/Kotakesan/sfscrim/{branch}/docs/screenshots/issue-{N}/foo.png)` 形式で参照
5. dev サーバを停止

撮るカット例：主要画面 / モバイル幅（880px 以下）/ 多言語切替（ja & en）/ エラー状態。

「画面変更なし」（schema / CI / docs / lib のみ）の PR ではスクショ不要。

### Step 2: コミット & push

```bash
git add -A
git commit -m "<conventional commit message>"
git push -u origin "$(git symbolic-ref --short HEAD)"
```

### Step 3: マーカー発行（Write tool で）

```
Write(file_path: ".claude/.simplify-done", content: "<branch-name>\n")
```

`.claude/settings.local.json` で `Write(.claude/.simplify-done)` を always allow にしておけば確認プロンプトなしで通る。Bash の `>` redirect は権限評価で詰まりやすいので使わない。

### Step 4: PR 作成

```bash
gh pr create --base develop --title "<title>" --body "<body>"
```

**`--base develop` を必ず指定**。デフォルト base は main なので忘れると本番直行 PR になってしまう。

hook が `.simplify-done` を検証 → 通過 → マーカー削除。

### Step 5: review（Agent 並列起動 — Skill `/review` は使わない）

PR 作成直後に **Agent tool で独立レビュアーを並列で** 起動する。各 Agent は `gh pr view <PR>` と `gh pr diff <PR>` を自分で取得して PR を独立な視点で評価し、HIGH / MEDIUM の指摘のみ返す。

**起動するレビュアー**:

1. **correctness** — 仕様準拠 / エッジケース (null, undefined, 空配列) / race condition / エラー経路 / 無効入力ハンドリング / 周辺コードへの副作用
2. **security** — 秘密漏洩 / 認可バイパス / XSS / SQL injection / CSRF / 入力サニタイズ / OWASP top 10 / 依存パッケージの既知脆弱性
3. **a11y** — UI 変更 (page / route / component の追加・改修) を含む PR のみ。キーボード操作 / コントラスト / aria 属性 / 色だけのシグナリング / focus 管理 / screen reader

UI 変更を含まない PR (i18n のみ / config のみ / docs のみ など) では a11y agent はスキップして良い。

**Agent 起動例** (1 回の message に並列で複数 Agent tool call):

```
Agent 1 (correctness): "PR #N をレビュー。`gh pr view N` と `gh pr diff N` を取得して、以下の観点で HIGH / MEDIUM のみ報告: 仕様準拠 / エッジケース / null / race / エラー経路。"
Agent 2 (security):    "PR #N をレビュー。`gh pr view N` と `gh pr diff N` を取得して、以下の観点で HIGH / MEDIUM のみ報告: 秘密漏洩 / 認可 / XSS / SQL / CSRF / OWASP top 10。"
Agent 3 (a11y):        "PR #N をレビュー。`gh pr view N` と `gh pr diff N` を取得して、UI 変更箇所を a11y の観点で HIGH / MEDIUM のみ報告: キーボード / コントラスト / aria / 色だけシグナリング / focus。"
```

判定:
- 全 Agent が「指摘なし / clean」を返したら **APPROVED**
- HIGH / MEDIUM の指摘がある場合は **指摘あり**。LOW の指摘は無視

> **なぜ Skill `/review` を使わないか**: Skill ツールは完了時に「ターンの自然な終端」となり、Claude が応答テキストを返してそこで止まりやすい。Agent tool は通常の tool result としてメインターンに帰るのでこの問題がない。
>
> **なぜ self-review (Bash + メインターンの目視) ではなく Agent 並列なのか**: 自分で書いたコードを自分で読むと確証バイアスで観点が漏れる。独立 Agent は実装時のコンテキストを持たないため、より公平にレビューできる。`/simplify` (commit 前) と `/review` (PR 後) は観点が補完的なので両方走らせる。

### Step 6: レビュー判定とループ

判定結果に応じて **必ず即座に** 次のアクションを実行する。テキスト応答で止まらない。

- **APPROVED** → 即 Step 7 の Write tool 呼び出しへ
- **指摘あり** → 即 Edit/Write で修正 → `git commit & push` → Step 5 に戻る

ループ最大回数: **5 回**。それを超えたら停止して人間の判断を仰ぐ。

### Step 7: 承認マーカー発行（Write tool で）

```
Write(file_path: ".claude/.review-approved", content: "<branch-name>\n")
```

### Step 8: マージ

```bash
gh pr merge <PR> --squash --delete-branch
```

hook が `.review-approved` を検証 → 通過 → マーカー削除。

### Step 9: ローカル整理

```bash
git checkout develop
git pull origin develop
git branch -d <feature-branch>   # 既に消えていればエラー無視で OK
```

### Step 10: 次の issue へ

```bash
gh issue list --state open --json number,title --jq 'sort_by(.number) | .[0]'
```

0 件なら停止メッセージを出して終了。あれば:

```bash
git checkout -b "feat/issue-<番号>-<slug>"   # develop から派生
```

issue 本文を読んで実装に着手 → 完了したら再び `/ship-loop`。

### 本番反映（develop → main、ship-loop の対象外）

`ship-loop` は **develop までで完結**。develop に蓄積した変更を本番に反映するときは、別途人間が判断してこの PR を作る:

```bash
gh pr create --base main --head develop --title "release: <date or summary>" --body "<release notes>"
```

merge すると main に push が走り、`deploy.yml` の `deploy-prod` ジョブが本番デプロイを実行。

## 失敗時の動作

- /simplify が失敗 → 停止（人間が修正）
- self-review が 5 ラウンド以上 approve しない → 停止（人間が判断）
- gh pr create / merge が hook で blocked → /ship-loop フローに戻ってマーカーから再発行
- マージ衝突 → develop を pull → 解消してから retry
- 受け入れ基準が Cloudflare アカウント等の外部リソース操作を要求 → ローカルで完結する範囲を実装し、外部操作を別 issue に切り出す（例: #19）

## CLAUDE への指示（厳守）

- **このワークフロー以外で `gh pr create` / `gh pr merge` を呼ばない**
- **マーカー発行は Write tool**（Bash redirect で書かない）
- **Skill `/review` は使わない**。代わりに Step 5 で **Agent tool 並列起動** によるレビューを実行
- **review 判定後（APPROVED でも指摘ありでも）テキスト応答を返さず即座に次の tool 呼び出しを実行**
- 5 回ループしても approve が出ない場合は人間に判断を仰ぐ
- 全 issue が完了したら停止メッセージを出して終了
- ユーザー個人の汎用 `/ship` skill は別物。`/ship-loop` を使うこと
