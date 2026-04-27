# CLAUDE.md

このリポジトリは **SF6 チーム戦運用 Web アプリ** の開発リポジトリです。
アプリ名：SFScrim
読み方：エスエフスクリム
「SFS」まで大文字、「crim」は小文字 を厳守する

ストリートファイターリーグ（SFL）公式ルール準拠のオーダー管理 / 試合運用ツールを提供します。

---

## 🚢 開発ワークフロー（最重要・必読）

**issue 実装後は必ず `/ship-loop` コマンドを使う。`gh pr create` / `gh pr merge` の直接実行は hook で禁止されている。**

### ブランチ運用（本番リリース後）

本番リリース済のため Git Flow ベースの 2 段階デプロイ:

```
feature/* / chore/* / fix/*  ← develop から切る
        ↓ PR (base: develop)
     develop  ── push で sfscrim-dev.sf6.workers.dev に自動デプロイ
        ↓ PR (base: main, 本番反映タイミングで人間が判断)
       main   ── push で sfscrim.sf6.workers.dev = 本番に自動デプロイ
```

- **ship-loop の base は常に `develop`**。`gh pr create --base develop` を使う
- 本番反映は別途 `gh pr create --base main --head develop --title "release: ..."` を人間が立てる
- 本番 D1: `sfscrim-db` / 開発 D1: `sfscrim-db-dev`（独立、データ汚染なし）

> ⚠️ ユーザー個人の汎用 `/ship` skill（PR 作成までで停止する別物）と区別するため、本プロジェクトでは **`/ship-loop`** を使う。`/ship` を呼ぶと個人版が起動して merge → 次 issue checkout まで進まないので注意。

### `/ship-loop` の流れ

```
/simplify → commit & push → PR 作成 → /review ループ
                                       ├ APPROVED → merge → 次の issue へ
                                       └ 指摘あり → 修正 → /review
```

詳細は `.claude/commands/ship-loop.md` を参照。

### 強制力（hook）

- `.claude/settings.json` の PreToolUse hook が `gh pr create` / `gh pr merge` を監視
- マーカーファイル（`.claude/.simplify-done` / `.claude/.review-approved`）が無い・期限切れ・branch 不一致 なら BLOCK
- マーカーは `/ship-loop` フロー内でのみ発行される
- 直接 `gh pr create` を叩くと exit 2 で止まる

### 連続ループ

`/ship-loop` は完了後、自動で次の open issue を checkout して再帰的に走る。**open issue が 0 件になったら停止**。

### 画面変更 PR はスクリーンショット必須

ページ追加 / route 追加 / UI 変更を含む PR は **Playwright MCP で撮ったスクショを PR に必ず含める**。`docs/screenshots/issue-{N}/*.png` にコミットし、PR 本文で `raw.githubusercontent.com` URL で参照する。詳細は `.claude/commands/ship-loop.md` Step 1.5 を参照。

### 🛑 Claude が止まる罠と対策（最重要）

過去のセッションで **Skill ツール（/simplify や /review）から戻った直後にテキスト応答を返してターン終了** という失敗が複数回発生している。Skill 戻りは Claude にとって「ターンの自然な終端」に見えるが、ship-loop は自動継続を期待しているのでこれが致命的。

**対策**:
1. **Skill `/review` を使わない**。Bash で `gh pr view <PR>` + `gh pr diff <PR>` を取得して、**メインターン内で self-review** する
2. **マーカー発行は Write tool**（Bash の `>` redirect は権限プロンプトで止まりやすい）。`.claude/settings.local.json` の `permissions.allow` に `Write(.claude/.simplify-done)` / `Write(.claude/.review-approved)` を入れて always allow にしておく
3. **判定後（APPROVED でも指摘ありでも）テキスト応答を返さず即座に次の tool 呼び出しを実行**
   - APPROVED → 即 Write tool で `.review-approved` → `gh pr merge` → develop 同期 → 次 issue checkout
   - 指摘あり → 即 Edit/Write で修正 → `git commit & push` → 再 self-review

詳細は `.claude/commands/ship-loop.md` を参照。

