import type { CorrectionPlan, DriftGuard, DriftReport, StateSnapshot } from '../types/guard.js';
import type { Actor, EventType, OrchestratorEvent } from '../types/orchestrator.js';
import { Ledger } from './Ledger.js';

export type OrchestratorState = 'INIT_TASK' | 'GENERATE_CODE' | 'EMIT_SNAPSHOT' | 'EVALUATE_DRIFT' | 'CORRECT' | 'COMPLETE' | 'HALTED';
export interface ControlLoopResult { attempts: number; snapshot: StateSnapshot; report: DriftReport; correctionPlan?: CorrectionPlan; }
export class Orchestrator {
  state: OrchestratorState = 'INIT_TASK'; private sequence = 0; readonly ledger: Ledger;
  private readonly correlationId: string;
  constructor(correlationId: string = crypto.randomUUID(), ledger = new Ledger()) { this.correlationId = correlationId; this.ledger = ledger; }
  async emit(eventType: EventType, actor: Actor, payload: Record<string, unknown>): Promise<OrchestratorEvent> {
    const event: OrchestratorEvent = { eventId: crypto.randomUUID(), correlationId: this.correlationId, sequenceNumber: ++this.sequence, timestamp: Date.now(), eventType, actor, payload };
    await this.ledger.append(event); return event;
  }
  async validate(guard: DriftGuard, workspacePath: string, context: Record<string, unknown>, baseline: unknown): Promise<{ snapshot: StateSnapshot; report: DriftReport; correctionPlan?: CorrectionPlan }> {
    this.state = 'EMIT_SNAPSHOT'; const snapshot = await guard.observe(workspacePath, context); await this.emit('SNAPSHOT_GENERATED', 'DRIFT_GUARD', { snapshot });
    this.state = 'EVALUATE_DRIFT'; const report = await guard.evaluate(snapshot, baseline);
    if (report.hasDrifted) {
      this.state = 'CORRECT';
      await this.emit('DRIFT_DETECTED', 'DRIFT_GUARD', { report });
      const correctionPlan = await guard.correct(report);
      await this.emit('CORRECTION_REQUIRED', 'DRIFT_GUARD', { report, correctionPlan });
      return { snapshot, report, correctionPlan };
    }
    this.state = 'COMPLETE'; await this.emit('DRIFT_CLEARED', 'DRIFT_GUARD', { report });
    return { snapshot, report };
  }

  async runControlLoop(
    guard: DriftGuard,
    workspacePath: string,
    baseline: unknown,
    generate: (attempt: number, previousCorrection?: CorrectionPlan) => Promise<Record<string, unknown>>,
    maxAttempts = 4,
  ): Promise<ControlLoopResult> {
    await this.emit('TASK_STARTED', 'SYSTEM_REPLAY', { workspacePath, maxAttempts });
    let previousCorrection: CorrectionPlan | undefined;
    let lastResult: ControlLoopResult | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.state = 'GENERATE_CODE';
      const mutation = await generate(attempt, previousCorrection);
      await this.emit('CODE_MUTATED', 'LLM_AGENT', { attempt, mutation });
      const result = await this.validate(guard, workspacePath, { attempt, previousCorrection }, baseline);
      lastResult = { attempts: attempt, ...result };
      if (!result.report.hasDrifted) return lastResult;
      previousCorrection = result.correctionPlan;
      if (result.report.severity === 'critical') {
        this.state = 'HALTED';
        await this.emit('EXECUTION_HALTED', 'DRIFT_GUARD', { attempt, reason: result.correctionPlan?.instructionSet ?? 'critical drift' });
        return lastResult;
      }
    }

    this.state = 'HALTED';
    await this.emit('EXECUTION_HALTED', 'DRIFT_GUARD', { attempts: maxAttempts, reason: 'maximum correction attempts exhausted' });
    return lastResult!;
  }
}
