import type { DriftGuard, CorrectionPlan, DriftReport, StateSnapshot } from '../types/guard.js';
import type { SandboxProvider } from '../types/sandbox.js';
export class ImplementationGuard implements DriftGuard {
  readonly id = 'guard-layer5-implementation'; readonly targetLayer = 'implementation' as const; private failures = 0;
  private readonly sandbox: SandboxProvider;
  constructor(sandbox: SandboxProvider) { this.sandbox = sandbox; }
  async observe(workspacePath: string, contextState: Record<string, unknown>): Promise<StateSnapshot> {
    const lint = await this.sandbox.executeCommand('npm run lint', 30_000); const build = await this.sandbox.executeCommand('npm run build', 60_000); const test = await this.sandbox.executeCommand('npm run test', 120_000);
    return { timestamp: Date.now(), layer: this.targetLayer, payload: { workspacePath, attempt: contextState.attempt, lint, build, test } };
  }
  async evaluate(snapshot: StateSnapshot): Promise<DriftReport> {
    const { lint, build, test } = snapshot.payload as any;
    if (build.exitCode || lint.exitCode || test.exitCode) { this.failures++; return { hasDrifted: true, severity: this.failures >= 4 ? 'critical' : 'medium', varianceDescription: 'Implementation validation failed.', telemetryDelta: { lint, build, test, failures: this.failures } }; }
    this.failures = 0; return { hasDrifted: false, severity: 'low', varianceDescription: 'Clean implementation state.', telemetryDelta: null };
  }
  async correct(report: DriftReport): Promise<CorrectionPlan> { return report.severity === 'critical' ? { strategy: 'rollback', instructionSet: 'Rollback to last known working state.' } : { strategy: 'refactor', instructionSet: `Fix validation errors: ${JSON.stringify(report.telemetryDelta)}` }; }
}
