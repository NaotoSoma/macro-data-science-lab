# Distribution Guessing Game Codex Update

このフォルダは、第2回と現在の第3回の間に「第3回：点から分布を読むゲーム」を追加するためのCodex向け文書更新セットである。

## Contents

```text
AGENTS.md

docs/
  PROJECT_SPEC.md
  IMPLEMENTATION_PLAN.md
  CODEX_TASKS.md
  INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md
  FILE_CHANGE_PLAN_DISTRIBUTION_GUESSING_GAME.md
  CODEX_PROMPT_ADD_DISTRIBUTION_GUESSING_GAME.md

page-template/
  03-guess-the-distribution.mdx
```

## How to apply

1. 現在の作業フォルダをバックアップする。
2. `AGENTS.md` はプロジェクトルートの同名ファイルに置く。
3. `docs/` 以下のファイルはプロジェクトの `docs/` フォルダへ置く。
4. `page-template/03-guess-the-distribution.mdx` は、Codexが実装する際のMDX（Markdownに部品を埋め込める形式）ページの雛形として使う。
5. Codexには `docs/CODEX_PROMPT_ADD_DISTRIBUTION_GUESSING_GAME.md` のプロンプトを渡す。

## Notes

- 既存の第1回・第2回実装を壊さない前提で書いている。
- 既存の第3回ページがある場合、未公開なら第4回へ繰り下げる方針を推奨する。
- 公開済みURLの可能性がある場合は、既存ページを壊さず新ページだけを追加する。
