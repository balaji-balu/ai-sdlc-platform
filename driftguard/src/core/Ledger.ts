import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { OrchestratorEvent } from '../types/orchestrator.js';

export class Ledger {
  constructor(readonly filePath?: string) {}
  readonly events: OrchestratorEvent[] = [];
  async append(event: OrchestratorEvent): Promise<void> {
    this.events.push(event);
    if (this.filePath) { await mkdir(dirname(this.filePath), { recursive: true }); await appendFile(this.filePath, `${JSON.stringify(event)}\n`); }
  }
  async replay(): Promise<OrchestratorEvent[]> {
    if (!this.filePath) return [...this.events];
    const content = await readFile(this.filePath, 'utf8').catch(() => '');
    return content.split('\n').filter(Boolean).map((line) => JSON.parse(line) as OrchestratorEvent);
  }
}
