import { useEffect, useMemo, useState } from 'react';
import {
  type DistributionKind,
  distributionLabel,
  sampleUnivariateSeries,
  univariatePdf,
} from '../../lib/probability/random';
import { formatNumber, mapDomain, range } from '../../lib/visualization/scales';

type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'done';
type PlaybackSpeed = 'slow' | 'normal' | 'fast';

const DOMAIN_MIN = -4;
const DOMAIN_MAX = 4;
const SVG_WIDTH = 680;
const SVG_HEIGHT = 270;
const PLOT_LEFT = 36;
const PLOT_RIGHT = 640;
const BASELINE_Y = 196;
const TOP_Y = 34;

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(query.matches);

    updatePreference();
    query.addEventListener('change', updatePreference);
    return () => query.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useResponsiveHistogramBinCount(): number {
  const [binCount, setBinCount] = useState(24);

  useEffect(() => {
    const updateBinCount = () => {
      const nextBinCount = Math.round(window.innerWidth / 44);
      setBinCount(Math.min(32, Math.max(12, nextBinCount)));
    };

    updateBinCount();
    window.addEventListener('resize', updateBinCount);
    return () => window.removeEventListener('resize', updateBinCount);
  }, []);

  return binCount;
}

function speedToMs(speed: PlaybackSpeed): number {
  switch (speed) {
    case 'slow':
      return 850;
    case 'fast':
      return 120;
    case 'normal':
    default:
      return 420;
  }
}

function buildDensityPath(kind: DistributionKind): string {
  const xs = range(160).map((index) => DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) * index) / 159);
  const ys = xs.map((x) => univariatePdf(kind, x));
  const maxY = Math.max(...ys, 0.01);

  return xs
    .map((x, index) => {
      const px = mapDomain(x, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT);
      const py = mapDomain(ys[index], 0, maxY, BASELINE_Y, TOP_Y);
      return `${index === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`;
    })
    .join(' ');
}

