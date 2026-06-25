# File Change Plan: Lesson 4 Estimator Quality

## 1. Goal

第4回「よい期待値の当て方はどれか」をCodexで実装するための変更計画である。

重要な前提:

```text
02: 点から分布を読むゲーム
03: 母集団分布と標本
04: よい期待値の当て方はどれか
```

第2回と第3回を入れ替えない。

## 2. Update these existing files

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/IMPLEMENTATION_PLAN.md
docs/CODEX_TASKS.md
```

必要に応じて、実装リポジトリ側で次も更新する。

```text
README.md
src/pages/index.mdx
src/pages/index.astro
src/lib/lessons.ts
src/data/lessons.ts
src/config/navigation.ts
src/components/layout/LessonNav.astro
src/components/layout/CourseLayout.astro
```

Codexは、navigation（ナビゲーション）やページ順序を定義している実ファイルを先に探すこと。

## 3. Add these documentation files

```text
docs/INTERACTION_SPEC_ESTIMATOR_QUALITY.md
docs/THEORY_NOTES_ESTIMATOR_QUALITY.md
docs/FILE_CHANGE_PLAN_ESTIMATOR_QUALITY.md
docs/CODEX_PROMPT_ADD_ESTIMATOR_QUALITY.md
```

## 4. Add this page

```text
src/pages/04-estimator-quality.mdx
```

ページタイトル:

```text
第4回：よい期待値の当て方はどれか
```

主要component（部品）:

```text
EstimatorQualityWidget
```

## 5. Add these implementation files

最小実装:

```text
src/components/widgets/EstimatorQualityWidget.tsx
src/lib/probability/estimators.ts
src/lib/probability/estimatorSimulation.ts
```

必要に応じて追加:

```text
src/lib/probability/distributions.ts
src/lib/visualization/estimatorScales.ts
src/components/estimator-quality/EstimatorTrajectoryPlot.tsx
src/components/estimator-quality/ResamplingDistributionPlot.tsx
src/components/estimator-quality/EstimatorControlPanel.tsx
src/components/estimator-quality/EstimatorPropertyCards.tsx
```

最初は `EstimatorQualityWidget.tsx` にまとめて実装してもよい。ただし、推定量計算とシミュレーションは必ず `src/lib/probability/` に切り出す。

## 6. Routing guidance

原則:

```text
/04-estimator-quality/
```

既存プロジェクトのルート命名が違う場合は、既存規約に合わせる。

例:

```text
src/pages/04-estimator-quality.mdx
src/pages/04-estimating-expectation.mdx
src/pages/04-good-estimators.mdx
```

ただし、学生向けタイトルは必ず次にする。

```text
第4回：よい期待値の当て方はどれか
```

## 7. Expectation notation rule

学生向けUI、MDX本文、仕様書ではターゲットを次で表す。

```text
E[X]
```

避ける:

```text
ギリシャ文字のミュー
母平均を表すミュー
```

コード識別子:

```text
targetExpectation
expectedValue
```

避けるコード識別子:

```text
mu
```

## 8. Validation checklist

Codex実装後に確認する。

- 第2回と第3回の順序が変わっていない。
- 第4回ページがナビゲーションに表示される。
- 第4回ページが開ける。
- `EstimatorQualityWidget` が表示される。
- `E[X]` 表記が使われている。
- 4つの推定量が実装されている。
- `rootSumSquares` が不偏性なし・一致性ありの推定量として説明されている。
- seed（種）で同じ結果が再現される。
- `npm run check` が通る。
- `npm run build` が通る。
