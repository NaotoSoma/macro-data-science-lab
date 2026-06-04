export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function mapDomain(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return lerp(rangeMin, rangeMax, t);
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}
