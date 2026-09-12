import { describe, expect, it } from 'vitest';
import { DriftMonkey } from '../../src/chaos/DriftMonkey.js';
import { ImplementationGuard } from '../../src/guards/ImplementationGuard.js';
import { MockSandbox } from '../../src/sandbox/MockSandbox.js';
import { Orchestrator } from '../../src/core/Orchestrator.js';
describe('DriftMonkey integration', () => {
  it('corrupts, detects, corrects, retries, and clears drift', async () => {
    const sandbox = new MockSandbox(); await sandbox.initialize([]); const monkey = new DriftMonkey(() => 0); const guard = new ImplementationGuard(sandbox); const orchestrator = new Orchestrator('chaos-test');
    const result = await orchestrator.runControlLoop(guard, '/workspace', {}, async (attempt, correction) => {
      const source = attempt < 4 ? monkey.injectImplementationChaos('src/generated.ts', 'export const ok = true;', 1) : 'export const ok = true;';
      await sandbox.writeFile('src/generated.ts', source);
      return { path: 'src/generated.ts', attempt, correctionStrategy: correction?.strategy ?? null };
    });
    expect(result.attempts).toBe(4); expect(result.report.hasDrifted).toBe(false); expect(orchestrator.state).toBe('COMPLETE');
    const events = orchestrator.ledger.events.map((e) => e.eventType); expect(events.filter((event) => event === 'DRIFT_DETECTED')).toHaveLength(3); expect(events.filter((event) => event === 'CORRECTION_REQUIRED')).toHaveLength(3); expect(events).toContain('DRIFT_CLEARED');
  });
});
