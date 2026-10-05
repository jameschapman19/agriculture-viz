import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SatelliteExport } from './types';

/** Build-time read of the published global file; null until a validated extraction is published. */
export async function loadGlobal(): Promise<SatelliteExport | null> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'public/data/satellite-global.json'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
