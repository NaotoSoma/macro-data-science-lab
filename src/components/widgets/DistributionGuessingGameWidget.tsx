import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_DENSITY_DOMAIN,
  type DensityDomain,
  type DensityPoint,
  type Difficulty,
  type GamePhase,
  type GuessDistributionSpec,
  type GuessDistributionType,
  buildDensityGrid,
  defaultGuessDistribution,
  generateTrueDistribution,
  guessDistributionLabel,
  guessDistributionPdf,
  sampleFromTrueDistribution,
  summarizeGuessDistribution,
  summarizeTrueDistribution,
  trueDistributionLabel,
  trueDistributionPdf,
} from '../../lib/probability/distributionGuessing';
import { type KdeBandwidthMode, estimateKde } from '../../lib/probability/kde';
import { buildLearningComment, calculateShapeScore, classifyDataFit } from '../../lib/probability/scores';
import { clamp, formatNumber, mapDomain } from '../../lib/visualization/scales';

type HistogramBinCount = 10 | 20 | 30;
type GuessMode = 'summaryOnly' | 'distribution';

const SVG_WIDTH = 720;
const SVG_HEIGHT = 270;
const PLOT_LEFT = 42;
const PLOT_RIGHT = 672;
const TOP_Y = 34;
const BASELINE_Y = 176;
const RUG_TOP_Y = 198;
const SAMPLE_SIZES = [10, 30, 100, 300] as const;

function buildPath(points: DensityPoint[], domain: DensityDomain, yMax: number): string {
  return points
    .map((point, index) => {
      const x = mapDomain(point.x, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT);
      const y = mapDomain(point.y, 0, yMax, BASELINE_Y, TOP_Y);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildHistogram(samples: number[], binCount: HistogramBinCount, domain: DensityDomain) {
  const width = (domain.max - domain.min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    x0: domain.min + width * index,
    x1: domain.min + width * (index + 1),
    density: 0,
  }));

  for (const value of samples) {
    if (value < domain.min || value > domain.max) continue;
    const rawIndex = Math.floor(((value - domain.min) / (domain.max - domain.min)) * binCount);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].density += 1 / Math.max(samples.length * width, Number.EPSILON);
  }

  return bins;
}

function nextSampleSize(sampleSize: number): number {
  const index = SAMPLE_SIZES.findIndex((value) => value === sampleSize);
  return SAMPLE_SIZES[Math.min(SAMPLE_SIZES.length - 1, Math.max(0, index) + 1)];
}

function updateParameter(spec: GuessDistributionSpec, key: string, value: number): GuessDistributionSpec {
  return {
    ...spec,
    parameters: {
      ...spec.parameters,
      [key]: value,
    },
  };
}

function phaseLabel(phase: GamePhase): string {
  switch (phase) {
    case 'guessing':
      return '予想中';
    case 'locked':
      return '予想を固定';
    case 'revealed':
      return '正解表示';
    case 'observing':
    default:
      return '点を観察';
  }
}

