import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { globSync } from 'node:fs';
import { parse } from 'yaml';
import { injectDesignChaos } from '../mutations/design.ts';
import { injectImplementationChaos } from '../mutations/implementation.ts';
import { injectMaintenanceChaos } from '../mutations/maintenance.ts';

export interface MonkeyConfig {
  root?: string;
  seed?: number;
  dryRun?: boolean;
  loops?: number;
  mutations?: Record<string, { enabled?: boolean; intensity?: number; files?: string[] }>;
}

export interface MutationResult {
  file: string;
  mutation: string;
  changed: boolean;
  dryRun: boolean;
}

export function run(configPath: string, apply = false): MutationResult[] {
  const configFile = resolve(configPath);
  const config = parse(readFileSync(configFile, 'utf8')) as MonkeyConfig;
  const root = resolve(dirname(configFile), config.root ?? '.');
  const dryRun = config.dryRun !== false && !apply;
  const random = seededRandom(config.seed ?? Date.now());
  const results: MutationResult[] = [];
  const loops = Math.max(1, config.loops ?? 1);

  for (let loop = 0; loop < loops; loop++) {
    for (const [mutation, settings] of Object.entries(config.mutations ?? {})) {
      if (settings.enabled === false) continue;
      for (const pattern of settings.files ?? []) {
        for (const file of expand(root, pattern)) {
          const before = readFileSync(file, 'utf8');
          const after = applyMutation(mutation, file, before, settings.intensity ?? 1, random);
          const changed = after !== before;
          if (changed && !dryRun) writeFileSync(file, after, 'utf8');
          results.push({ file, mutation, changed, dryRun });
        }
      }
    }
  }
  return results;
}

function applyMutation(mutation: string, file: string, source: string, intensity: number, random: () => number): string {
  if (mutation === 'implementation' && /\.(ts|tsx|js|jsx)$/.test(file)) return injectImplementationChaos(file, source, intensity, random);
  if (mutation === 'design' && /\.(ts|tsx|js|jsx)$/.test(file)) return injectDesignChaos(file, source, intensity, random);
  if (mutation === 'maintenance' && /package(?:\.lock)?\.json$/.test(file)) return injectMaintenanceChaos(file, source, intensity, random);
  return source;
}

function expand(root: string, pattern: string): string[] {
  const normalized = pattern.replace(/\*\*\/\*\{([^}]+)\}/, '**/*{$1}');
  const matches = globSync(normalized, { cwd: root, withFileTypes: false, nodir: true });
  if (matches.length === 0 && !pattern.includes('*')) {
    const exact = isAbsolute(pattern) ? pattern : join(root, pattern);
    return existsSync(exact) ? [exact] : [];
  }
  return matches.map((match) => resolve(root, match));
}

function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
