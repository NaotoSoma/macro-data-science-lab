# AGENTS.md

## Project mission

このプロジェクトは、経済学部向けデータサイエンス授業の companion website（補助ウェブサイト）である。講義内容を長い文章として再掲するのではなく、授業中に口頭で伝えた「統計学の世界観」を interactive visualization（対話型可視化）として再構築する。

最初のページの中心命題は次である。

> データとは、確率変数の実現値が集まったものである。

この命題を、学生が操作しながら理解できるようにする。

## Non-negotiable teaching principles

1. 文章で説明しすぎない。各ページの主役は interactive widget（対話型部品）である。
2. 数式は必要な瞬間にだけ出す。最初から公式を並べない。
3. 学生が見る順番は「操作 → 観察 → 概念化」にする。
4. `X_i` と `x_i` の違い、すなわち「実現前の確率変数」と「実現後の観測値」の違いを常に守る。
5. 2変量データでは、`x_i` と `y_i` が別々に発生するのではなく、`(x_i, y_i)` というペアとして同時に実現することを強調する。
6. 同時分布は 3D surface（3次元曲面）モードと contour（等高線）モードを切り替えられるようにする。表示モードを切り替えても、乱数列、実現済み点、表の状態は保持する。

## Stack

- Astro（静的サイト生成フレームワーク）
- MDX（Markdownに部品を埋め込める形式）
- React（UI部品ライブラリ）
- TypeScript（型付きJavaScript）
- SVG（2次元ベクター描画）
- React Three Fiber（React用Three.jsレンダラー）
- Three.js（3次元描画ライブラリ）

AstroのReact連携とMDX連携は `astro.config.mjs` の `integrations` に書く。React Three Fiberを使う重い3D部品は、MDX側で原則として `client:only="react"` を使う。

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
```

`npm run build` が通る状態を完了条件にする。ただし、環境にWebGL（ブラウザ上の3D描画機能）がない場合の実行確認はブラウザで別途行う。

## File map

```text
src/pages/
  index.mdx
  01-random-variables-as-data.mdx

src/layouts/
  CourseLayout.astro

src/components/widgets/
  RandomVariableRealizationWidget.tsx
  JointDistributionWidget.tsx

src/lib/probability/
  random.ts

src/lib/visualization/
  scales.ts

src/styles/
  global.css
  widgets.css
```

## Coding rules

- TypeScript（型付きJavaScript）を使う。
- 確率分布、乱数、密度関数などの数学ロジックは `src/lib/probability/` に置く。
- 座標変換、表示範囲、フォーマットなどの表示補助は `src/lib/visualization/` に置く。
- React component（部品）は、数学ロジックを直接抱え込まない。
- 乱数は seed（種）つきで決定論的に再現できるようにする。
- 教材用の語は日本語を基本にする。ただしコード識別子は英語でよい。
- 学生向けUIでは「母集団」「標本」「確率変数」「実現値」「同時分布」「相関」を一貫して使う。
- `any` は避ける。必要な場合は理由をコメントする。
- 表示上の値は `formatNumber` を通し、小数桁を揃える。

## Accessibility and classroom constraints

- ボタンと入力には見えるラベルを付ける。
- キーボード操作で再生、停止、リセットができるようにする。
- `prefers-reduced-motion`（動きを減らす設定）に配慮し、アニメーションがなくても概念が伝わるようにする。
- 3Dが重い環境では、等高線モードに切り替えれば授業が続けられるようにする。
- 大学のPC、学生のノートPC、タブレットで読めるように、初期表示は軽くする。

## First page behavior

### Single-variable widget

- 初期状態では、表に `X_1, X_2, ..., X_N` が並ぶ。
- 再生すると、分布の上から砂粒が落ちる。
- 砂粒が横軸上に落ちた瞬間、該当行の `X_i` が `x_i` に変わる。
- 実現済みの点は横軸上に残る。
- 必要に応じてヒストグラムを表示する。

### Bivariate widget

- 初期状態では、表に `(X_1, Y_1), ..., (X_N, Y_N)` が並ぶ。
- 再生すると、同時分布から砂粒が落ち、`(x_i, y_i)` が1行のデータになる。
- 3D surface（3次元曲面）モードでは、同時分布を山として表示する。
- contour（等高線）モードでは、同じ同時分布を上から見た等高線として表示する。
- 相関 `ρ` を変えると、山または等高線の向きが変わる。
- モード切り替えでは実現済みサンプルをリセットしない。

## Definition of done for this prototype

- `src/pages/01-random-variables-as-data.mdx` が表示できる。
- 単変量の再生、停止、リセットが動く。
- 2変量の再生、停止、リセットが動く。
- 2変量の3Dモードと等高線モードを切り替えられる。
- サンプルサイズ、乱数 seed（種）、相関 `ρ` がUIから変更できる。
- 変更時に表、図、実現済み点が矛盾しない。
- `npm run check` と `npm run build` を通す。

## Do not do

- 講義本文を長文化しない。
- ランダムな数値を `Math.random()` で直接生成しない。
- 3D表示だけに依存しない。必ず2D等高線モードを維持する。
- 分布を変更したのに表が古い実現値のまま残るような状態不整合を作らない。
- 学生に見えるUIで英語ラベルだけにしない。
