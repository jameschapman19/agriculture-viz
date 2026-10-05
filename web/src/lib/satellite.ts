import type { SatelliteExport, SatelliteObservation } from './types';
const DAY = 86400000;
export const dayOfYear = (date: string) => Math.floor((Date.parse(date) - Date.UTC(Number(date.slice(0, 4)), 0, 1)) / DAY);
export function bySeason(data: SatelliteExport, region: string) {
  const seasons = new Map<number, SatelliteObservation[]>();
  for (const o of data.observations) if (o.region === region) {
    const year = Number(o.windowStart.slice(0, 4));
    seasons.set(year, [...(seasons.get(year) ?? []), o]);
  }
  for (const rows of seasons.values()) rows.sort((a, b) => a.windowStart.localeCompare(b.windowStart));
  return seasons;
}
/** Windows with no clear scene are absent; consecutive observed windows stay joined, gaps break the line. */
export function segments(rows: SatelliteObservation[], windowDays: number) {
  const out: SatelliteObservation[][] = [];
  rows.forEach((row, i) => {
    if (!i || Date.parse(row.windowStart) - Date.parse(rows[i - 1].windowStart) > windowDays * DAY) out.push([]);
    out.at(-1)!.push(row);
  });
  return out;
}
