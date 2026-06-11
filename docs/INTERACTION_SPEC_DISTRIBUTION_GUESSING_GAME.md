# Interaction Spec: Distribution Guessing Game

## 1. Page identity

- Page title: 第3回：点から分布を読むゲーム
- Preferred route: `/03-guess-the-distribution/`
- Main widget（部品）: `DistributionGuessingGameWidget.tsx`
- Main specification file: `docs/INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md`

このページは、第1回「データはどこから来るのか」の逆向きの体験として設計する。

```text
第1回: 確率分布 → 確率変数の実現 → データ点
第3回: データ点 → 背後にありそうな確率分布の推測
```

## 2. Educational purpose

このページの目的は、学生に次を体験させることである。

> 目の前のデータ点は、観測されていない母集団分布から出てきた有限個の実現値である。

ただし、このページは単なる「正解当てゲーム」ではない。有限個のデータから母集団分布を一意に復元することはできない。したがって、正解・不正解だけでなく、「なぜ間違えても自然なのか」「なぜ `N` が大きいと見え方が変わるのか」「なぜヒストグラムやKDE（カーネル密度推定）は設定に依存するのか」を扱う。

## 3. Learning goals

学生はこのページを通じて、次を理解する。

1. 観測点は、背後にある確率分布から実現した値である。
2. 少ない観測点から分布の形を読むのは難しい。
3. サンプルサイズ `N` が大きくなると、分布の形が見えやすくなる。
4. ヒストグラムの bin（階級）幅によって、同じデータでも見え方が変わる。
5. KDE（カーネル密度推定）の bandwidth（帯域幅）によって、滑らかさと細部の見え方が変わる。
6. 二山型の分布は、`N` が小さいと一山型に見えることがある。
7. 外れ値のように見える点も、分布の尾から自然に出ている可能性がある。
8. 統計学では、データから「真実」を直接読むのではなく、もっともらしい分布やモデルを考える。

## 4. Main interaction flow

1. 画面が表示される。
2. hidden distribution（隠された分布）がseed（種）から生成される。
3. hidden distribution（隠された分布）から `N` 個の観測点が生成される。
4. 学生には観測点だけが表示される。
5. 学生は点の並びを観察する。
6. 学生は予想分布タイプを選ぶ。
7. 学生は中心、広がり、歪み、山の間隔などを調整する。
8. 学生は「予想を決定」を押す。
9. 学生は「正解を見る」を押す。
10. 真の分布が表示される。
11. 予想分布、真の分布、観測点、任意のヒストグラム、任意のKDE（カーネル密度推定）が重なる。
12. スコアと学びコメントが表示される。
13. 学生は「同じ分布でNを増やす」または「新しい問題」を選べる。

## 5. Game phases

```ts
type GamePhase = "observing" | "guessing" | "locked" | "revealed";
```

| phase | 表示 | 操作 |
|---|---|---|
| `observing` | 点だけ | 分布候補を選び始める |
| `guessing` | 点 + 予想分布 | 予想曲線を調整する |
| `locked` | 点 + 固定された予想分布 | 正解表示を待つ |
| `revealed` | 点 + 予想分布 + 真の分布 | 比較、スコア、コメント、N増加 |

### Critical rule

`phase !== "revealed"` の状態では、真の分布名、真のパラメータ、真の密度曲線を学生に見せない。

## 6. True distribution types

```ts
type TrueDistributionType =
  | "normal"
  | "uniform"
  | "rightSkewed"
  | "leftSkewed"
  | "bimodal";
```

| ID | 学生向けの正解名 | 例 | 教材上の狙い |
|---|---|---|---|
| `normal` | 山が1つで左右対称 | 測定誤差 | 基本形 |
| `uniform` | 平らな分布 | 人為的な割当 | 山がない分布 |
| `rightSkewed` | 右に長い尾 | 所得、資産、企業規模 | 歪みと尾 |
| `leftSkewed` | 左に長い尾 | 上限に張り付く点数など | 歪みの向き |
| `bimodal` | 山が2つ | 異なる集団が混ざった賃金 | 平均だけでは見えない構造 |

## 7. Guess distribution types

```ts
type GuessDistributionType =
  | "singlePeak"
  | "flat"
  | "skewed"
  | "twoPeaks";
```

