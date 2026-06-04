# Implementation Plan

## Phase 0: 環境構築

1. `npm install` を実行する。
2. `npm run dev` でトップページと第1ページが表示されることを確認する。
3. `npm run check` で型エラーを確認する。

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
3. ヒストグラムのbin（区間）数を画面幅に応じて調整する。
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

1. 3D surface（3次元曲面）のmesh（網目形状）の解像度を調整する。
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

## Phase 4: 次ページへの一般化

作業:

1. `RandomVariableRealizationWidget` の状態管理を他ページでも再利用できるよう整理する。
2. `src/lib/probability/` に分布関数を追加する。
3. `SamplingDistributionWidget` の設計を始める。
4. 共通の `WidgetFrame` component（部品）を作る。

候補ファイル:

```text
src/components/widgets/WidgetFrame.tsx
src/components/widgets/SamplingDistributionWidget.tsx
src/lib/probability/distributions.ts
src/lib/probability/sampling.ts
```