export default function DistributionGuessingGameWidget() {
  const [seed, setSeed] = useState(2026);
  const [sampleSize, setSampleSize] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [guessMode, setGuessMode] = useState<GuessMode>('summaryOnly');
  const [phase, setPhase] = useState<GamePhase>('observing');
  const [summaryGuess, setSummaryGuess] = useState({ center: 0, spread: 1 });
  const [guessDistribution, setGuessDistribution] = useState<GuessDistributionSpec>(
    defaultGuessDistribution('singlePeak'),
  );
  const [showHistogram, setShowHistogram] = useState(false);
  const [histogramBins, setHistogramBins] = useState<HistogramBinCount>(20);
  const [showKde, setShowKde] = useState(false);
  const [kdeBandwidth, setKdeBandwidth] = useState<KdeBandwidthMode>('standard');

  const trueDistribution = useMemo(() => generateTrueDistribution(seed, difficulty), [difficulty, seed]);
  const samples = useMemo(
    () => sampleFromTrueDistribution(trueDistribution, sampleSize, seed),
    [sampleSize, seed, trueDistribution],
  );
  const domain = DEFAULT_DENSITY_DOMAIN;

  const histogram = useMemo(
    () => (showHistogram ? buildHistogram(samples, histogramBins, domain) : []),
    [domain, histogramBins, samples, showHistogram],
  );
  const kdeDensity = useMemo(
    () => (showKde ? estimateKde(samples, domain, kdeBandwidth) : []),
    [domain, kdeBandwidth, samples, showKde],
  );
  const guessDensity = useMemo(
    () =>
      phase === 'observing' || guessMode === 'summaryOnly'
        ? []
        : buildDensityGrid((x) => guessDistributionPdf(guessDistribution, x), domain),
    [domain, guessDistribution, guessMode, phase],
  );
  const revealedTrueDensity = useMemo(
    () =>
      phase === 'revealed'
        ? buildDensityGrid((x) => trueDistributionPdf(trueDistribution, x), domain)
        : [],
    [domain, phase, trueDistribution],
  );
  const yMax = Math.max(
    0.25,
    ...histogram.map((bin) => bin.density),
    ...kdeDensity.map((point) => point.y),
    ...guessDensity.map((point) => point.y),
    ...revealedTrueDensity.map((point) => point.y),
  );
  const guessPath = useMemo(() => buildPath(guessDensity, domain, yMax), [domain, guessDensity, yMax]);
  const truePath = useMemo(() => buildPath(revealedTrueDensity, domain, yMax), [domain, revealedTrueDensity, yMax]);
  const kdePath = useMemo(() => buildPath(kdeDensity, domain, yMax), [domain, kdeDensity, yMax]);
  const shapeScore = useMemo(
    () => (phase === 'revealed' ? calculateShapeScore(guessDensity, revealedTrueDensity) : null),
    [guessDensity, phase, revealedTrueDensity],
  );
  const dataFit = useMemo(
    () => (phase === 'revealed' && guessMode === 'distribution' ? classifyDataFit(samples, guessDistribution) : null),
    [guessDistribution, guessMode, phase, samples],
  );
  const summaryComparison = useMemo(() => {
    if (phase !== 'revealed') return null;
    const guessSummary =
      guessMode === 'summaryOnly' ? summaryGuess : summarizeGuessDistribution(guessDistribution);
    const trueSummary = summarizeTrueDistribution(trueDistribution);
    return {
      guess: guessSummary,
      truth: trueSummary,
      centerDifference: Math.abs(guessSummary.center - trueSummary.center),
      spreadDifference: Math.abs(guessSummary.spread - trueSummary.spread),
    };
  }, [guessDistribution, guessMode, phase, summaryGuess, trueDistribution]);
  const learningComment = useMemo(
    () =>
      phase === 'revealed' && shapeScore !== null
        ? buildLearningComment({
            trueDistribution,
            guessDistribution,
            n: sampleSize,
            showHistogram,
            showKde,
            shapeScore,
          })
        : null,
    [guessDistribution, phase, sampleSize, shapeScore, showHistogram, showKde, trueDistribution],
  );

  useEffect(() => {
    setPhase('observing');
    setSummaryGuess({ center: 0, spread: 1 });
    setGuessDistribution(defaultGuessDistribution('singlePeak'));
  }, [difficulty, sampleSize, seed]);

  useEffect(() => {
    setPhase('observing');
    setSummaryGuess({ center: 0, spread: 1 });
    setGuessDistribution(defaultGuessDistribution('singlePeak'));
  }, [guessMode]);

  function beginGuessing(nextGuess: GuessDistributionSpec) {
    setGuessDistribution(nextGuess);
    setPhase((current) => (current === 'observing' ? 'guessing' : current));
  }

  function changeSummaryGuess(key: 'center' | 'spread', value: number) {
    setSummaryGuess((current) => ({ ...current, [key]: value }));
    setPhase((current) => (current === 'observing' ? 'guessing' : current));
  }

  function changeGuessType(type: GuessDistributionType) {
    beginGuessing(defaultGuessDistribution(type));
  }

  function changeGuessParameter(key: string, value: number) {
    beginGuessing(updateParameter(guessDistribution, key, value));
  }

  function lockGuess() {
    if (phase === 'guessing') setPhase('locked');
  }

  function revealAnswer() {
    if (phase === 'locked') setPhase('revealed');
  }

  function enlargeSampleSameDistribution() {
    setSampleSize((current) => nextSampleSize(current));
  }

  function newProblem() {
    setSeed((current) => current + 1);
  }

  const guessControlsDisabled = phase === 'locked' || phase === 'revealed';
  const hasStartedGuessing = phase !== 'observing';
  const displayedGuessLabel =
    guessMode === 'summaryOnly' ? '中心と広がり' : guessDistributionLabel(guessDistribution.type);
  const summaryCenterX = mapDomain(summaryGuess.center, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT);
  const summaryLeftX = mapDomain(summaryGuess.center - summaryGuess.spread, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT);
  const summaryRightX = mapDomain(summaryGuess.center + summaryGuess.spread, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT);

  return (
    <section className="widget distribution-game" aria-labelledby="distribution-game-title">
      <div className="widget__header">
        <div>
          <p className="eyebrow">Widget 3</p>
          <h2 id="distribution-game-title">点から分布を読むゲーム</h2>
        </div>
        <p className="widget__message">
          最初に見えるのは観測されたデータ点だけです。点の並びから、背後にありそうな分布の形を予想します。
        </p>
      </div>

      <div className="control-grid" aria-label="出題設定">
        <label>
          サンプルサイズ N
          <select value={sampleSize} onChange={(event) => setSampleSize(Number(event.target.value))}>
            {SAMPLE_SIZES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          難易度
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
            <option value="easy">やさしい</option>
            <option value="standard">標準</option>
            <option value="hard">むずかしい</option>
          </select>
        </label>
        <label>
          seed（種）
          <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
        </label>
        <label>
          予想モード
          <select value={guessMode} onChange={(event) => setGuessMode(event.target.value as GuessMode)}>
            <option value="summaryOnly">中心と広がりだけ</option>
            <option value="distribution">分布も一緒に当てる</option>
          </select>
        </label>
        {guessMode === 'distribution' ? (
          <label>
            予想タイプ
            <select
              value={guessDistribution.type}
              onChange={(event) => changeGuessType(event.target.value as GuessDistributionType)}
              disabled={guessControlsDisabled}
            >
              <option value="singlePeak">山が1つ</option>
              <option value="flat">平ら</option>
              <option value="skewed">片側に長い尾</option>
              <option value="twoPeaks">山が2つ</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="control-grid" aria-label="予想分布の調整">
        {guessMode === 'summaryOnly' ? (
          <>
            <label>
              中心 {formatNumber(summaryGuess.center, 1)}
              <input
                type="range"
                min="-2.5"
                max="2.5"
                step="0.1"
                value={summaryGuess.center}
                onChange={(event) => changeSummaryGuess('center', Number(event.target.value))}
                disabled={guessControlsDisabled}
              />
            </label>
            <label>
              広がり {formatNumber(summaryGuess.spread, 1)}
              <input
                type="range"
                min="0.3"
                max="2.8"
                step="0.1"
                value={summaryGuess.spread}
                onChange={(event) => changeSummaryGuess('spread', Number(event.target.value))}
                disabled={guessControlsDisabled}
              />
            </label>
          </>
        ) : (
          <label>
            中心 {formatNumber(guessDistribution.parameters.center ?? 0, 1)}
            <input
              type="range"
              min="-2.5"
              max="2.5"
              step="0.1"
              value={guessDistribution.parameters.center ?? 0}
              onChange={(event) => changeGuessParameter('center', Number(event.target.value))}
              disabled={guessControlsDisabled}
            />
          </label>
        )}
        {guessMode === 'distribution' && guessDistribution.type === 'singlePeak' ? (
          <label>
            広がり {formatNumber(guessDistribution.parameters.spread ?? 1, 1)}
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.1"
              value={guessDistribution.parameters.spread ?? 1}
              onChange={(event) => changeGuessParameter('spread', Number(event.target.value))}
              disabled={guessControlsDisabled}
            />
          </label>
        ) : null}
        {guessMode === 'distribution' && guessDistribution.type === 'flat' ? (
          <label>
            幅 {formatNumber(guessDistribution.parameters.width ?? 4, 1)}
            <input
              type="range"
              min="1"
              max="7"
              step="0.2"
              value={guessDistribution.parameters.width ?? 4}
              onChange={(event) => changeGuessParameter('width', Number(event.target.value))}
              disabled={guessControlsDisabled}
            />
          </label>
        ) : null}
        {guessMode === 'distribution' && guessDistribution.type === 'skewed' ? (
          <>
            <label>
              広がり {formatNumber(guessDistribution.parameters.spread ?? 1.2, 1)}
              <input
                type="range"
                min="0.5"
                max="2.6"
                step="0.1"
                value={guessDistribution.parameters.spread ?? 1.2}
                onChange={(event) => changeGuessParameter('spread', Number(event.target.value))}
                disabled={guessControlsDisabled}
              />
            </label>
            <label>
              尾の向き
              <select
                value={(guessDistribution.parameters.direction ?? 1) >= 0 ? 'right' : 'left'}
                onChange={(event) => changeGuessParameter('direction', event.target.value === 'right' ? 1 : -1)}
                disabled={guessControlsDisabled}
              >
                <option value="right">右尾</option>
                <option value="left">左尾</option>
              </select>
            </label>
            <label>
              歪みの強さ {formatNumber(guessDistribution.parameters.skewness ?? 1, 1)}
              <input
                type="range"
                min="0.5"
                max="2.4"
                step="0.1"
                value={guessDistribution.parameters.skewness ?? 1}
                onChange={(event) => changeGuessParameter('skewness', Number(event.target.value))}
                disabled={guessControlsDisabled}
              />
            </label>
          </>
        ) : null}
        {guessMode === 'distribution' && guessDistribution.type === 'twoPeaks' ? (
          <>
            <label>
              山の間隔 {formatNumber(guessDistribution.parameters.separation ?? 2, 1)}
              <input
                type="range"
                min="0.7"
                max="4"
                step="0.1"
                value={guessDistribution.parameters.separation ?? 2}
                onChange={(event) => changeGuessParameter('separation', Number(event.target.value))}
                disabled={guessControlsDisabled}
              />
            </label>
            <label>
              左右のバランス {formatNumber(guessDistribution.parameters.balance ?? 0.5, 1)}
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.05"
                value={guessDistribution.parameters.balance ?? 0.5}
                onChange={(event) => changeGuessParameter('balance', Number(event.target.value))}
                disabled={guessControlsDisabled}
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="control-grid" aria-label="補助表示">
        <label>
          ヒストグラム
          <select value={showHistogram ? 'on' : 'off'} onChange={(event) => setShowHistogram(event.target.value === 'on')}>
            <option value="off">表示しない</option>
            <option value="on">表示する</option>
          </select>
        </label>
        <label>
          bin（階級）数
          <select
            value={histogramBins}
            onChange={(event) => setHistogramBins(Number(event.target.value) as HistogramBinCount)}
            disabled={!showHistogram}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </label>
        <label>
          KDE（カーネル密度推定）
          <select value={showKde ? 'on' : 'off'} onChange={(event) => setShowKde(event.target.value === 'on')}>
            <option value="off">表示しない</option>
            <option value="on">表示する</option>
          </select>
        </label>
        <label>
          bandwidth（帯域幅）
          <select
            value={kdeBandwidth}
            onChange={(event) => setKdeBandwidth(event.target.value as KdeBandwidthMode)}
            disabled={!showKde}
          >
            <option value="small">小さい</option>
            <option value="standard">標準</option>
            <option value="large">大きい</option>
          </select>
        </label>
      </div>

      <div className="button-row" aria-label="ゲーム操作">
        <button type="button" onClick={lockGuess} disabled={phase !== 'guessing'}>
          予想を決定
        </button>
        <button type="button" onClick={revealAnswer} disabled={phase !== 'locked'}>
          正解を見る
        </button>
        <button type="button" className="button-row__secondary" onClick={enlargeSampleSameDistribution} disabled={sampleSize >= 300}>
          同じ分布でNを増やす
        </button>
        <button type="button" className="button-row__secondary" onClick={newProblem}>
          新しい問題
        </button>
      </div>

      <div className="widget__body widget__body--two-columns">
        <div className="viz-panel">
          <div className="viz-panel__title">
            <strong>観測されたデータ点</strong>
            <span>N = {sampleSize}</span>
          </div>
          <svg className="density-svg distribution-game__svg" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img" aria-label="観測点から分布を推測する図">
            <line x1={PLOT_LEFT} y1={BASELINE_Y} x2={PLOT_RIGHT} y2={BASELINE_Y} className="axis-line" />
            {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((tick) => (
              <g key={tick}>
                <line
                  x1={mapDomain(tick, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT)}
                  y1={BASELINE_Y}
                  x2={mapDomain(tick, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT)}
                  y2={BASELINE_Y + 6}
                  className="tick-line"
                />
                <text x={mapDomain(tick, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT)} y={BASELINE_Y + 24} textAnchor="middle" className="axis-label">
                  {tick}
                </text>
              </g>
            ))}

            {histogram.map((bin) => {
              const x = mapDomain(bin.x0, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT);
              const width = Math.max(1, mapDomain(bin.x1, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT) - x - 1);
              const height = mapDomain(bin.density, 0, yMax, 0, BASELINE_Y - TOP_Y);
              return <rect key={bin.x0} x={x} y={BASELINE_Y - height} width={width} height={height} className="distribution-game__histogram" />;
            })}

            {kdePath ? <path d={kdePath} className="distribution-game__kde-line" /> : null}
            {guessPath ? <path d={guessPath} className="distribution-game__guess-line" /> : null}
            {phase === 'revealed' && truePath ? <path d={truePath} className="distribution-game__true-line" /> : null}
            {phase !== 'observing' && guessMode === 'summaryOnly' ? (
              <g className="distribution-game__summary-guess">
                <rect
                  x={clamp(Math.min(summaryLeftX, summaryRightX), PLOT_LEFT, PLOT_RIGHT)}
                  y={TOP_Y}
                  width={Math.max(1, clamp(Math.max(summaryLeftX, summaryRightX), PLOT_LEFT, PLOT_RIGHT) - clamp(Math.min(summaryLeftX, summaryRightX), PLOT_LEFT, PLOT_RIGHT))}
                  height={BASELINE_Y - TOP_Y}
                  className="distribution-game__spread-band"
                />
                <line
                  x1={clamp(summaryCenterX, PLOT_LEFT, PLOT_RIGHT)}
                  y1={TOP_Y}
                  x2={clamp(summaryCenterX, PLOT_LEFT, PLOT_RIGHT)}
                  y2={BASELINE_Y + 42}
                  className="distribution-game__center-line"
                />
                <text
                  x={clamp(summaryCenterX + 8, PLOT_LEFT + 8, PLOT_RIGHT - 8)}
                  y={TOP_Y + 16}
                  className="axis-label"
                >
                  予想中心
                </text>
              </g>
            ) : null}

            {samples.map((value, index) => {
              const x = clamp(mapDomain(value, domain.min, domain.max, PLOT_LEFT, PLOT_RIGHT), PLOT_LEFT, PLOT_RIGHT);
              const y = RUG_TOP_Y + (index % 6) * 6;
              return <circle key={`${index}-${value}`} cx={x} cy={y} r={sampleSize >= 100 ? 2.5 : 3.6} className="distribution-game__data-dot" />;
            })}
          </svg>
          <div className="stat-strip">
            <span>状態: {phaseLabel(phase)}</span>
            <span>予想: {hasStartedGuessing ? displayedGuessLabel : '?'}</span>
            {showHistogram ? <span>ヒストグラム: bin {histogramBins}</span> : null}
            {showKde ? <span>KDE: {kdeBandwidth === 'small' ? '小さい' : kdeBandwidth === 'large' ? '大きい' : '標準'}</span> : null}
          </div>
        </div>

        <div className="table-panel distribution-game__side-panel">
          <div className="table-panel__title">
            <strong>予想と正解</strong>
            <span>{phase === 'revealed' ? '比較できます' : 'まだ隠れています'}</span>
          </div>
          <div className="distribution-game__result">
            <p>
              <strong>{guessMode === 'summaryOnly' ? '予想' : '予想分布'}:</strong>{' '}
              {hasStartedGuessing ? displayedGuessLabel : '?'}
            </p>
            <p>
              <strong>真の分布:</strong> {phase === 'revealed' ? trueDistributionLabel(trueDistribution.type) : '?'}
            </p>
            {phase === 'revealed' && summaryComparison ? (
              <>
                {guessMode === 'distribution' && shapeScore !== null && dataFit ? (
                  <>
                    <p>
                      <strong>形の近さ:</strong> {shapeScore}点
                    </p>
                    <p>
                      <strong>点への当てはまり:</strong> {dataFit}
                    </p>
                  </>
                ) : null}
                {summaryComparison ? (
                  <div className="distribution-game__comparison" aria-label="中心と広がりの比較">
                    <div className="distribution-game__comparison-row distribution-game__comparison-row--header">
                      <span></span>
                      <span>予想</span>
                      <span>正解</span>
                      <span>差</span>
                    </div>
                    <div className="distribution-game__comparison-row">
                      <span>中心</span>
                      <span>{formatNumber(summaryComparison.guess.center)}</span>
                      <span>{formatNumber(summaryComparison.truth.center)}</span>
                      <span>{formatNumber(summaryComparison.centerDifference)}</span>
                    </div>
                    <div className="distribution-game__comparison-row">
                      <span>広がり</span>
                      <span>{formatNumber(summaryComparison.guess.spread)}</span>
                      <span>{formatNumber(summaryComparison.truth.spread)}</span>
                      <span>{formatNumber(summaryComparison.spreadDifference)}</span>
                    </div>
                  </div>
                ) : null}
                <p className="distribution-game__comment">
                  {guessMode === 'summaryOnly'
                    ? 'このモードでは、分布の形を当てる前に、点の集まりの中心と広がりだけを読み取ります。次に分布も一緒に当てるモードで、形の違いまで見てみましょう。'
                    : learningComment}
                </p>
              </>
            ) : (
              <p className="distribution-game__comment">
                点の位置、端にある点、山が1つに見えるかどうかを見てから、予想を固定してください。
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