| ID | 学生向けラベル | 操作項目 |
|---|---|---|
| `singlePeak` | 山が1つ | 中心、広がり |
| `flat` | 平ら | 中心、幅 |
| `skewed` | 片側に長い尾 | 中心、広がり、尾の向き、歪みの強さ |
| `twoPeaks` | 山が2つ | 中心、山の間隔、左右のバランス |

学生には最初から専門的な分布名を強調しない。最初は形の言葉で操作させ、reveal（正解表示）後に必要なら「正規分布」「一様分布」「歪んだ分布」「混合分布」の名前を補足する。

## 8. State model

推奨する状態型は次である。

```ts
type Difficulty = "easy" | "standard" | "hard";

type DensityPoint = {
  x: number;
  y: number;
};

type TrueDistributionSpec = {
  type: TrueDistributionType;
  parameters: Record<string, number>;
};

type GuessDistributionSpec = {
  type: GuessDistributionType;
  parameters: Record<string, number>;
};

type GameState = {
  seed: number;
  n: number;
  difficulty: Difficulty;
  phase: GamePhase;
  trueDistribution: TrueDistributionSpec;
  samples: number[];
  guessDistribution: GuessDistributionSpec;
  showHistogram: boolean;
  showKde: boolean;
  histogramBins: number;
  kdeBandwidth: number;
};
```

`trueDistribution` は内部状態として保持してよいが、`revealed` になるまで学生に見える形で表示しない。

## 9. Controls

| UI | 初期値 | 表示条件 | 内容 |
|---|---:|---|---|
| サンプルサイズ `N` | 30 | 常時 | 10, 30, 100, 300 |
| 難易度 | 標準 | 常時 | やさしい、標準、むずかしい |
| seed（種） | 2026 | 常時 | 同じ問題を再現する |
| 予想タイプ | 山が1つ | `observing`以降 | 分布候補を選ぶ |
| 中心 | 0 | 予想タイプに応じる | 曲線を左右に動かす |
| 広がり | 1 | 予想タイプに応じる | 曲線の幅を変える |
| 尾の向き | 右 | `skewed`のみ | 右尾・左尾を切り替える |
| 歪みの強さ | 1 | `skewed`のみ | 尾の長さを変える |
| 山の間隔 | 2 | `twoPeaks`のみ | 2つの山の距離を変える |
| 左右のバランス | 0.5 | `twoPeaks`のみ | 左右の山の比率を変える |
| ヒストグラム | OFF | 常時 | ヒントとして表示する |
| bin（階級）数 | 20 | ヒストグラムON時 | 10, 20, 30 |
| KDE（カーネル密度推定） | OFF | 常時 | ヒントとして表示する |
| bandwidth（帯域幅） | 標準 | KDE ON時 | 小さい、標準、大きい |
| 予想を決定 | - | `guessing` | 予想分布を固定する |
| 正解を見る | - | `locked` | 真の分布を表示する |
| 同じ分布でNを増やす | - | `revealed` | hidden distribution（隠された分布）を維持して点を増やす |
| 新しい問題 | - | 常時 | 真の分布も含めて再生成する |

## 10. Visual specification

### 10.1 Plot area

- 横軸の初期表示範囲は `[-4, 4]` とする。
- 縦軸は密度表示用に自動スケールする。
- 観測点はx軸付近に rug plot（ラグプロット）またはjitter（微小な揺らし）つき点として表示する。
- jitter（微小な揺らし）は表示上の工夫であり、統計的な値ではない。

### 10.2 Layers

| レイヤー | 表示タイミング | 備考 |
|---|---|---|
| データ点 | 初期から表示 | 最重要 |
| ヒストグラム | toggle（切り替え）ON時 | density scale（密度尺度）に合わせる |
| KDE（カーネル密度推定） | toggle（切り替え）ON時 | bandwidth（帯域幅）で滑らかさが変わる |
| 予想分布 | 予想開始後 | 実線などで表示 |
| 真の分布 | `revealed` 後 | 破線などで表示 |
| スコア領域 | `revealed` 後 | 数値は控えめにする |
| 学びコメント | `revealed` 後 | 勝敗より理解を促す |

色だけに依存せず、線種、凡例、ラベルで区別する。

## 11. Difficulty levels

