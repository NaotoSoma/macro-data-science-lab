# Codex Prompt: Add Distribution Guessing Game

次のプロンプトをCodexにそのまま渡して、第3回「点から分布を読むゲーム」を実装させる。

```text
現在のリポジトリ構成を先に確認してください。
このリポジトリは、経済学部向けデータサイエンス授業のcompanion website（補助ウェブサイト）です。
第1回・第2回はすでに実装済みなので、既存実装を壊さないでください。

第2回と現在の第3回の間に、新しいページを追加してください。

新ページのタイトルは「第3回：点から分布を読むゲーム」です。
URLは、既存ルーティングに問題がなければ `/03-guess-the-distribution/` としてください。
既存の第3回ページがある場合は、現在のページ構成を確認したうえで、第3回以降を繰り下げるか、既存URLを維持するかを判断してください。
判断に迷う場合は、既存ページを壊さず、新ページを追加するだけにしてください。

必ず読む文書:
- `AGENTS.md`
- `docs/PROJECT_SPEC.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/CODEX_TASKS.md`
- `docs/INTERACTION_SPEC_DISTRIBUTION_GUESSING_GAME.md`
- `docs/FILE_CHANGE_PLAN_DISTRIBUTION_GUESSING_GAME.md`

作業内容:
1. `src/pages/03-guess-the-distribution.mdx` を追加する。
2. `src/components/widgets/DistributionGuessingGameWidget.tsx` を追加する。
3. `src/lib/probability/distributionGuessing.ts` を追加する。
4. `src/lib/probability/kde.ts` を追加する。
5. `src/lib/probability/scores.ts` を追加する。
6. 既存のナビゲーションまたはページ一覧がある場合は、新ページを追加する。
7. 既存の第3回ページがあり、プロジェクトの連番ルール上安全なら第4回へ繰り下げる。安全でない場合は既存ページを壊さない。

新widgetの要件:
- 最初は観測されたデータ点だけを表示する。
- 真の分布は隠す。
- 学生が分布候補を選び、形を調整できるようにする。
- 予想候補は `singlePeak`, `flat`, `skewed`, `twoPeaks` とする。
- 真の分布は `normal`, `uniform`, `rightSkewed`, `leftSkewed`, `bimodal` からseed（種）つき乱数で生成する。
- 「予想を決定」後に予想を固定する。
- 「正解を見る」後に真の分布を表示する。
- 予想分布、真の分布、データ点を同じSVG上に重ねる。
- ヒストグラム表示を切り替えられるようにする。
- KDE（カーネル密度推定）表示を切り替えられるようにする。
- サンプルサイズ `N` を 10, 30, 100, 300 から選べるようにする。
- 同じ真の分布のまま `N` を増やすボタンを追加する。
- seed（種）で再現できるようにする。
- 簡単なスコアと学びコメントを表示する。
- TypeScript（型付きJavaScript）の型を明示する。
- 既存のデザインやCSS方針に合わせる。
- 学生に見えるUIラベルは日本語中心にする。
- `Math.random()` を教材ロジックに直接使わない。
- `phase !== "revealed"` の状態で、真の分布名、真のパラメータ、真の密度曲線を学生に見せない。

最後に、利用可能なら `npm run check` と `npm run build` を実行してください。
利用可能でない場合は、`package.json` を確認して、最も近い検証コマンドを実行してください。
```

## Implementation order recommendation

一度にすべて実装しにくい場合は、次の順に分ける。

1. 文書とMDX（Markdownに部品を埋め込める形式）ページを追加する。
2. 点だけ表示、予想分布、reveal（正解表示）だけの最小widget（部品）を実装する。
3. ヒストグラム、KDE（カーネル密度推定）、スコア、コメントを追加する。
4. 「同じ分布でNを増やす」を追加する。
5. navigation（ナビゲーション）と既存ページの非回帰を確認する。
```
