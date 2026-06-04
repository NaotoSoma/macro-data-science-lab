import { useEffect, useMemo, useState } from 'react';
import {
  type DistributionKind,
  distributionLabel,
  sampleRepeatedUnivariateSeries,
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

function speedToMs(speed: PlaybackSpeed): number {
  switch (speed) {
    case 'slow':
      return 900;
    case 'fast':
      return 130;
    case 'normal':
    default:
      return 460;
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

function buildHistogram(
  values: number[],
  binCount: number,
  domainMin = DOMAIN_MIN,
  domainMax = DOMAIN_MAX,
): Array<{ x0: number; x1: number; count: number }> {
  const bins = Array.from({ length: binCount }, (_, index) => {
    const x0 = domainMin + ((domainMax - domainMin) * index) / binCount;
    const x1 = domainMin + ((domainMax - domainMin) * (index + 1)) / binCount;
    return { x0, x1, count: 0 };
  });

  for (const value of values) {
    if (value < domainMin || value > domainMax) continue;
    const rawIndex = Math.floor(((value - domainMin) / (domainMax - domainMin)) * binCount);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  }

  return bins;
}

function buildMeanDomain(values: number[], sampleSize: number): { min: number; max: number; digits: number } {
  const minimumWidth = Math.max(0.08, 6 / Math.sqrt(sampleSize));

  if (values.length === 0) {
    const halfWidth = minimumWidth / 2;
    return {
      min: -halfWidth,
      max: halfWidth,
      digits: minimumWidth < 0.5 ? 3 : 2,
    };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const center = (minValue + maxValue) / 2;
  const width = Math.max((maxValue - minValue) * 1.35, minimumWidth);
  const digits = width < 0.5 ? 3 : 2;

  return {
    min: center - width / 2,
    max: center + width / 2,
    digits,
  };
}

function buildTicks(min: number, max: number, count: number): number[] {
  if (count <= 1) return [(min + max) / 2];
  return range(count).map((index) => min + ((max - min) * index) / (count - 1));
}

function formatSampleValues(values: number[]): string {
  if (values.length <= 6) {
    return values.map((value) => formatNumber(value)).join(', ');
  }

  const head = values.slice(0, 4).map((value) => formatNumber(value)).join(', ');
  return `${head}, ...`;
}

export default function RepeatedSamplingWidget() {
  const [distribution, setDistribution] = useState<DistributionKind>('normal');
  const [sampleSize, setSampleSize] = useState(10);
  const [sampleCount, setSampleCount] = useState(50);
  const [seed, setSeed] = useState(2026);
  const [speed, setSpeed] = useState<PlaybackSpeed>('normal');
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [realizedSampleCount, setRealizedSampleCount] = useState(0);
  const [showDistribution, setShowDistribution] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const playbackMs = prefersReducedMotion ? Math.min(180, speedToMs(speed)) : speedToMs(speed);

  const samples = useMemo(
    () => sampleRepeatedUnivariateSeries(distribution, sampleSize, sampleCount, seed),
    [distribution, sampleCount, sampleSize, seed],
  );
  const realizedSamples = useMemo(() => samples.slice(0, realizedSampleCount), [realizedSampleCount, samples]);
  const currentSample = realizedSampleCount > 0 ? samples[realizedSampleCount - 1] : null;
  const currentValues = currentSample?.values ?? [];
  const realizedMeans = useMemo(() => realizedSamples.map((sample) => sample.mean), [realizedSamples]);
  const meanDomain = useMemo(() => buildMeanDomain(realizedMeans, sampleSize), [realizedMeans, sampleSize]);
  const meanTicks = useMemo(() => buildTicks(meanDomain.min, meanDomain.max, 5), [meanDomain.max, meanDomain.min]);
  const densityPath = useMemo(() => buildDensityPath(distribution), [distribution]);
  const currentHistogram = useMemo(() => buildHistogram(currentValues, 22), [currentValues]);
  const meanHistogram = useMemo(
    () => buildHistogram(realizedMeans, 26, meanDomain.min, meanDomain.max),
    [meanDomain.max, meanDomain.min, realizedMeans],
  );
  const maxCurrentBinCount = Math.max(1, ...currentHistogram.map((bin) => bin.count));
  const maxMeanBinCount = Math.max(1, ...meanHistogram.map((bin) => bin.count));

  useEffect(() => {
    setRealizedSampleCount(0);
    setStatus('idle');
  }, [distribution, sampleCount, sampleSize, seed]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (realizedSampleCount >= sampleCount) {
      setStatus('done');
      return;
    }

    const id = window.setTimeout(() => {
      setRealizedSampleCount((count) => {
        const nextCount = Math.min(count + 1, sampleCount);
        if (nextCount >= sampleCount) {
          setStatus('done');
        }
        return nextCount;
      });
    }, playbackMs);

    return () => window.clearTimeout(id);
  }, [playbackMs, realizedSampleCount, sampleCount, status]);

  function realizeOneSample() {
    setStatus((current) => (current === 'playing' ? 'paused' : current));
    setRealizedSampleCount((count) => {
      const nextCount = Math.min(count + 1, sampleCount);
      if (nextCount >= sampleCount) {
        setStatus('done');
      }
      return nextCount;
    });
  }

  function play() {
    if (realizedSampleCount >= sampleCount) {
      setRealizedSampleCount(0);
    }
    setStatus('playing');
  }

  function pause() {
    setStatus((current) => (current === 'playing' ? 'paused' : current));
  }

  function reset() {
    setStatus('idle');
    setRealizedSampleCount(0);
  }

  function realizeAll() {
    setStatus('done');
    setRealizedSampleCount(sampleCount);
  }

  return (
    <section className="widget" aria-labelledby="repeated-sampling-widget-title">
      <div className="widget__header">
        <div>
          <p className="eyebrow">Widget</p>
          <h2 id="repeated-sampling-widget-title">同じNの標本を何度も取る</h2>
        </div>
        <p className="widget__message">
          1回ごとの標本は揺れます。そのたびに標本平均 <code><span className="xbar-symbol">x</span></code> も1つ実現し、右側に分布を作っていきます。
        </p>
      </div>

      <div className="control-grid" aria-label="標本分布の操作">
        <label>
          母集団分布
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
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={100}>100</option>
            <option value={1000}>1000</option>
            <option value={10000}>10000</option>
          </select>
        </label>
        <label>
          標本回数 M
          <select value={sampleCount} onChange={(event) => setSampleCount(Number(event.target.value))}>
            <option value={10}>10</option>
            <option value={50}>50</option>
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

      <div className="button-row" aria-label="標本分布の再生操作">
        <button type="button" onClick={realizeOneSample} disabled={realizedSampleCount >= sampleCount}>
          1標本を取る
        </button>
        <button type="button" onClick={play} disabled={status === 'playing'}>
          連続で取る
        </button>
        <button type="button" onClick={pause} disabled={status !== 'playing'}>
          停止
        </button>
        <button type="button" onClick={reset}>
          リセット
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
            <strong>母集団分布と今回の標本</strong>
            <span>
              標本 {realizedSampleCount} / {sampleCount}
            </span>
          </div>
          <svg className="density-svg" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img" aria-label="母集団分布から今回の標本が引かれる図">
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

            {currentHistogram.map((bin) => {
              const x = mapDomain(bin.x0, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT);
              const width = Math.max(1, mapDomain(bin.x1, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT) - x - 1);
              const height = mapDomain(bin.count, 0, maxCurrentBinCount, 0, 58);
              return <rect key={bin.x0} x={x} y={BASELINE_Y - height} width={width} height={height} className="histogram-bar" />;
            })}

            {currentValues.slice(0, 600).map((value, index) => (
              <circle
                key={`${index}-${value}`}
                cx={mapDomain(value, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT)}
                cy={BASELINE_Y + 34 + (index % 4) * 4}
                r={sampleSize >= 1000 ? 1.4 : sampleSize >= 100 ? 2.3 : 3.2}
                className="sample-dot"
              />
            ))}

            {currentSample ? (
              <g>
                {(() => {
                  const meanX = mapDomain(currentSample.mean, DOMAIN_MIN, DOMAIN_MAX, PLOT_LEFT, PLOT_RIGHT);
                  const labelIsLeft = meanX > PLOT_RIGHT - 86;
                  return (
                    <>
                      <line x1={meanX} y1={TOP_Y} x2={meanX} y2={BASELINE_Y + 58} className="mean-line" />
                      <text
                        x={meanX + (labelIsLeft ? -8 : 8)}
                        y={BASELINE_Y + 54}
                        textAnchor={labelIsLeft ? 'end' : 'start'}
                        className="axis-label"
                      >
                        <tspan className="xbar-symbol">x</tspan>
                        <tspan> = {formatNumber(currentSample.mean)}</tspan>
                      </text>
                    </>
                  );
                })()}
              </g>
            ) : null}
          </svg>
          <div className="stat-strip">
            <span>{distributionLabel(distribution)}</span>
            <span>今回の標本平均: {currentSample ? formatNumber(currentSample.mean) : '?'}</span>
            {!showDistribution ? <span>確率分布を非表示</span> : null}
          </div>
        </div>

        <div className="viz-panel">
          <div className="viz-panel__title">
            <strong>標本平均の分布</strong>
            <span>
              <span className="xbar-symbol">x</span> {realizedMeans.length}個
            </span>
          </div>
          <svg className="density-svg" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img" aria-label="標本平均が積み上がってできる分布">
            <line x1={PLOT_LEFT} y1={BASELINE_Y} x2={PLOT_RIGHT} y2={BASELINE_Y} className="axis-line" />
            {meanTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={mapDomain(tick, meanDomain.min, meanDomain.max, PLOT_LEFT, PLOT_RIGHT)}
                  y1={BASELINE_Y}
                  x2={mapDomain(tick, meanDomain.min, meanDomain.max, PLOT_LEFT, PLOT_RIGHT)}
                  y2={BASELINE_Y + 6}
                  className="tick-line"
                />
                <text x={mapDomain(tick, meanDomain.min, meanDomain.max, PLOT_LEFT, PLOT_RIGHT)} y={BASELINE_Y + 22} textAnchor="middle" className="axis-label">
                  {formatNumber(tick, meanDomain.digits)}
                </text>
              </g>
            ))}
            {meanHistogram.map((bin) => {
              const x = mapDomain(bin.x0, meanDomain.min, meanDomain.max, PLOT_LEFT, PLOT_RIGHT);
              const width = Math.max(1, mapDomain(bin.x1, meanDomain.min, meanDomain.max, PLOT_LEFT, PLOT_RIGHT) - x - 1);
              const height = mapDomain(bin.count, 0, maxMeanBinCount, 0, 148);
              return <rect key={bin.x0} x={x} y={BASELINE_Y - height} width={width} height={height} className="histogram-bar histogram-bar--mean" />;
            })}
            {realizedMeans.map((mean, index) => (
              <circle
                key={`${index}-${mean}`}
                cx={mapDomain(mean, meanDomain.min, meanDomain.max, PLOT_LEFT, PLOT_RIGHT)}
                cy={BASELINE_Y + 34 + (index % 5) * 4}
                r={2.8}
                className="sample-dot sample-dot--mean"
              />
            ))}
          </svg>
          <div className="stat-strip">
            <span>標本回数: {realizedSampleCount} / {sampleCount}</span>
            <span>N = {sampleSize}</span>
            <span>表示範囲: {formatNumber(meanDomain.min, meanDomain.digits)} から {formatNumber(meanDomain.max, meanDomain.digits)}</span>
            <span>現在の状態: {status === 'idle' ? '実現前' : status === 'done' ? '完了' : status === 'playing' ? '再生中' : '停止中'}</span>
          </div>
        </div>
      </div>

      <div className="table-panel table-panel--wide" aria-label="同じNの標本を並べた表">
        <div className="table-panel__title">
          <strong>同じNの標本を並べる</strong>
          <span>行が増えるのは標本回数 M です</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>標本</th>
                <th>データ</th>
                <th>標本平均</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, index) => {
                const isRealized = index < realizedSampleCount;
                const isCurrent = index === realizedSampleCount - 1 && realizedSampleCount > 0;
                return (
                  <tr key={sample.index} className={isCurrent ? 'is-current' : isRealized ? 'is-realized' : undefined}>
                    <td>{sample.index}</td>
                    <td>{isRealized ? <code>{formatSampleValues(sample.values)}</code> : '?'}</td>
                    <td>{isRealized ? <code><span className="xbar-symbol">x</span>_{sample.index} = {formatNumber(sample.mean)}</code> : '?'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