function buildHistogram(values: number[], binCount = 24): Array<{ x0: number; x1: number; count: number }> {
  const bins = Array.from({ length: binCount }, (_, index) => {
    const x0 = DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) * index) / binCount;
    const x1 = DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) * (index + 1)) / binCount;
    return { x0, x1, count: 0 };
  });

  for (const value of values) {
    if (value < DOMAIN_MIN || value > DOMAIN_MAX) continue;
    const rawIndex = Math.floor(((value - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * binCount);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  }

  return bins;
}

export default function RandomVariableRealizationWidget() {
  const [distribution, setDistribution] = useState<DistributionKind>('normal');
  const [sampleSize, setSampleSize] = useState(30);
  const [seed, setSeed] = useState(2026);
  const [speed, setSpeed] = useState<PlaybackSpeed>('normal');
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [realizedCount, setRealizedCount] = useState(0);
  const [showDistribution, setShowDistribution] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const histogramBinCount = useResponsiveHistogramBinCount();
  const playbackMs = prefersReducedMotion ? Math.min(180, speedToMs(speed)) : speedToMs(speed);
  const grainDurationMs = prefersReducedMotion ? 0 : Math.max(90, Math.min(playbackMs - 20, playbackMs * 0.82));

  const samples = useMemo(
    () => sampleUnivariateSeries(distribution, sampleSize, seed),
    [distribution, sampleSize, seed],
  );

  const realizedValues = useMemo(() => samples.slice(0, realizedCount), [realizedCount, samples]);
  const densityPath = useMemo(() => buildDensityPath(distribution), [distribution]);
  const histogram = useMemo(() => buildHistogram(realizedValues, histogramBinCount), [histogramBinCount, realizedValues]);
  const maxBinCount = Math.max(1, ...histogram.map((bin) => bin.count));
  const currentValue = status === 'playing' && realizedCount < samples.length ? samples[realizedCount] : null;
  const sampleMean = realizedValues.length
    ? realizedValues.reduce((accumulator, value) => accumulator + value, 0) / realizedValues.length
    : null;

  useEffect(() => {
    setRealizedCount(0);
    setStatus('idle');
  }, [distribution, sampleSize, seed]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (realizedCount >= sampleSize) {
      setStatus('done');
      return;
    }

    const id = window.setTimeout(() => {
      setRealizedCount((count) => {
        const nextCount = Math.min(count + 1, sampleSize);
        if (nextCount >= sampleSize) {
          setStatus('done');
        }
        return nextCount;
      });
    }, playbackMs);

    return () => window.clearTimeout(id);
  }, [playbackMs, realizedCount, sampleSize, status]);

  function play() {
    if (realizedCount >= sampleSize) {
      setRealizedCount(0);
    }
    setStatus('playing');
  }

  function pause() {
    setStatus((current) => (current === 'playing' ? 'paused' : current));
  }

  function reset() {
    setStatus('idle');
    setRealizedCount(0);
  }

  function realizeAll() {
    setStatus('done');
    setRealizedCount(sampleSize);
  }

  return (
    <section className="widget" aria-labelledby="rv-widget-title">
      <div className="widget__header">
        <div>
          <p className="eyebrow">Widget 1</p>
          <h2 id="rv-widget-title">1変数の確率変数がデータになる</h2>
        </div>
        <p className="widget__message">
          表は最初から数字だったわけではありません。各行の <code>X_i</code> が実現して{' '}
          <code>x_i</code> になります。
        </p>
      </div>

      <div className="control-grid" aria-label="単変量の操作">
        <label>
          分布
          <select value={distribution} onChange={(event) => setDistribution(event.target.value as DistributionKind)}>
            <option value="normal">正規分布</option>
            <option value="uniform">一様分布</option>
            <option value="skewed">右に歪んだ分布</option>
            <option value="bimodal">二峰分布</option>
          </select>
        </label>
        <label>
          サンプルサイズ N
          <select value={sampleSize} onChange={(event) => setSampleSize(Number(event.target.value))}>
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </label>
        <label>
          seed（種）
          <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
        </label>
        <label>
          再生速度
          <select value={speed} onChange={(event) => setSpeed(event.target.value as PlaybackSpeed)}>
            <option value="slow">ゆっくり</option>
            <option value="normal">標準</option>
            <option value="fast">速い</option>
          </select>
        </label>
      </div>

      <div className="button-row" aria-label="単変量の再生操作">
        <button type="button" onClick={play} disabled={status === 'playing'}>
          再生
        </button>
        <button type="button" onClick={pause} disabled={status !== 'playing'}>
          停止
        </button>
        <button type="button" onClick={reset}>
          実現前に戻す
        </button>
        <button type="button" onClick={realizeAll}>
          一括実現
        </button>
        <button type="button" className="button-row__secondary" onClick={() => setShowDistribution((current) => !current)}>
          {showDistribution ? '確率分布を消す' : '確率分布を表示'}
        </button>
      </div>

      <div className="widget__body widget__body--two-columns">
        <div className="viz-panel">
          <div className="viz-panel__title">
            <strong>{distributionLabel(distribution)}</strong>
            <span>
              実現済み {realizedCount} / {sampleSize}
            </span>
          </div>
          <svg className="density-svg" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img" aria-label="確率分布から観測値が落ちてくる図">
            <line x1={PLOT_LEFT} y1={BASELINE_Y} x2={PLOT_RIGHT} y2={BASELINE_Y} className="axis-line" />
            {[-3, -2, -1, 0, 1, 2, 3].map((tick) => (
              <g key={tick}>
                <line
                  x1={mapDomain(tick, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)}
                  y1={BASELINE_Y}
                  x2={mapDomain(tick, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)}
                  y2={BASELINE_Y + 6}
                  className="tick-line"
                />
                <text x={mapDomain(tick, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)} y={BASELINE_Y + 22} textAnchor="middle" className="axis-label">
                  {tick}
                </text>
              </g>
            ))}
            {showDistribution ? <path d={densityPath} className="density-line" /> : null}

            {histogram.map((bin) => {
              const x = mapDomain(bin.x0, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT);
              const width = Math.max(1, mapDomain(bin.x1, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT) - x - 1);
              const height = mapDomain(bin.count, 0, maxBinCount, 0, 58);
              return <rect key={bin.x0} x={x} y={BASELINE_Y - height} width={width} height={height} className="histogram-bar" />;
            })}

            {realizedValues.map((value, index) => (
              <circle
                key={`${index}-${value}`}
                cx={mapDomain(value, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)}
                cy={BASELINE_Y + 34 + (index % 4) * 4}
                r={3}
                className="sample-dot"
              />
            ))}

            {currentValue !== null ? (
              <g key={`grain-${realizedCount}`}>
                <line
                  x1={mapDomain(currentValue, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)}
                  y1={TOP_Y - 14}
                  x2={mapDomain(currentValue, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)}
                  y2={BASELINE_Y}
                  className="drop-guide"
                />
                <circle
                  cx={mapDomain(currentValue, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)}
                  cy={prefersReducedMotion ? BASELINE_Y : TOP_Y - 12}
                  r={6}
                  className="sand-grain"
                >
                  {prefersReducedMotion ? null : (
                    <animate
                      attributeName="cy"
                      from={TOP_Y - 12}
                      to={BASELINE_Y}
                      dur={`${grainDurationMs}ms`}
                      fill="freeze"
                    />
                  )}
                </circle>
              </g>
            ) : null}
          </svg>

          <div className="stat-strip" aria-label="実現済みの要約">
            <span>平均: {sampleMean === null ? '未計算' : formatNumber(sampleMean)}</span>
            <span>現在の状態: {status === 'idle' ? '実現前' : status === 'done' ? '完了' : status === 'playing' ? '再生中' : '停止中'}</span>
            {!showDistribution ? <span>確率分布を非表示</span> : null}
          </div>
        </div>

        <div className="table-panel" aria-label="確率変数と実現値の表">
          <div className="table-panel__title">N行のデータ表</div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>i</th>
                  <th>実現前</th>
                  <th>データ</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((value, index) => {
                  const isRealized = index < realizedCount;
                  const isCurrent = index === realizedCount && status === 'playing';
                  return (
                    <tr key={index} className={isCurrent ? 'is-current' : isRealized ? 'is-realized' : undefined}>
                      <td>{index + 1}</td>
                      <td>
                        <code>X_{index + 1}</code>
                      </td>
                      <td>{isRealized ? <code>x_{index + 1} = {formatNumber(value)}</code> : '?'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
