# Implementation Plan

## Phase 0: 環境構築

1. `npm install` を実行する。
2. `npm run dev` でトップページと既存ページが表示されることを確認する。
3. `npm run check` で型エラーを確認する。
4. 現在の `src/pages/`、navigation（ナビゲーション）、lesson ordering（授業順序）、既存の第2回・第3回ページの有無を確認する。

完了条件:

- 現在のページ構成を把握している。
- 既存の第1回・第2回を壊さずに新ページを追加する方針が決まっている。

## Phase 1: 単変量 widget（部品）の安定化

対象ファイル:

```text
src/components/widgets/RandomVariableRealizationWidget.tsx
src/lib/probability/random.ts
src/lib/visualization/scales.ts
```

作業:

1. SVGの分布曲線を滑らかにする。
2. 砂粒の落下アニメーションを `realizedCount` と正確に同期する。
3. ヒストグラムの bin（階級）数を画面幅に応じて調整する。
4. 表のスクロールと行のハイライトを改善する。
5. `prefers-reduced-motion`（動きを減らす設定）時の表示を確認する。

完了条件:

- `N = 10, 30, 100, 500` で破綻しない。
- 分布変更時に古い実現値が残らない。
- seed（種）が同じなら同じ値列が再現される。

## Phase 2: 2変量 widget（部品）の安定化

対象ファイル:

```text
src/components/widgets/JointDistributionWidget.tsx
src/lib/probability/random.ts
```

作業:

1. 3D surface（3次元曲面）の mesh（網目形状）の解像度を調整する。
2. contour（等高線）の楕円が相関 `ρ` に応じて正しく変形することを確認する。
3. 3Dと等高線の切り替えで状態が保持されることを確認する。
4. 実現済み点、表、現在の砂粒の同期を確認する。
5. 低性能環境では等高線モードを推奨する表示を入れる。

完了条件:

- `ρ = -0.8, 0, 0.8` で点の雲の向きが自然に変わる。
- 表示モードを切り替えても、表の中身が変わらない。
- 3Dが重い場合でも等高線モードで授業が続けられる。

## Phase 3: 教材体験の調整

作業:

1. ページ冒頭の導入文をさらに短くする。
2. widget（部品）の横に「観察ポイント」を置く。
3. ページ末尾に確認質問を置く。
4. 授業内で投影したときの視認性を確認する。

完了条件:

- 学生が最初に読む文が短い。
- 図と表だけで中心命題が伝わる。
- 教員が授業中に操作しながら説明できる。

## Phase 4: 共通化と第2回の整合確認

作業:

1. 第2回がすでに実装されている場合、現在のルート、タイトル、navigation（ナビゲーション）定義を確認する。
2. `RandomVariableRealizationWidget` の状態管理を他ページでも再利用できる範囲だけ整理する。
3. `src/lib/probability/` に分布関数を追加する場合は、第1回・第2回の挙動を壊さない。
4. 共通の `WidgetFrame` component（部品）がある場合は、第3回でも利用できるか確認する。

候補ファイル:

```text
src/components/widgets/WidgetFrame.tsx
src/lib/probability/distributions.ts
src/lib/probability/sampling.ts
```

完了条件:

- 第1回・第2回の既存実装が維持されている。
- 第3回で再利用する共通部品と、個別実装する部品の境界が明確である。

## Phase 5: 第3回の文書・ルーティング追加

対象ファイル:

```text
docs/INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md
docs/PROJECT_SPEC.md
docs/IMPLEMENTATION_PLAN.md
docs/CODEX_TASKS.md
src/pages/03-guess-the-distribution.mdx
```

作業:

1. `docs/INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md` を追加する。
2. `src/pages/03-guess-the-distribution.mdx` を追加する。
3. トップページまたはlesson list（授業一覧）がある場合は、第3回を追加する。
4. 既存の第3回ページがある場合は、現在のプロジェクトのルールに従って繰り下げるか、既存URLを保持する。
5. ルーティング判断を `docs/CODEX_TASKS.md` または作業メモに残す。

完了条件:

- 第3回ページのMDX（Markdownに部品を埋め込める形式）が存在する。
- 第3回ページに仮の `DistributionGuessingGameWidget` が配置されている。
- 既存ページへのリンクが壊れていない。

## Phase 6: 第3回の確率ロジック実装

対象ファイル:

```text
src/lib/probability/distributionGuessing.ts
src/lib/probability/kde.ts
src/lib/probability/scores.ts
src/lib/probability/random.ts
```

作業:

1. seed（種）つき乱数を既存の `random.ts` から再利用する。
2. 真の分布を `normal`, `uniform`, `rightSkewed`, `leftSkewed`, `bimodal` から生成する。
3. 各真の分布について、サンプル生成関数と密度関数を実装する。
4. 予想分布 `singlePeak`, `flat`, `skewed`, `twoPeaks` の密度関数を実装する。
5. 表示範囲は初期版では `x ∈ [-4, 4]` を基本にする。
6. 歪み分布や二山分布は表示範囲に収まるよう、表示用に標準化する。

完了条件:

- 同じseed（種）なら同じ真の分布、同じパラメータ、同じサンプルが再現される。
- 密度関数が負の値を返さない。
- 表示用grid（格子）上で曲線が安定して描ける。

## Phase 7: 第3回の最小 widget（部品）実装

対象ファイル:

```text
src/components/widgets/DistributionGuessingGameWidget.tsx
```

作業:

1. 初期状態では点だけを表示する。
2. 真の分布名、真のパラメータ、真の密度曲線を隠す。
3. 学生が予想タイプを選べるようにする。
4. 中心、広がり、歪み、山の間隔、左右のバランスを調整できるようにする。
5. SVGでデータ点と予想密度曲線を描く。
6. 「予想を決定」ボタンで予想を固定する。
7. 「正解を見る」ボタンで真の分布を表示する。
8. `GamePhase` を `observing`, `guessing`, `locked`, `revealed` として管理する。

完了条件:

- 予想前に真の分布が見えない。
- 予想曲線の操作が図に反映される。
- reveal（正解表示）後に、予想曲線と真の曲線を比較できる。

## Phase 8: ヒストグラム、KDE、スコア、コメントの追加

対象ファイル:

```text
src/components/widgets/DistributionGuessingGameWidget.tsx
src/lib/probability/kde.ts
src/lib/probability/scores.ts
```

作業:

1. ヒストグラムの表示切り替えを追加する。
2. bin（階級）数を 10, 20, 30 から選べるようにする。
3. KDE（カーネル密度推定）の表示切り替えを追加する。
4. bandwidth（帯域幅）を「小さい・標準・大きい」から選べるようにする。
5. 予想分布と真の分布の形の近さを簡易スコアとして計算する。
6. 観測点への当てはまりを簡易評価する。
7. 真の分布と予想分布の組み合わせに応じた学びコメントを表示する。

完了条件:

- ヒストグラムとKDE（カーネル密度推定）が初期状態ではOFFである。
- reveal（正解表示）後、スコアと学びコメントが表示される。
- `N` が小さい場合の不確実性をコメントで説明できる。

## Phase 9: 「同じ分布でNを増やす」と問題再生成

対象ファイル:

```text
src/components/widgets/DistributionGuessingGameWidget.tsx
src/lib/probability/distributionGuessing.ts
```

作業:

1. 「同じ分布でNを増やす」ボタンを追加する。
2. `10 → 30 → 100 → 300` の順で `N` を増やす。
3. hidden distribution（隠された分布）と真のパラメータは保持する。
4. 追加サンプルは同じseed（種）系列から生成する。
5. 「新しい問題」ボタンでは、真の分布、真のパラメータ、サンプル、予想状態を更新する。

完了条件:

- 同じ分布で `N` だけ増やしたとき、点の増え方が自然である。
- 新しい問題では、古い予想やreveal（正解表示）状態が残らない。

## Phase 10: 検証と仕上げ

作業:

1. `npm run check` を実行する。
2. `npm run build` を実行する。
3. `N = 10, 30, 100, 300` で表示を確認する。
4. 各真の分布タイプを最低1回ずつ確認する。
5. `prefers-reduced-motion`（動きを減らす設定）時に概念が伝わるか確認する。
6. 学生に見えるUIラベルが日本語中心であることを確認する。
7. 第1回・第2回の既存ページが壊れていないことを確認する。

完了条件:

- `npm run check` と `npm run build` が通る。
- 第3回ページが授業中に投影して操作できる状態になっている。
- 既存ページの挙動が維持されている。

## Phase 11: 第4回「よい平均の当て方はどれか」

現在の公開順序は次を維持する。

```text
01: データはどこから来るのか
02: 点から分布を読むゲーム
03: 標本分布を理解する
04: よい平均の当て方はどれか
```

対象ファイル:

```text
src/pages/04-estimator-quality.mdx
src/components/widgets/EstimatorQualityWidget.tsx
src/lib/probability/estimators.ts
src/lib/probability/estimatorSimulation.ts
docs/INTERACTION_SPEC_ESTIMATOR_QUALITY.md
docs/THEORY_NOTES_ESTIMATOR_QUALITY.md
docs/FILE_CHANGE_PLAN_ESTIMATOR_QUALITY.md
docs/CODEX_PROMPT_ADD_ESTIMATOR_QUALITY.md
```

作業:

1. 期待値 `E[X]` を推定する4つの方法を固定で実装する。
2. 不偏性を「標本を取り直したときの中心」、一致性を「Nを大きくしたときの動き」として表示する。
3. 学生向けの文書・UI・確認質問では `E[X]` を使い、ギリシャ文字のミューは使わない。
4. `/04-estimator-quality/` を追加し、トップページとナビゲーションに導線を追加する。
5. `npm run check`、`npm run build`、GitHub Pages想定のbase pathつきbuildを通す。

完了条件:

- 第4回ページが表示できる。
- seed（種）が同じなら同じ標本、軌跡、標本を取り直した結果が再現される。
- 第2回 `/02-guess-the-distribution/` と第3回 `/03-sampling-distribution/` のURLを変更していない。
