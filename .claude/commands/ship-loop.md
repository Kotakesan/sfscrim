---
name: ship-loop
description: SFScrim 専用ワークフロー — simplify → PR 作成 → review ループ → approve でマージ → 次の issue へ
---

# /ship-loop — SFScrim ワークフロー

issue 実装が完了したら必ずこのコマンドを使う。`gh pr create` / `gh pr merge` は hook によりこのワークフロー経由でしか通らない。

> ⚠️ ユーザー個人の汎用 `/ship` skill（PR 作成までで停止する別物）と区別するため、本プロジェクトでは **`/ship-loop`** という名前で運用している。`/ship` を呼ばないこと。

## 全体フロー

```
1. /simplify でコード整形・冗長削除
2. コミット & push
3. .claude/.simplify-done マーカー書き出し
4. gh pr create        ← hook が .simplify-done を検証して通す（→ 削除）
5. /review 実行
6. レビューループ:
   ├ "APPROVED" を含む → break
   └ それ以外（指摘あり） → 修正コミット → push → 5 に戻る
7. .claude/.review-approved マーカー書き出し
8. gh pr merge          ← hook が .review-approved を検証して通す（→ 削除）
9. ローカルで main を pull、issue ブランチを削除
10. 次の open issue を選んで checkout → 実装開始（再帰的に /ship-loop）
11. open issue が 0 になったら停止
```

## 実装手順（Claude が従うべき詳細）

### Step 1: /simplify を実行

`/simplify` スキルを呼ぶ。コードの冗長削除・整形・無駄なロジック検出を行う。指摘があれば修正する。

### Step 2: コミット & push

```bash
git add -A
git commit -m "<conventional commit message>"
git push -u origin "$(git symbolic-ref --short HEAD)"
```

### Step 3: マーカー発行

```bash
mkdir -p .claude
git symbolic-ref --short HEAD > .claude/.simplify-done
```

### Step 4: PR 作成

```bash
gh pr create --title "<title>" --body "<body>"
```

hook が `.simplify-done` を検証 → 通過 → マーカー削除。

### Step 5: /review 実行

`/review <PR番号>` を呼ぶ。AI レビューが PR の diff に対して走る。

### Step 6: レビューループ

`/review` の出力を確認：

- **`APPROVED` という文字列を含む** → ループを抜けて Step 7 へ（**ユーザーに確認を取らず即座に進む**）
- **それ以外（指摘がある）** → 指摘内容を読み、修正コミット & push、Step 5 に戻る

ループ最大回数: **5 回**。それを超えたら停止して人間の判断を仰ぐ。

### Step 7: 承認マーカー発行

```bash
git symbolic-ref --short HEAD > .claude/.review-approved
```

### Step 8: マージ

```bash
gh pr merge --squash --delete-branch
```

hook が `.review-approved` を検証 → 通過 → マーカー削除。

### Step 9: ローカル整理

```bash
git checkout main
git pull origin main
git branch -d <feature-branch>
```

### Step 10: 次の issue へ

```bash
# open issue を取得
NEXT_ISSUE=$(gh issue list --state open --json number,title --limit 1 --jq '.[0]')

# 0 件なら停止
if [ -z "$NEXT_ISSUE" ] || [ "$NEXT_ISSUE" = "null" ]; then
  echo "✓ 全 issue 完了！停止します。"
  exit 0
fi

# 次の issue にアサインして branch 作成
ISSUE_NUM=$(echo "$NEXT_ISSUE" | jq -r '.number')
ISSUE_TITLE=$(echo "$NEXT_ISSUE" | jq -r '.title')
BRANCH_NAME="feat/issue-${ISSUE_NUM}-$(echo "$ISSUE_TITLE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | head -c 50)"

git checkout -b "$BRANCH_NAME"
```

その後、issue の本文を読んで実装に着手 → 完了したら再び `/ship-loop`。

## 失敗時の動作

- /simplify が失敗 → 停止（人間が修正）
- /review が 5 ラウンド以上 approve しない → 停止（人間が判断）
- gh pr create / merge が hook で blocked → /ship-loop フローに戻ってマーカーから再発行
- マージ衝突 → main を pull → 解消してから retry

## CLAUDE への指示（厳守）

- **このワークフロー以外で `gh pr create` / `gh pr merge` を呼ばない**
- マーカーファイルを手動で作らない（必ず /ship-loop フロー内で書き出す）
- **`/review` が APPROVED を返したら、ユーザー確認を待たず Step 7→8→9→10 を一気通貫で実行する**（途中で応答を返して停止しない）
- 5 回ループしても approve が出ない場合は人間に判断を仰ぐ
- 全 issue が完了したら停止メッセージを出して終了
- ユーザー個人の汎用 `/ship` skill は別物。`/ship-loop` を使うこと
