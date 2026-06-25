# Codex Task Prompts

Codexに作業を依頼するときの単位を以下に分ける。各タスクの開始時には、必ず現在のリポジトリ構成を確認する。第1回・第2回はすでに実装済みである可能性が高いため、既存実装を壊さないことを優先する。

## Task 1: 依存関係の固定

```text
このAstroプロジェクトで npm install を実行し、生成された package-lock.json を前提に依存関係を固定してください。package.json の latest 指定は、実際に解決された互換バージョンへ置き換えてください。React、@react-three/fiber、@astrojs/react の主要バージョン互換性を確認し、npm run check と npm run build が通るようにしてください。
```

## Task 2: 単変量widgetの品質改善

```text
RandomVariableRealizationWidget.tsx を確認し、砂粒の落下、表の更新、ヒストグラム表示が realizedCount と厳密に同期するように改善してください。数学ロジックは src/lib/probability/random.ts に残し、UIだけをcomponent（部品）側に置いてください。npm run check と npm run build を通してください。
```

## Task 3: 2変量widgetの3D/2D切り替え改善

```text
JointDistributionWidget.tsx を確認し、surfaceモードとcontourモードを切り替えても samples と realizedCount が保持されることを保証してください。3D surface（3次元曲面）のmesh（網目形状）解像度、点の描画、相関rhoによる形状変化を改善してください。3Dが使えない環境ではcontour（等高線）モードを案内するfallback（代替表示）を追加してください。
```

## Task 4: 教材UIの改善

```text
第1ページのUIを、授業中に教員が投影して操作しやすいように改善してください。本文は短く保ち、観察ポイントと確認質問を明確にしてください。学生に見えるラベルは日本語を基本にしてください。
```

## Task 5: 第2回の整合確認

```text
第2ページ「母集団分布と標本」がすでに実装済みか確認してください。未実装なら、docs/PROJECT_SPEC.md の方針に沿って仕様案と空のMDXページを追加してください。実装済みなら、ルート、タイトル、navigation（ナビゲーション）、lesson ordering（授業順序）を確認し、第3回追加時に壊さないようにしてください。第1ページのcomponent（部品）を壊さず、共通化できる部分だけを切り出してください。
```

## Task 6: 第3回「点から分布を読むゲーム」の文書とページ追加

```text
現在のリポジトリ構成を先に確認してください。
このリポジトリは、経済学部向けデータサイエンス授業のcompanion website（補助ウェブサイト）です。
第1回・第2回はすでに実装済みなので、既存実装を壊さないでください。

第2回と現在の第3回の間に、新しいページを追加してください。

新ページのタイトルは「第3回：点から分布を読むゲーム」です。
URLは、既存ルーティングに問題がなければ `/03-guess-the-distribution/` としてください。
既存の第3回ページがある場合は、現在のページ構成を確認したうえで、第3回以降を繰り下げるか、既存URLを維持するかを判断してください。
判断に迷う場合は、既存ページを壊さず、新ページを追加するだけにしてください。

作業内容:
1. `docs/INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md` を確認または追加する。
2. `docs/PROJECT_SPEC.md` に新ページを反映する。
3. `docs/IMPLEMENTATION_PLAN.md` に実装フェーズを反映する。
4. `docs/CODEX_TASKS.md` に第3回の作業タスクを反映する。
5. `src/pages/03-guess-the-distribution.mdx` を追加する。
6. `src/components/widgets/DistributionGuessingGameWidget.tsx` を仮実装する。
7. 既存のナビゲーションまたはページ一覧がある場合は、新ページを追加する。

このタスクでは、ゲームロジックは仮でよいです。ページが表示され、仮widget（部品）が配置されることを優先してください。
最後に、利用可能なら `npm run check` と `npm run build` を実行してください。
```

## Task 7: 第3回の確率ロジック実装

```text
第3回「点から分布を読むゲーム」の確率ロジックを実装してください。

追加・更新する候補ファイル:
- `src/lib/probability/distributionGuessing.ts`
- `src/lib/probability/kde.ts`
- `src/lib/probability/scores.ts`
- `src/lib/probability/random.ts`

要件:
- seed（種）つき乱数で再現できること。
- true distribution（真の分布）は `normal`, `uniform`, `rightSkewed`, `leftSkewed`, `bimodal` とすること。
- guess distribution（予想分布）は `singlePeak`, `flat`, `skewed`, `twoPeaks` とすること。
- 各真の分布について、サンプル生成関数とdensity（密度）関数を実装すること。
- 各予想分布について、density（密度）関数を実装すること。
- 表示範囲は初期版では `x ∈ [-4, 4]` とすること。
- 歪み分布や二山分布は、表示用に範囲内へ収まるように標準化してよいこと。
- `Math.random()` を直接使わないこと。
- TypeScript（型付きJavaScript）の型を明示すること。

最後に、利用可能なら `npm run check` を実行してください。
```

## Task 8: 第3回widgetの最小実装

