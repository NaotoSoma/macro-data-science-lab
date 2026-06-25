# Codex Prompt: Add Lesson 4 Estimator Quality

現在のリポジトリ構成を先に確認してください。
このリポジトリは、経済学部向けデータサイエンス授業の companion website（補助ウェブサイト）です。
各ページは、長い講義ノートではなく、interactive widget（対話型部品）を中心にした概念実験室として作ります。

## 重要な前提

現在のページ順は次です。

```text
01: データはどこから来るのか
02: 点から分布を読むゲーム
03: 母集団分布と標本
```

第2回と第3回の順序を入れ替えないでください。
第4回を第3回の次に追加してください。

第4回のタイトルは次です。

```text
第4回：よい期待値の当て方はどれか
```

期待値のターゲット表記は、授業では `E[X]` と教えています。
そのため、学生向けUI、MDX本文、確認質問、性質カードでは必ず `E[X]` を使ってください。
ギリシャ文字のミューは使わないでください。
コード識別子も `mu` ではなく、`targetExpectation` または `expectedValue` を使ってください。

## 参照すべき文書

作業前に以下を読んでください。

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/IMPLEMENTATION_PLAN.md
docs/CODEX_TASKS.md
docs/INTERACTION_SPEC_ESTIMATOR_QUALITY.md
docs/THEORY_NOTES_ESTIMATOR_QUALITY.md
docs/FILE_CHANGE_PLAN_ESTIMATOR_QUALITY.md
```

## 作業内容

### 1. 文書とページを追加・更新する

追加:

```text
docs/INTERACTION_SPEC_ESTIMATOR_QUALITY.md
docs/THEORY_NOTES_ESTIMATOR_QUALITY.md
docs/FILE_CHANGE_PLAN_ESTIMATOR_QUALITY.md
src/pages/04-estimator-quality.mdx
```

更新:

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/IMPLEMENTATION_PLAN.md
docs/CODEX_TASKS.md
```

また、現在のプロジェクトでページ順やナビゲーションを定義しているファイルがあれば、第4回を追加してください。

### 2. 推定量ロジックを追加する

追加:

```text
src/lib/probability/estimators.ts
```

以下の4つの推定量を実装してください。

```text
first: X_1
ends: (X_1 + X_N) / 2
mean: (X_1 + ... + X_N) / N
rootSumSquares: sqrt(X_1^2 + ... + X_N^2) / N
```

各推定量は次の情報を持つようにしてください。

```ts
type EstimatorDefinition = {
  id: EstimatorId;
  labelJa: string;
  formulaJa: string;
  usesAllData: boolean;
  unbiased: boolean;
  consistent: boolean;
  explanationJa: string;
  compute: (sample: number[]) => number;
};
```

性質:

```text
first: 不偏性あり、一致性なし
ends: 不偏性あり、一致性なし
mean: 不偏性あり、一致性あり
rootSumSquares: 不偏性なし、一致性あり
```

`ends` は `N >= 2` で使います。UIの最小 `N` は `2` にしてください。

### 3. シミュレーションロジックを追加する

追加:

```text
src/lib/probability/estimatorSimulation.ts
```

seed（種）つき乱数を使って、以下を生成してください。

1. `N` を大きくしたときの1本の標本列に基づく推定量の軌跡。
2. 固定 `N` で `B` 回標本を取り直したときの推定量分布。
3. 推定量ごとのリサンプリング平均、bias（バイアス）、variance（分散）、MSE（平均二乗誤差）。

既存の `src/lib/probability/random.ts` がある場合は再利用してください。
`Math.random()` を直接使わないでください。

このページでのリサンプリングは bootstrap（ブートストラップ）ではありません。同じ母集団分布から標本を取り直すシミュレーションです。UIでは「標本を取り直す」と書いてください。

### 4. Widgetを実装する

追加:

```text
src/components/widgets/EstimatorQualityWidget.tsx
```

要件:

- 母集団分布を選べる。
- `N` を `2, 5, 10, 30, 100, 300, 1000` から選べる。
- リサンプリング回数 `B` を `100, 500, 1000` から選べる。
- seed（種）を設定できる。
- 推定量 first, ends, mean, rootSumSquares の表示ON/OFFを切り替えられる。
- `E[X]` を基準線として表示する。
- 現在の標本と4つの推定値を表示する。
- `N` を大きくしたときの推定量の軌跡をSVGで表示する。
- 固定 `N` で標本を取り直したときの推定値分布をSVGで表示する。
- `rootSumSquares` が有限Nでは正の側にずれやすいが、このページの `E[X]=0` の設定ではNを大きくすると0へ近づくことを見せる。
- 性質カードで不偏性と一致性を表示する。
- UI文言は日本語にする。
- TypeScript（型付きJavaScript）の型を明示する。
- `any` は避ける。

### 5. ページ本文

`src/pages/04-estimator-quality.mdx` は短くしてください。

本文の例:

```mdx
---
title: "第4回：よい期待値の当て方はどれか"
description: "期待値 E[X] の複数の推定量を比較し、不偏性と一致性の違いを観察する"
---

import EstimatorQualityWidget from "../components/widgets/EstimatorQualityWidget";

# 第4回：よい期待値の当て方はどれか

本当の期待値 `E[X]` は直接見えません。
手元にある `N` 個のデータから、`E[X]` を当てる方法を比べます。

同じデータから作れる推定量はいくつもあります。
このページでは、`N` を大きくしたときの動きと、標本を取り直したときのブレを見比べます。

<EstimatorQualityWidget client:load />
```

既存プロジェクトのimport path（読み込みパス）やclient directive（クライアント側読み込み指定）が違う場合は、既存ページに合わせてください。

### 6. 検証

最後に以下を実行してください。

```bash
npm run check
npm run build
```

もしこれらのコマンドが存在しない場合は、`package.json` を確認し、最も近い検証コマンドを実行してください。

## 完了条件

- 第4回ページが表示される。
- 第2回と第3回の順序が入れ替わっていない。
- `EstimatorQualityWidget` が表示される。
- 4つの推定量を比較できる。
- `E[X]` 表記が統一されている。
- `rootSumSquares` が、不偏性なし・一致性ありの推定量として表現されている。
- `npm run check` と `npm run build` が通る。
