export type DriftLayer = 'business' | 'system' | 'architecture' | 'design' | 'implementation' | 'deployment' | 'maintenance';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type CorrectionStrategy = 'rollback' | 'refactor' | 'halt' | 'override';

export interface StateSnapshot { timestamp: number; layer: DriftLayer; payload: Record<string, unknown>; }
export interface DriftReport { hasDrifted: boolean; severity: Severity; varianceDescription: string; telemetryDelta: unknown; }
export interface CorrectionPlan { strategy: CorrectionStrategy; instructionSet: string; }
export interface DriftGuard {
  readonly id: string;
  readonly targetLayer: DriftLayer;
  observe(workspacePath: string, contextState: Record<string, unknown>): Promise<StateSnapshot>;
  evaluate(current: StateSnapshot, baseline: unknown): Promise<DriftReport>;
  correct(report: DriftReport): Promise<CorrectionPlan>;
}