### 二段防御

- **ローカル層**: hook がマーカー検証 → `gh pr create/merge` を制御
- **GitHub 層**: `main` / `develop` ブランチ保護で **CI（lint / typecheck / build）必須** → CI 落ちたらマージ不可

`.github/workflows/ci.yml` が PR ごとに 3 ジョブを走らせる：
- `lint` (`pnpm lint`)
- `typecheck` (`pnpm typecheck`)
- `build` (`pnpm build`)

→ ローカルでマーカー偽装してもブランチ保護がマージを拒否する。

---

## プロジェクト概要

- **目的**: SF6 上位プレイヤー / スクリム運営者向けに、配信中の手入力オーダー管理を解消する Web アプリを提供する
- **主な機能**: オーダー入力（先鋒/中堅/大将 + 控え）、SFL ルール準拠の試合進行管理、出場義務トラッキング、4v4 対応、多言語対応（日 / 英）
- **配布戦略**: フリーミアム（広告収益 + Phase 2 で Pro 課金）。最初の配布先は立川 CR スクリム鯖

---

## ルール・仕様の確認ルール（最重要）

**SFL の試合ルール、ポイント計算、ホーム/アウェイ、出場義務などに関わる実装を行う前に、必ず `docs/sfl-rules.md` を読むこと。**

### 該当する作業の例

- 勝利ポイント計算ロジックの実装
- ホーム/アウェイの切替処理（プレイオフ / グランドファイナル）
- 出場義務トラッキング（プレイオフ / グランドファイナル）
- レギュラーシーズン / プレイオフ / グランドファイナル のモード切替
- レギュラーシーズンの延長戦処理
- 4v4 フォーマット対応
- オーダー入力フローの設計
- UI 上のルール表示

### 守るべきこと

1. **ハードコード禁止**: ポイント関連値（レギュラー1節最大 40pt、プレイオフ 70pt 先取、グランドファイナル 90pt 先取、各ポジション +10/+10/+20、延長戦 +10pt）は設定値として外出しする。SFL シーズン更新時にコード修正なしで対応できるように
2. **ソース・オブ・トゥルースは `docs/sfl-rules.md`** : 実装中に「このルールどうだっけ？」となったら、まずこのドキュメントを参照する
3. **公式情報源との乖離が見つかったら、`docs/sfl-rules.md` を更新してから実装する**: 古いルールに基づく実装をしない
4. **新ルール（例: 4v4 Esports Nations Cup 形式）追加時は `docs/sfl-rules.md` に追記**してから実装に入る

---

## ドキュメント構成

- `docs/sfl-rules.md` — SFL 公式ルールまとめ（実装の根拠）
- `docs/deployment.md` — Cloudflare Workers デプロイ手順（初回セットアップ含む）
- `docs/architecture.md` — システム構成（作成予定）
- `docs/api.md` — API 仕様（作成予定）
- `docs/feature-spec/` — 機能ごとの仕様書（作成予定）

---

## 開発の進め方

### 開発フェーズ

- **Phase 1 (MVP)**: 無料コア機能のみ。4-6 週間でリリース
- **Phase 2**: Pro 機能（キャラ別勝率、タイムアウト、配信用 Embed 等）
- **Phase 3**: 海外チーム展開、コーチ向けダッシュボード等

### 機能スコープのポリシー

- MVP では「**コアの痛みを完璧に解く**」ことを最優先。機能の盛り込みすぎはリリース遅延の最大要因
- Pro 機能は MVP リリース後、実ユーザーのフィードバックで優先順位を決める
- 「あったら便利」より「**なくてはならない**」を優先

### コミュニケーション

- 仕様で迷ったらまず `docs/` 配下を確認
- ドキュメントに記載がない場合は、実装前に整理して `docs/` に追加してから着手
- 公式 SFL ルール変更があったら、即 `docs/sfl-rules.md` を更新

---

## 言語

- 開発者・コミュニケーション: 日本語
- アプリの UI: 日本語 / 英語（多言語対応必須）
- ドキュメント: 日本語（コードコメント・README は日本語で OK）
