import type { Geometry, Position } from 'geojson';
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
/** Mean NDVI for the same window of the year in seasons before `season`; needs at least two. */
export function baseline(data: SatelliteExport, region: string, key: string, season: number): number | null {
  const prior = data.observations.filter(o => o.region === region && o.windowStart.slice(5) === key && Number(o.windowStart.slice(0, 4)) < season);
  return prior.length >= 2 ? prior.reduce((sum, o) => sum + o.ndvi, 0) / prior.length : null;
}
export const windowKeys = (data: SatelliteExport) => [...new Set(data.observations.map(o => o.windowStart.slice(5)))].sort();

const area = (ring: Position[]) => ring.reduce((sum, [x, y], i) => { const [x2, y2] = ring[(i + 1) % ring.length]; return sum + (x2 - x) * (y2 + y); }, 0);
/** d3-geo wants clockwise exterior rings; RFC 7946 and shapely emit counter-clockwise, which d3 reads as "everything but this polygon". */
export function d3Winding(geometry: Geometry): Geometry {
  const fix = (rings: Position[][]) => rings.map((ring, i) => ((area(ring) < 0) === (i === 0) ? [...ring].reverse() : ring));
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: fix(geometry.coordinates) };
  if (geometry.type === 'MultiPolygon') return { ...geometry, coordinates: geometry.coordinates.map(fix) };
  return geometry;
}
