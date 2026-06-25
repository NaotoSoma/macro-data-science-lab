# AGENTS.md

## Project mission

このプロジェクトは、経済学部向けデータサイエンス授業の companion website（補助ウェブサイト）である。講義内容を長い文章として再掲するのではなく、授業中に口頭で伝えた「統計学の世界観」を interactive visualization（対話型可視化）として再構築する。

序盤の中心命題は次である。

> データとは、確率変数の実現値が集まったものである。

第1回では「確率分布からデータが生まれる」方向を見る。第3回ではその逆に、「観測されたデータ点から背後にありそうな確率分布を推測する」方向を見る。この2つを対にすることで、学生が統計学を「公式を覚える科目」ではなく、「不確実な世界からデータを読み取り、見えない分布やモデルを考える方法」として理解できるようにする。

## Non-negotiable teaching principles

1. 文章で説明しすぎない。各ページの主役は interactive widget（対話型部品）である。
2. 数式は必要な瞬間にだけ出す。最初から公式を並べない。
3. 学生が見る順番は「操作 → 観察 → 概念化」にする。
4. `X_i` と `x_i` の違い、すなわち「実現前の確率変数」と「実現後の観測値」の違いを常に守る。
5. 2変量データでは、`x_i` と `y_i` が別々に発生するのではなく、`(x_i, y_i)` というペアとして同時に実現することを強調する。
6. 同時分布は 3D surface（3次元曲面）モードと contour（等高線）モードを切り替えられるようにする。表示モードを切り替えても、乱数列、実現済み点、表の状態は保持する。
7. 第3回「点から分布を読むゲーム」では、真の分布を最初から表示しない。学生が観測点だけを見て予想し、予想を固定した後で真の分布を reveal（正解表示）する。
8. 第3回では「当たった・外れた」だけを強調しない。有限個のデータから母集団分布を一意に復元できないこと、複数の分布がそれなりにもっともらしく見えることを必ず扱う。
9. `N` を大きくすると形が見えやすくなることを、同じ hidden distribution（隠された分布）のままサンプルサイズだけ増やす操作で体験させる。
10. ヒストグラムの bin（階級）幅や KDE（カーネル密度推定）の bandwidth（帯域幅）が、データの見え方を変えることを教材化する。

## Stack

- Astro（静的サイト生成フレームワーク）
- MDX（Markdownに部品を埋め込める形式）
- React（UI部品ライブラリ）
- TypeScript（型付きJavaScript）
- SVG（2次元ベクター描画）
- React Three Fiber（React用Three.jsレンダラー）
- Three.js（3次元描画ライブラリ）

AstroのReact連携とMDX連携は `astro.config.mjs` の `integrations` に書く。React Three Fiberを使う重い3D部品は、MDX側で原則として `client:only="react"` を使う。第3回「点から分布を読むゲーム」は1変量のSVG中心で実装し、3D依存を追加しない。

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
```

`npm run build` が通る状態を完了条件にする。ただし、環境にWebGL（ブラウザ上の3D描画機能）がない場合の実行確認はブラウザで別途行う。

## File map

Codexは、作業前に現在のリポジトリ構成を必ず確認すること。この一覧は目標構成であり、現在の実装と完全に一致すると仮定しない。

```text
src/pages/
  index.mdx
  01-random-variables-as-data.mdx
  02-population-and-sample.mdx
  03-guess-the-distribution.mdx

src/layouts/
  CourseLayout.astro

src/components/widgets/
  RandomVariableRealizationWidget.tsx
  JointDistributionWidget.tsx
  DistributionGuessingGameWidget.tsx

src/lib/probability/
  random.ts
  distributionGuessing.ts
  kde.ts
  scores.ts

src/lib/visualization/
  scales.ts

src/styles/
  global.css
  widgets.css
