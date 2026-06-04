# Codex Task Prompts

Codexに作業を依頼するときの単位を以下に分ける。

## Task 1: 依存関係の固定

```text
このAstroプロジェクトで npm install を実行し、生成された package-lock.json を前提に依存関係を固定してください。package.json の latest 指定は、実際に解決された互換バージョンへ置き換えてください。React、@react-three/fiber、@astrojs/react の主要バージョン互換性を確認し、npm run check と npm run build が通るようにしてください。
```

## Task 2: 単変量widgetの品質改善

```text
RandomVariableRealizationWidget.tsx を確認し、砂粒の落下、表の更新、ヒストグラム表示が realizedCount と厳密に同期するように改善してください。数学ロジックは src/lib/probability/random.ts に残し、UIだけをcomponent側に置いてください。npm run check と npm run build を通してください。
```

## Task 3: 2変量widgetの3D/2D切り替え改善

```text
JointDistributionWidget.tsx を確認し、surfaceモードとcontourモードを切り替えても samples と realizedCount が保持されることを保証してください。3D surfaceのmesh解像度、点の描画、相関rhoによる形状変化を改善してください。3Dが使えない環境ではcontourモードを案内するfallbackを追加してください。
```

## Task 4: 教材UIの改善

```text
第1ページのUIを、授業中に教員が投影して操作しやすいように改善してください。本文は短く保ち、観察ポイントと確認質問を明確にしてください。学生に見えるラベルは日本語を基本にしてください。
```

## Task 5: 次ページの設計追加

```text
docs/PROJECT_SPEC.md の方針に沿って、第2ページ「母集団分布と標本」の仕様案と空のMDXページを追加してください。第1ページのcomponentを壊さず、共通化できる部分だけを切り出してください。
```
