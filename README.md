# Macro Data Science Lab

経済学部向けデータサイエンス授業の companion website（補助ウェブサイト）試作です。本文で講義を再現するのではなく、授業で伝えた世界観を interactive widget（対話型部品）として再構築します。

## 目的

最初の試作ページでは、次の直観を学生に見せます。

> データとは、確率変数が実現した値を表に並べたものである。

単変量の確率変数では、砂粒が分布の上から落ち、`X_i` が `x_i` に変わる瞬間を見せます。2変量の確率変数では、同時分布の山または等高線から、`(X_i, Y_i)` が `(x_i, y_i)` に変わる瞬間を見せます。

## 技術構成

- Astro（静的サイト生成フレームワーク）
- MDX（Markdownに部品を埋め込める形式）
- React（UI部品ライブラリ）
- TypeScript（型付きJavaScript）
- SVG（2次元ベクター描画）
- React Three Fiber（React用Three.jsレンダラー）
- Three.js（3次元描画ライブラリ）

## セットアップ

```bash
npm install
npm run dev
```

開発サーバーが起動したら、次を開きます。

```text
http://localhost:4321/01-random-variables-as-data/
```

## 主要ファイル

```text
AGENTS.md                                      Codex向けの作業指示
README.md                                      このファイル
docs/PROJECT_SPEC.md                          全体仕様
docs/INTERACTION_SPEC_FIRST_PAGE.md           第1ページの対話仕様
docs/IMPLEMENTATION_PLAN.md                   実装計画
docs/CONTENT_STYLE_GUIDE.md                   教材表現の方針
docs/CODEX_TASKS.md                           Codexに投げる作業単位
src/pages/01-random-variables-as-data.mdx      最初の試作ページ
src/components/widgets/RandomVariableRealizationWidget.tsx
src/components/widgets/JointDistributionWidget.tsx
src/lib/probability/random.ts                  乱数・分布ロジック
src/lib/visualization/scales.ts                表示用ユーティリティ
```

## 現時点の試作範囲

- 単変量の確率変数が実現値になり、表が埋まる表現
- 2変量の同時分布からペアの実現値が発生し、表が埋まる表現
- 同時分布の 3D surface（3次元曲面）モードと contour（等高線）モードの切り替え
- サンプルサイズ、乱数 seed（種）、分布、相関の操作

## 注意

このフォルダはCodexに読ませるための試作土台です。`package.json` は依存関係を `latest` にしています。初回に `npm install` した後、生成された lock file（固定された依存関係ファイル）をコミットし、それ以後はCodexに依存関係を不用意に更新させないでください。
