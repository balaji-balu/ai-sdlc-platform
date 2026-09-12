#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from '../src/cli/engine.ts';

const args = process.argv.slice(2);
const configIndex = args.indexOf('--config');
const configPath = configIndex >= 0 ? args[configIndex + 1] : './monkey.yaml';
const apply = args.includes('--apply');

if (!configPath || !existsSync(resolve(configPath))) {
  console.error(`Config not found: ${configPath}`);
  process.exit(2);
}

try {
  const results = run(configPath, apply);
  console.log(JSON.stringify({
    engine: 'drift-monkey',
    mode: apply ? 'apply' : 'dry-run',
    changed: results.filter((result) => result.changed).length,
    files: results,
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