```text
`src/components/widgets/DistributionGuessingGameWidget.tsx` を実装してください。

教材上の目的:
第1回とは逆に、観測されたデータ点だけを見て、背後にありそうな確率分布を推測する体験を作る。

必須要件:
- 初期状態では観測されたデータ点だけを表示する。
- 真の分布名、真のパラメータ、真の密度曲線は隠す。
- 学生が分布候補を選び、予想曲線を調整できるようにする。
- 候補は `singlePeak`, `flat`, `skewed`, `twoPeaks` とする。
- 直観的な操作は、中心、広がり、尾の向き、歪みの強さ、山の間隔、左右のバランスとする。
- 「予想を決定」後に予想分布を固定する。
- 「正解を見る」後に真の分布を表示する。
- reveal（正解表示）後は、データ点、予想分布、真の分布を同じSVG上に重ねて表示する。
- `N` は 10, 30, 100, 300 から選択できるようにする。
- seed（種）で同じ問題を再現できるようにする。
- 学生に見えるラベルは日本語中心にする。
- 既存のデザインやCSS方針に合わせる。

最後に、利用可能なら `npm run check` と `npm run build` を実行してください。
```

## Task 9: ヒストグラム、KDE、スコア、学びコメント

```text
第3回widgetに、ヒストグラム、KDE（カーネル密度推定）、スコア、学びコメントを追加してください。

要件:
- ヒストグラム表示のON/OFFを切り替えられるようにする。
- ヒストグラムのbin（階級）数を 10, 20, 30 から選べるようにする。
- KDE（カーネル密度推定）表示のON/OFFを切り替えられるようにする。
- KDEのbandwidth（帯域幅）を「小さい・標準・大きい」から選べるようにする。
- 初期状態ではヒストグラムとKDEをOFFにする。
- reveal（正解表示）後、予想分布と真の分布の形の近さを簡易スコアとして表示する。
- 観測点への当てはまりを簡易評価する。
- 真の分布と予想分布の組み合わせに応じて、短い学びコメントを表示する。
- コメントでは、有限標本の不確実性、bin（階級）幅、bandwidth（帯域幅）、二山型の見落としなどを扱う。

最後に、利用可能なら `npm run check` と `npm run build` を実行してください。
```

## Task 10: 「同じ分布でNを増やす」機能と仕上げ

```text
第3回widgetに「同じ分布でNを増やす」機能と「新しい問題」機能を追加し、仕上げてください。

要件:
- 「同じ分布でNを増やす」ボタンでは、hidden distribution（隠された分布）と真のパラメータを変えずに、サンプルサイズだけ増やす。
- `N` は `10 → 30 → 100 → 300` の順に増やす。
- 追加サンプルは同じseed（種）系列から生成する。
- 「新しい問題」ボタンでは、真の分布、真のパラメータ、サンプル、予想状態、reveal（正解表示）状態を更新する。
- `N = 10, 30, 100, 300` で表示が破綻しないことを確認する。
- 各真の分布タイプが最低1回は自然に表示されることを確認する。
- 第1回・第2回の既存ページが壊れていないことを確認する。
- 学生に見えるUIラベルが日本語中心であることを確認する。

最後に、`npm run check` と `npm run build` を通してください。利用可能でない場合は、`package.json` を確認して最も近い検証コマンドを実行してください。
```

## Task 11: レビューとリファクタリング

```text
第3回「点から分布を読むゲーム」の実装をレビューしてください。

確認項目:
- 数学ロジックが `src/lib/probability/` に分離されていること。
- React component（部品）が過度に巨大になっていないこと。
- `any` が不要に使われていないこと。
- `phase !== "revealed"` で真の分布が学生に見えないこと。
- ヒストグラムとKDE（カーネル密度推定）が初期状態でOFFになっていること。
- 「同じ分布でNを増やす」が真の分布を変えていないこと。
- コメントが単なる正解・不正解ではなく、統計的な不確実性を説明していること。
- `npm run check` と `npm run build` が通ること。

必要なら、`src/components/distribution-game/` 以下に表示部品を分割してください。ただし、初期実装が安定してから分割してください。
```

## Task 12: 第4回「よい平均の当て方はどれか」の追加

```text
第4回ページ `/04-estimator-quality/` を追加してください。

現在の公開順序は次を維持してください。
01: データはどこから来るのか
02: 点から分布を読むゲーム
03: 標本分布を理解する
04: よい平均の当て方はどれか

要件:
- 学生向けの文書・UI・確認質問では `E[X]` を使い、ギリシャ文字のミューは使わない。
- 推定量は `first`, `ends`, `mean`, `rootSumSquares` の4つに固定する。
- `first`: 不偏性あり、一致性なし。
- `ends`: 不偏性あり、一致性なし。
- `mean`: 不偏性あり、一致性あり。
- `rootSumSquares`: 不偏性なし、一致性あり。このページの `E[X]=0` の設定では、`√(X_1^2 + ... + X_N^2) / N` が0へ近づく。
- 不偏性は「標本を取り直したときの中心」として見せる。
- 一致性は「Nを大きくしたときの動き」として見せる。
- 乱数はseed（種）つきで再現可能にし、`Math.random()` を直接使わない。
- 第2回 `/02-guess-the-distribution/` と第3回 `/03-sampling-distribution/` のURLは変更しない。

最後に、`npm run check`、`npm run build`、GitHub Pages想定のbase pathつきbuildを通してください。
```
