# File Change Plan: Distribution Guessing Game

この文書は、第2回と現在の第3回の間に「第3回：点から分布を読むゲーム」を追加するためのファイル変更計画である。

Codexは、作業前に現在のリポジトリ構成を確認すること。ここに書いたパスは目標構成であり、現在のフォルダと完全に一致すると仮定しない。

## 1. Update files

次のファイルを更新する。

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/IMPLEMENTATION_PLAN.md
docs/CODEX_TASKS.md
```

添付された作業フォルダでは、これらの文書は第1回中心の仕様になっており、将来案の第3回は「標本平均」となっていた。今回の更新では、第3回として「点から分布を読むゲーム」を挿入し、標本平均以降を繰り下げる。

## 2. Add documentation files

次の仕様書を追加する。

```text
docs/INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md
docs/FILE_CHANGE_PLAN_DISTRIBUTION_GUESSING_GAME.md
docs/CODEX_PROMPT_ADD_DISTRIBUTION_GUESSING_GAME.md
```

役割:

| ファイル | 役割 |
|---|---|
| `INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md` | 第3回widget（部品）の詳細な対話仕様 |
| `FILE_CHANGE_PLAN_DISTRIBUTION_GUESSING_GAME.md` | 更新・追加すべきファイル一覧 |
| `CODEX_PROMPT_ADD_DISTRIBUTION_GUESSING_GAME.md` | Codexにそのまま渡せる統合プロンプト |

## 3. Add implementation files

Codex実装時には、次のファイルを追加する。

```text
src/pages/03-guess-the-distribution.mdx
src/components/widgets/DistributionGuessingGameWidget.tsx
src/lib/probability/distributionGuessing.ts
src/lib/probability/kde.ts
src/lib/probability/scores.ts
```

初期実装では、`DistributionGuessingGameWidget.tsx` に画面全体をまとめてよい。動作が安定した後、必要なら次のように分割する。

```text
src/components/distribution-game/DataPointPlot.tsx
src/components/distribution-game/GuessControlPanel.tsx
src/components/distribution-game/DistributionCurveOverlay.tsx
src/components/distribution-game/HistogramLayer.tsx
src/components/distribution-game/KdeLayer.tsx
src/components/distribution-game/ScorePanel.tsx
src/components/distribution-game/LearningComment.tsx
```

## 4. Update navigation if present

次のようなファイルが存在する場合は、新ページを追加する。

```text
src/pages/index.mdx
src/pages/index.astro
src/lib/lessons.ts
src/data/lessons.ts
src/config/navigation.ts
src/components/layout/LessonNav.astro
src/components/layout/CourseLayout.astro
```

Codexへの指示:

```text
Find the current source of lesson navigation or lesson ordering.
Add the new Lesson 3 page to that list.
If the existing Lesson 3 is present, shift it to Lesson 4 only if the project already uses numbered lesson metadata and the route is not public.
Do not break existing routes.
```

## 5. Route policy

推奨ルート:

```text
/03-guess-the-distribution/
```

既存の第3回ページがある場合:

1. 未公開で、ページ番号をファイル名で管理しているなら、既存第3回を第4回に繰り下げる。
2. 公開済みURLの可能性があるなら、既存第3回を動かさず、`/02b-guess-the-distribution/` も検討する。
3. 判断に迷う場合は、既存ページを壊さず、新ページを追加するだけにする。

## 6. Validation commands

作業後に実行する。

```bash
npm run check
npm run build
```

コマンドが存在しない場合は、`package.json` を確認して最も近い検証コマンドを実行する。

## 7. Non-regression checklist

- 第1回ページが表示できる。
- 第1回の単変量widget（部品）が動く。
- 第1回の2変量widget（部品）が動く。
- 第2回ページが表示できる。
- 新しい第3回ページが表示できる。
- 既存の第3回ページがある場合、リンク切れになっていない。
- navigation（ナビゲーション）に新ページが含まれる。
- `npm run check` が通る。
- `npm run build` が通る。
