import type { ChaosInjector } from '../types/chaos.js';
export class DriftMonkey implements ChaosInjector {
  private readonly random: () => number;
  constructor(random: () => number = Math.random) { this.random = random; }
  injectImplementationChaos(filePath: string, sourceCode: string, intensity: number): string { if (this.random() > intensity) return sourceCode; const index = sourceCode.lastIndexOf(';'); return index < 0 ? `${sourceCode}\n// DRIFT_MONKEY_SYNTAX_ERROR ${filePath}` : `${sourceCode.slice(0, index)}${sourceCode.slice(index + 1)}\n// DRIFT_MONKEY_SYNTAX_ERROR`; }
  injectDesignChaos(_filePath: string, sourceCode: string, intensity: number): string { return this.random() > intensity ? sourceCode : `${sourceCode}\nfunction _driftMonkeyBloat(x: unknown) { if (x) { if (Array.isArray(x)) { for (const y of x) { while (y && false) console.log(y); } } } }\n`; }
  injectMaintenanceChaos(_manifestPath: string, manifestContent: string, intensity: number): string { if (this.random() > intensity) return manifestContent; const config = JSON.parse(manifestContent); const deps = config.dependencies ?? {}; const name = Object.keys(deps)[0]; if (name) deps[name] = `^${deps[name]}-alpha.rc.0`; return JSON.stringify(config, null, 2); }
}
