RFC-0002: The Core Orchestrator Event Bus and State Machine
Status: Proposed
Author: [Your Name/GitHub Handle]
Created: 2026-09-12
Dependencies: RFC-0001 (Core Architecture)

1. Executive Summary
Long-running AI agents require a deterministic state tracking engine to survive multi-hour runtime cycles. If an agent crashes at step 47, it must not restart from scratch or lose its historical execution context.
This RFC proposes the design for the Core Orchestrator. It utilizes an Event-Driven State Machine that logs every mutation, observation, and correction event to an append-only transaction ledger. This allows the system to support deterministic execution replay, fault-tolerant resume capabilities, and structured event routing to the 7 layers of DriftGuards.

2. System State Machine & Lifecycle Topology
The orchestrator manages a strict directed acyclic graph (DAG) of execution states. It prevents the model from advancing code mutations until the validation layers approve the state transition.
      ┌─────────────────┐
       │   INIT_TASK     │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │  GENERATE_CODE  │ ◄─────────────────────────┐
       └────────┬────────┘                           │
                │                                    │
                ▼                                    │
       ┌─────────────────┐                           │
       │  EMIT_SNAPSHOT  │                           │
       └────────┬────────┘                           │
                │                                    │
                ▼                                    │
       ┌─────────────────┐      Drift Detected       │
       │ EVALUATE_DRIFT  ├───────────────────────────┼─ (Correction Event)
       └────────┬────────┘                           │
                │                                    │
                │ No Drift                           │
                ▼                                    │
       ┌─────────────────┐                           │
       │  COMMIT_STATE   │                           │
       └────────┬────────┘                           │
                │                                    │
                ▼                                    │
       ┌─────────────────┐     Validation Fail       │
       │  RUN_COMPILER   ├───────────────────────────┘
       └────────┬────────┘
                │ Validation Pass
                ▼
       ┌─────────────────┐
       │   TASK_COMPLETE │
       └─────────────────┘



3. Data Architecture & Event Schemas
The orchestration engine communicates via an asymmetric event broker. Every component of the system publishes to, and reads from, a structured Telemetry Ledger.
The Event Envelope Schema
export interface OrchestratorEvent {
  eventId: string;        // UUIDv4
  correlationId: string;  // Tracks a single task session across hours
  sequenceNumber: number; // Monotonically increasing index for replay
  timestamp: number;      // Unix epoch MS
  eventType: 
    | 'TASK_STARTED'
    | 'CODE_MUTATED'
    | 'SNAPSHOT_GENERATED'
    | 'DRIFT_DETECTED'
    | 'DRIFT_CLEARED'
    | 'EXECUTION_HALTED';
  actor: 'LLM_AGENT' | 'DRIFT_GUARD' | 'SYSTEM_REPLAY';
  payload: Record<string, any>;
}


State Transaction Ledger
To achieve resilience, the orchestrator acts as a finite state machine backed by an append-only JSONL log on disk (or SQLite for local lightness).
The Crash Recovery Contract: Upon crash or network timeout, the orchestrator boots up, reads the transaction ledger from line 1 to the end, hydrates the precise memory state at the last COMMIT_STATE event, and resumes the LLM context seamlessly.

4. Guardrail Interception & Middleware Pipeline
Instead of hardcoding the 7 drift layers into the loop, the Core Orchestrator treats them as ordered lifecycle middleware. When code is generated, it triggers an intercept chain:
[Agent Output] ──> (Layer 5: Implementation) ──> (Layer 4: Design) ──> (Layer 3: Architecture) ──> [File System Write]


If any layer emits a DriftReport with a severity of high or critical, the middleware chain short-circuits, blocks the code write, and routes a CORRECTION_REQUIRED event back to the agent with the precise error stack.

5. Architectural Tensions & Open Questions
We invite contributors to debate and refine the following infrastructure challenges:
Asynchronous Guardrail Evaluation: Should all 7 layers evaluate the codebase concurrently (parallel execution) or sequentially? Sequential is cheaper on tokens but slower; parallel requires complex concurrency handling.
Persistence Provider: For Phase 1, should we stick to pure local file-system tracking (.drift/ledger.jsonl) or implement an embedded abstraction layer like SQLite?
Context Window Pruning Policy: When a drift event forces a code generation loop to repeat 5 times, how does the orchestrator prune the failed iterations out of the LLM prompt history to keep context clean?

6. Next Implementation Steps
Propose the schema configuration file format (e.g., drift.yaml) for setting layer sensitivity thresholds.
Implement the core event loop runtime engine.