```

既存の第3回ページがすでに存在する場合は、プロジェクト内の navigation（ナビゲーション）や lesson ordering（授業順序）の定義を確認してから判断する。未公開の連番ページなら第4回へ繰り下げる。公開済みURLの可能性がある場合は、既存ページを壊さず、新ページを `/03-guess-the-distribution/` または `/02b-guess-the-distribution/` として追加し、判断理由を作業メモに残す。

## Coding rules

- TypeScript（型付きJavaScript）を使う。
- 確率分布、乱数、密度関数などの数学ロジックは `src/lib/probability/` に置く。
- 座標変換、表示範囲、フォーマットなどの表示補助は `src/lib/visualization/` に置く。
- React component（部品）は、数学ロジックを直接抱え込まない。
- 乱数は seed（種）つきで決定論的に再現できるようにする。
- `Math.random()` を教材ロジックに直接使わない。
- 教材用の語は日本語を基本にする。ただしコード識別子は英語でよい。
- 学生向けUIでは「母集団」「標本」「確率変数」「実現値」「同時分布」「相関」「分布」「ヒストグラム」「KDE（カーネル密度推定）」を一貫して使う。
- `any` は避ける。必要な場合は理由をコメントする。
- 表示上の値は既存の `formatNumber` または同等のformat helper（表示整形補助）を通し、小数桁を揃える。
- 第3回の真の分布の型、予想分布の型、ゲーム状態の型は明示的に定義する。
- `revealed` 状態になるまで、真の分布名、真のパラメータ、真の密度曲線を学生に見せない。

## Accessibility and classroom constraints

- ボタンと入力には見えるラベルを付ける。
- キーボード操作で再生、停止、リセット、決定、正解表示ができるようにする。
- `prefers-reduced-motion`（動きを減らす設定）に配慮し、アニメーションがなくても概念が伝わるようにする。
- 3Dが重い環境では、等高線モードに切り替えれば授業が続けられるようにする。
- 大学のPC、学生のノートPC、タブレットで読めるように、初期表示は軽くする。
- 第3回の初期表示は点だけを主役にし、補助レイヤーは必要になったときだけ表示できるようにする。
- 色だけに依存せず、線種、ラベル、凡例でも「予想分布」と「真の分布」を区別する。

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

## Distribution guessing game behavior

第3回「点から分布を読むゲーム」は、第1回の逆向きの体験として実装する。

```text
第1回: 確率分布 → 確率変数の実現 → データ点
第3回: データ点 → 背後にありそうな確率分布の推測
```

### Required behavior

- 初期状態では観測されたデータ点だけを表示する。
- 真の分布、真の分布名、真のパラメータは隠す。
- 学生は候補分布を選び、中心、広がり、歪み、山の間隔などを直観的なスライダーで調整する。
- 学生が「予想を決定」を押すと、予想分布を固定する。
- 学生が「正解を見る」を押すと、真の分布を表示する。
- reveal（正解表示）後は、データ点、予想分布、真の分布、任意のヒストグラム、任意のKDE（カーネル密度推定）、スコア、学びコメントを表示する。
- 「同じ分布でNを増やす」ボタンでは、hidden distribution（隠された分布）を変えずにサンプルサイズだけを増やす。
- 新しい問題を生成するときだけ、真の分布とseed（種）系列を更新する。

### True distribution types

- `normal`: 山が1つで左右対称
- `uniform`: 平らな分布
- `rightSkewed`: 右に長い尾
- `leftSkewed`: 左に長い尾
- `bimodal`: 山が2つ

### Guess distribution types

- `singlePeak`: 山が1つ
- `flat`: 平ら
- `skewed`: 片側に長い尾
- `twoPeaks`: 山が2つ

### Do not leak the answer

`phase !== "revealed"` の状態では、UIにもDOMにも学生が読める形で真の分布名・真のパラメータ・真の密度曲線を出さない。debug（デバッグ）表示を作る場合も開発環境限定にする。

## Definition of done for this prototype

### Lesson 1

- `src/pages/01-random-variables-as-data.mdx` が表示できる。
- 単変量の再生、停止、リセットが動く。
- 2変量の再生、停止、リセットが動く。
- 2変量の3Dモードと等高線モードを切り替えられる。
- サンプルサイズ、乱数 seed（種）、相関 `ρ` がUIから変更できる。
- 変更時に表、図、実現済み点が矛盾しない。

### Lesson 3: distribution guessing game

- `src/pages/03-guess-the-distribution.mdx` またはプロジェクトで採用した同等ルートが表示できる。
- 初期状態で真の分布が見えない。
- 観測点だけを見て候補分布を選び、予想曲線を調整できる。
- 「予想を決定」と「正解を見る」の状態遷移が明確である。
- reveal（正解表示）後に、予想分布と真の分布を重ねて比較できる。
- ヒストグラムとKDE（カーネル密度推定）を任意で表示できる。
- `N = 10, 30, 100, 300` で表示が破綻しない。
- 同じ分布のまま `N` を増やす操作ができる。
- seed（種）が同じなら同じ問題が再現される。
- `npm run check` と `npm run build` を通す。

## Do not do

- 講義本文を長文化しない。
- ランダムな数値を `Math.random()` で直接生成しない。
- 3D表示だけに依存しない。必ず2D等高線モードを維持する。
- 分布を変更したのに表が古い実現値のまま残るような状態不整合を作らない。
- 学生に見えるUIで英語ラベルだけにしない。
- 第3回で、学生が予想する前に真の分布を表示しない。
- 第3回を単なる正解当てゲームにしない。有限標本からの推測には不確実性があることを必ず示す。

## Lesson 4: estimator quality

第4回は「よい平均の当て方はどれか」として、見えない期待値 `E[X]` を推定する4つの方法を比較する。学生向けの文書・UI・確認質問では `E[X]` を使い、ギリシャ文字のミューは使わない。

現在の公開順序は次である。

```text
01: データはどこから来るのか
02: 点から分布を読むゲーム
03: 標本分布を理解する
04: よい平均の当て方はどれか
```

第4回では、不偏性を「同じNで標本を取り直したとき、推定値の分布の中心が `E[X]` に来るか」として見せる。一致性は「Nを大きくしたとき、1回ごとの推定値が `E[X]` の近くに安定するか」として見せる。推定量は `first`, `ends`, `mean`, `rootSumSquares` の4つに固定し、数学ロジックは `src/lib/probability/estimators.ts` と `src/lib/probability/estimatorSimulation.ts` に置く。
