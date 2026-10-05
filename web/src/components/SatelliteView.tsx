'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Database, Satellite } from 'lucide-react';
import { bySeason, dayOfYear, segments } from '@/lib/satellite';
import { number, releaseDate } from '@/lib/data';
import type { SatelliteExport } from '@/lib/types';

const WIDTH = 760, HEIGHT = 300, LEFT = 44, RIGHT = 16, TOP = 14, BOTTOM = 262;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SatelliteView() {
  const [data, setData] = useState<SatelliteExport | null | 'missing'>(null);
  const [region, setRegion] = useState('');
  const [hover, setHover] = useState<{ season: number; index: number } | null>(null);
  useEffect(() => {
    fetch('/data/satellite.json').then(r => (r.ok ? r.json() : 'missing')).then((d: SatelliteExport | 'missing') => { setData(d); if (d !== 'missing') setRegion(d.regions[0].id); }).catch(() => setData('missing'));
  }, []);
  const header = <header className="site-header"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true"/><span>Agriculture <strong>Radar</strong></span></Link><nav aria-label="Main navigation"><Link href="/">Explore</Link><Link href="/satellite/" className="active">Satellite</Link><Link href="/methodology/">Methodology</Link></nav><span className="header-note">Sentinel-2 · experimental</span></header>;
  if (data === null) return <>{header}<main className="state-page" aria-busy="true"><Satellite size={32}/><h1>Loading satellite observations</h1></main></>;
  if (data === 'missing') return <>{header}<main className="state-page"><Satellite size={32}/><h1>No satellite data published yet</h1><p>Sentinel-2 vegetation summaries appear here once a validated extraction has been published. Nothing is shown in the meantime rather than placeholder values.</p></main></>;

  const seasons = bySeason(data, region);
  const years = [...seasons.keys()].sort((a, b) => a - b);
  const current = years.at(-1)!;
  const all = data.observations.filter(o => o.region === region);
  const start = Math.min(...all.map(o => dayOfYear(o.windowStart))), end = Math.max(...all.map(o => dayOfYear(o.windowStart))) + data.windowDays;
  const x = (day: number) => LEFT + (day - start) / (end - start) * (WIDTH - LEFT - RIGHT);
  const y = (v: number) => BOTTOM - Math.max(0, Math.min(1, v)) * (BOTTOM - TOP);
  const path = (rows: typeof all) => rows.map((o, i) => `${i ? 'L' : 'M'}${x(dayOfYear(o.windowStart) + data.windowDays / 2)},${y(o.ndvi)}`).join(' ');
  const windows = [...new Set(all.map(o => o.windowStart.slice(5)))].sort();
  const lookup = new Map(all.map(o => [o.windowStart, o]));
  const shown = hover ? seasons.get(hover.season)![hover.index] : null;
  const name = data.regions.find(r => r.id === region)!.name;
  const latest = seasons.get(current)!.at(-1)!;
  const cell = (WIDTH - LEFT - RIGHT) / windows.length;

  return <>{header}<main className="dashboard satellite">
    <div className="explorer-heading"><div><span className="eyebrow">Satellite observations · experimental</span><h1>Vegetation through the season</h1></div>
      <div className="select-wrap sat-select"><select aria-label="Region" value={region} onChange={e => { setRegion(e.target.value); setHover(null); }}>{data.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select><ChevronDown size={14}/></div></div>
    <section className="map-card sat-card" aria-label="NDVI by season">
      <div className="section-heading"><div><span className="eyebrow">{name} · {current} vs earlier seasons</span><h2>NDVI by {data.windowDays}-day window</h2></div></div>
      <div className="map-stats"><div><span>Latest window</span><strong>{releaseDate(latest.windowStart)}</strong></div><div><span>Latest NDVI</span><strong>{number(latest.ndvi, 2)}</strong></div><div><span>Clear pixels in latest window</span><strong>{number(latest.validFraction * 100, 0)}%</strong></div></div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`NDVI by window for ${name}, ${years.join(', ')}`} className="sat-chart" onPointerLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(v => <g key={v}><line x1={LEFT} x2={WIDTH - RIGHT} y1={y(v)} y2={y(v)} stroke="var(--radar-grid)" strokeDasharray="3 4"/><text x={LEFT - 8} y={y(v) + 4} textAnchor="end" className="axis">{number(v, 2)}</text></g>)}
        {MONTHS.map((m, i) => { const day = dayOfYear(`${current}-${String(i + 1).padStart(2, '0')}-01`); return day >= start && day <= end ? <text key={m} x={x(day)} y={HEIGHT - 8} className="axis">{m}</text> : null; })}
        {years.slice(0, -1).map(year => segments(seasons.get(year)!, data.windowDays).map((s, i) => <path key={`${year}-${i}`} d={path(s)} fill="none" stroke="var(--muted)" strokeOpacity=".45" strokeWidth="1.4"/>))}
        {segments(seasons.get(current)!, data.windowDays).map((s, i) => <path key={`c-${i}`} d={path(s)} fill="none" stroke="var(--teal)" strokeWidth="2.6" strokeLinejoin="round"/>)}
        {years.flatMap(year => seasons.get(year)!.map((o, index) => <circle key={`${year}-${o.windowStart}`} cx={x(dayOfYear(o.windowStart) + data.windowDays / 2)} cy={y(o.ndvi)} r={year === current ? 4 : 7} fill={year === current ? 'var(--teal)' : 'transparent'} fillOpacity={year === current ? 1 : 0} onPointerEnter={() => setHover({ season: year, index })}/>))}
        {shown && <circle cx={x(dayOfYear(shown.windowStart) + data.windowDays / 2)} cy={y(shown.ndvi)} r="5" fill="none" stroke="#dce7ed" strokeWidth="2"/>}
      </svg>
      <div className="chart-reading" aria-live="polite">{shown ? <>{hover!.season} · {releaseDate(shown.windowStart)} <strong>NDVI {number(shown.ndvi, 2)}</strong> · {number(shown.validFraction * 100, 0)}% clear · {shown.nObservations} scene{shown.nObservations === 1 ? '' : 's'}</> : <span><span className="sat-key"><i className="current"/>{current}</span><span className="sat-key"><i/>earlier seasons</span> Gaps are windows without a sufficiently clear scene, not low vegetation.</span>}</div>
    </section>
    <section className="map-card sat-card" aria-label="Observation coverage">
      <div className="section-heading"><div><span className="eyebrow">{name} · coverage</span><h2>How much of each window was observed</h2></div></div>
      <svg viewBox={`0 0 ${WIDTH} ${years.length * 26 + 30}`} role="img" aria-label="Clear-pixel fraction by season and window" className="sat-chart">
        {years.map((year, row) => <g key={year}><text x={LEFT - 8} y={row * 26 + 18} textAnchor="end" className="axis">{year}</text>{windows.map((w, col) => { const o = lookup.get(`${year}-${w}`); return <rect key={w} x={LEFT + col * cell + 1} y={row * 26 + 4} width={Math.max(1, cell - 2)} height="20" rx="3" fill={o ? 'var(--teal)' : 'none'} fillOpacity={o ? 0.15 + 0.85 * o.validFraction : 0} stroke={o ? 'none' : 'var(--radar-grid)'} strokeDasharray={o ? undefined : '2 3'}><title>{o ? `${year} ${w}: ${number(o.validFraction * 100, 0)}% clear` : `${year} ${w}: no clear scene`}</title></rect>; })}</g>)}
      </svg>
      <div className="coverage-note"><span>Darker cells have more clear pixels; dashed cells have no usable scene.</span></div>
    </section>
    <div className="notice"><p><strong>Experimental.</strong> Values are mean NDVI over {data.cropMask ? `the ${data.cropMask} crop mask within` : 'the whole of'} each region{data.cropMask ? '' : ', so they describe all vegetation and land cover, not wheat specifically'}. Cloud, shadow and snow pixels are excluded; a window appears only when enough clear pixels remain. Crop classification and yield estimates are not yet published. <Link href="/methodology/#satellite">Methodology</Link></p></div>
    <footer className="site-footer"><span><Database size={14}/> {data.source} · Vintage {data.vintage} · Generated {releaseDate(data.generatedAt)}</span><Link href="/methodology/#satellite">Sources & methodology</Link></footer>
  </main></>;
}
