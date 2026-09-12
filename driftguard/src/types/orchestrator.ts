export type EventType = 'TASK_STARTED' | 'CODE_MUTATED' | 'SNAPSHOT_GENERATED' | 'DRIFT_DETECTED' | 'CORRECTION_REQUIRED' | 'DRIFT_CLEARED' | 'EXECUTION_HALTED';
export type Actor = 'LLM_AGENT' | 'DRIFT_GUARD' | 'SYSTEM_REPLAY';
export interface OrchestratorEvent {
  eventId: string; correlationId: string; sequenceNumber: number; timestamp: number;
  eventType: EventType; actor: Actor; payload: Record<string, unknown>;
}
