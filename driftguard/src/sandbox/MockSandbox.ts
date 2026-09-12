import type { ExecutionResult, SandboxProvider, SandboxVolumeInfo } from '../types/sandbox.js';
export class MockSandbox implements SandboxProvider {
  readonly id = 'mock-sandbox'; readonly type = 'local-mock' as const; private files = new Map<string, string>(); private ready = false;
  async initialize(_volumes: SandboxVolumeInfo[]): Promise<void> { this.ready = true; }
  async writeFile(path: string, content: string): Promise<void> { if (!this.ready) throw new Error('sandbox not initialized'); this.files.set(path, content); }
  async readFile(path: string): Promise<string> { return this.files.get(path) ?? ''; }
  async executeCommand(command: string, timeoutMs: number): Promise<ExecutionResult> {
    const source = await this.readFile('src/generated.ts'); const broken = source.includes('DRIFT_MONKEY_SYNTAX_ERROR'); const fail = broken && (command.includes('lint') || command.includes('build'));
    return { exitCode: fail ? 1 : 0, stdout: fail ? '' : `${command}: ok`, stderr: fail ? 'unexpected token in src/generated.ts' : '', durationMs: Math.min(2, timeoutMs), mutatedFiles: [] };
  }
  async destroy(): Promise<void> { this.files.clear(); this.ready = false; }
}