| 難易度 | 初期N | 出題分布 | ヒント |
|---|---:|---|---|
| やさしい | 100 | `normal`, `uniform`, `bimodal`中心 | ヒストグラムONを許容 |
| 標準 | 30 | 全タイプ | 点だけから開始 |
| むずかしい | 15 | 似た形や歪みを含む | ヒストグラム・KDEはOFF |

むずかしいモードでは、正解できないこと自体が学びになる。コメントでは「このNでは判断しにくい」ことを明示する。

## 12. Scoring

スコアは主役ではない。主役は、有限標本から分布を推測する不確実性である。

### 12.1 Shape score

予想密度と真の密度をgrid（格子）上で比較する。

```text
shapeDifference = average(abs(predictedDensity - trueDensity))
shapeScore = clamp(100 * (1 - scaledDifference), 0, 100)
```

学生に見せる文言:

```text
形の近さ: 82点
```

### 12.2 Data fit score

予想分布のもとで観測点がどれくらい自然かを、簡易的な平均 log likelihood（対数尤度）で評価する。

学生に見せる文言は数式ではなく、次のようにする。

```text
点への当てはまり: かなり良い
```

### 12.3 Learning comment

コメントは、真の分布タイプ、予想分布タイプ、`N`、ヒストグラム・KDE（カーネル密度推定）の表示状態から選ぶ。

例:

```text
Nが小さいため、二山型の分布が一山型に見えています。
同じ分布でNを増やすと、右側の山が見えやすくなります。
```

```text
点だけを見ると正規型にも見えますが、真の分布は右に長い尾を持っています。
外れ値のように見える点も、分布の尾から自然に出ている可能性があります。
```

## 13. Same distribution, larger N

「同じ分布でNを増やす」は、このページの重要機能である。

| 現在のN | 次のN |
|---:|---:|
| 10 | 30 |
| 30 | 100 |
| 100 | 300 |
| 300 | 300 |

挙動:

1. 真の分布タイプを変えない。
2. 真のパラメータを変えない。
3. 同じseed（種）系列から追加サンプルを生成する。
4. 予想状態は必要に応じて再度 `guessing` に戻してよい。
5. 以前の予想を薄く残す機能は could（できれば）扱いであり、初期実装では不要である。

## 14. New problem

「新しい問題」では、次をすべて更新する。

- seed（種）またはproblem id（問題ID）
- 真の分布タイプ
- 真のパラメータ
- サンプル
- 予想分布
- ゲーム状態
- スコア
- 学びコメント

古いreveal（正解表示）状態や古い真の分布が残ってはならない。

## 15. MDX page draft

```mdx
---
title: "第3回：点から分布を読むゲーム"
description: "データ点から背後にある確率分布の形を推測する"
---

import DistributionGuessingGameWidget from "../components/widgets/DistributionGuessingGameWidget";

# 第3回：点から分布を読むゲーム

目の前にある点は、背後にある確率分布から実現した値です。
このページでは、点だけを見て、どんな分布から来たのかを推測します。

<DistributionGuessingGameWidget client:load />

## 観察ポイント

- 点が少ないと、分布の形ははっきり見えません。
- `N` を増やすと、背後の分布の形が見えやすくなります。
- ヒストグラムやKDE（カーネル密度推定）は便利ですが、設定によって見え方が変わります。
- データから分布を完全に当てることはできません。もっともらしい形を考えることが大事です。

## 確認質問

1. `N` が小さいとき、なぜ真の分布と違う形に見えることがあるでしょうか。
2. ヒストグラムのbin（階級）幅を変えると、何が変わるでしょうか。
3. KDE（カーネル密度推定）のbandwidth（帯域幅）を変えると、何が変わるでしょうか。
4. 二山型の分布が一山型に見えるのは、どのようなときでしょうか。
5. データから分布を「当てる」ことと、データから分布を「推測する」ことは何が違うでしょうか。
```

## 16. Definition of done

- 初期状態では観測点だけが表示される。
- 真の分布はreveal（正解表示）まで見えない。
- 予想分布タイプを選べる。
- 予想分布をスライダーで調整できる。
- reveal（正解表示）後、予想分布と真の分布を重ねて比較できる。
- ヒストグラムとKDE（カーネル密度推定）を任意で表示できる。
- スコアと学びコメントが表示される。
- 「同じ分布でNを増やす」が機能する。
- 「新しい問題」が古い状態を残さない。
- `npm run check` と `npm run build` が通る。
