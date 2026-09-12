# RFC-001: Orchestration Engine Architecture for AI-SDLC Platform

**Status:** DRAFT
**Author:** AI Collaborator & Balaji Balu
**Date:** September 2026

## 0. Related Documents

This RFC does not stand alone — it must be read alongside:

- **[TECHNICAL-PAPER.md](../TECHNICAL-PAPER.md)** — defines the platform's 3-layer architecture (Control Plane / Orchestrator / Task Layer), the DriftGuard scope-enforcement system, the Living SuperSpec knowledge graph, and the Chaos Monkey / WAL resilience model.

**Resolved scope:** this RFC's state machine belongs to the **Orchestrator Plane** (TECHNICAL-PAPER.md §1.2). It manages one intent-to-PR workflow at the project level. It does **not** describe the fine-grained Planner → Code Gen → DriftGuard → QA self-correction loop — that loop, and its own 5-attempt retry ceiling, is owned entirely by the **Task Layer** (TECHNICAL-PAPER.md §1.3) and is invisible to the Orchestrator except as a single success/escalation report. See §2.2 and §3 for what that means for the state diagram below.

## 1. Objective & Scope

This Request for Comments (RFC) defines the architectural specifications, state machinery, data schemas, and security boundaries for the core **Orchestration Workflow Engine** within the `ai-sdlc-platform`.

The goal is to move past simple stateless autocomplete assistants and establish an autonomous, agentic system capable of executing full-lifecycle software engineering tasks (specifying, coding, testing, and reviewing) within a highly deterministic and safe framework.

## 2. Core Architecture & System Components

The platform follows a decoupled, message-driven layer stack where the Orchestration Engine acts as the state manager and tool router.

```
+---------------------------------------------+
|             Human/User Layer                |
|       (Intent, Specifications, Approvals)   |
+----------------------+----------------------+
                       |
                       v
+---------------------------------------------+
|   Orchestration Workflow Engine (Orchestrator Plane) |
|       (State Machine, MCP Route Controller) |
+-----------+---------------------+-----------+
            |                     |
            v                     v
+-----------------------+     +-----------------------+
|   Task Layer Dispatch |     |   Tool Runtimes (MCP) |
| (Spec, Critic, PR)    |---->| (Git, Sandbox, AST)   |
+-----------------------+     +-----------------------+
```

*(Agents invoke tools through the MCP Bridge described in §2.1 — the arrow above reflects that dispatched work calls into Tool Runtimes rather than the two being independent siblings of the Orchestration Engine. The Coding Agent and QA Agent formerly shown here now live one level down, inside a Task Layer dispatch — see §2.2.)*

### 2.1 Component Breakdown

- **State Machine Router:** Evaluates transition criteria and safeguards progression across execution phases, at the Orchestrator Plane's project-level granularity.
- **Model Context Protocol (MCP) Bridge:** Standardizes the interface layer enabling LLMs to safely invoke system commands, read files, and write software patches.
- **Secure Environment Sandbox:** Ephemeral, containerized micro-runtimes (Docker/MicroVMs) isolated from the orchestration host. Provisioned per Task Layer dispatch, per TECHNICAL-PAPER.md §1.1.

### 2.2 Mapping to the 3-Layer Architecture (Resolved)

This workflow is the **Orchestrator Plane's** macro state machine (TECHNICAL-PAPER.md §1.2):

| RFC-001 concept | 3-layer equivalent |
| --- | --- |
| State Machine Router | Orchestrator Layer (Living SuperSpec / macro state) |
| PLANNING, CRITIC_REVIEW, PR_STAGING | Orchestrator Layer states — evaluated directly by this engine |
| Code generation, DriftGuard scope check, sandbox test, self-correction retries | **Task Layer**, dispatched as a single opaque unit (TECHNICAL-PAPER.md §1.3). The Orchestrator does not run its own retry loop over these — it waits for one report: success, or escalation after the Task Layer's own 5-attempt ceiling is exhausted. |
| Context budget & downstream API limits (§5.2) | Control Plane (FinOps & Hard Guardrails) |

**Consequence for §3:** the previous draft of this RFC modeled `CODING` and `SANDBOX_TEST` as separate Orchestrator states with their own "revise & retry, max 5" loop. That duplicated the Task Layer's internal loop at the wrong layer. They are now collapsed into a single `TASK_DISPATCH` state — see below.

## 3. Workflow State Machine Specification

The workflow engine enforces a strict **Directed Acyclic Graph (DAG)** of states at the Orchestrator Plane. State persistence is maintained out-of-memory to guarantee resumption capabilities. Everything inside `TASK_DISPATCH` (code generation, the DriftGuard scope check, sandbox execution, and the self-correction loop) is Task Layer internals — see TECHNICAL-PAPER.md §1.3 and §3 for that diagram; it is intentionally opaque here.

```
[Intent Ingested]
       |
       v
[Planning & Spec] ---------> (Human Checkpoint 1: Spec Sign-off)
       |
       v
[Task Dispatch] <----------------------------------+
  (delegated to Task Layer:                         |
   Code Gen -> DriftGuard -> Sandbox -> QA,          |
   internal retry ceiling = 5, per TECHNICAL-PAPER.md §5) |
       |                                             |
       | success                    escalated        |
       v                                             |
[Agent Architecture Review] ------------------------>[FAILED]
       |                            (critical            |
       | approved                    blocker OR           v
       v                             task escalation) (Orchestrator strategy
[Pull Request Staging]                                 search, then Control
       |                                                Plane HITL gateway —
       v                                                see TECHNICAL-PAPER.md §5)
(Human Checkpoint 2: Final PR Merge)
```

A Critic Review blocker re-dispatches to `TASK_DISPATCH` with the review findings attached as new context, rather than looping inside a state this RFC no longer models directly.

### 3.1 State Transitions and Exit Criteria

| State | Entry Criteria | Main Operations / Agent | Exit Criteria |
| --- | --- | --- | --- |
| **PLANNING** | User provides `intent.md` via UI/CLI | **Spec Agent:** Analyzes repo context, builds technical `spec.md` and step-by-step `plan.md`. | Complete generation of `spec.md` and manual Human-in-the-Loop (HITL) approval. |
| **TASK_DISPATCH** | Validated `spec.md` present, or a Critic Review blocker routed back here | Delegates to the **Task Layer** (Planner / Code Gen / DriftGuard / QA sub-agents, TECHNICAL-PAPER.md §1.3). The Orchestrator does not manage retries here directly. | Task Layer reports **success** (code + passing tests, DriftGuard-clean), or **escalation** after its internal 5-attempt ceiling is exhausted. |
| **CRITIC_REVIEW** | Task Layer reported success | **Review Agent:** Audits diffs against organizational coding guidelines and security boundaries. | Generation of audit attestation without critical blocker findings, **or** routes back to `TASK_DISPATCH` if a blocker is found. |
| **PR_STAGING** | Review approved | **Orchestration Core:** Formulates a pull request with an automated markdown execution summary. | Code pushed to remote branch, awaiting peer engineer final code review. |
| **FAILED** | Task Layer escalation received | **Orchestrator:** attempts a bounded alternative-strategy search (TECHNICAL-PAPER.md §5) before opening a Control Plane HITL gateway. | Resolved via alternative strategy (returns to `TASK_DISPATCH`), or a human decision at the HITL gateway. |

**Still open:** a timeout/reminder policy on the two HITL checkpoints is not yet specified. The exact bound on the Orchestrator's "alternative-strategy search" (how many strategies, what counts as exhausted) is also undefined — see TECHNICAL-PAPER.md §5, which has the same gap.

## 4. Technical Data Schemas

To ensure cross-agent compatibility and predictable outputs, all workflow payloads are structured using rigid JSON contracts.

### 4.1 State Payload Schema (`state_payload.json`)

```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WorkflowStatePayload",
  "type": "object",
  "required": ["workflow_id", "repository", "current_state", "context"],
  "properties": {
    "workflow_id": { "type": "string", "format": "uuid" },
    "repository": {
      "type": "object",
      "required": ["owner", "name", "target_branch"],
      "properties": {
        "owner": { "type": "string" },
        "name": { "type": "string" },
        "target_branch": { "type": "string" }
      }
    },
    "current_state": {
      "type": "string",
      "enum": ["PLANNING", "TASK_DISPATCH", "CRITIC_REVIEW", "PR_STAGING", "FAILED"]
    },
    "task_layer_report": {
      "type": "object",
      "description": "Populated when current_state transitions out of TASK_DISPATCH. Retry accounting is internal to the Task Layer (TECHNICAL-PAPER.md §5); the Orchestrator only sees the outcome.",
      "properties": {
        "outcome": { "type": "string", "enum": ["success", "escalated"] },
        "attempts_used": { "type": "integer", "minimum": 0 },
        "escalation_reason": { "type": "string" }
      }
    },
    "context": {
      "type": "object",
      "required": ["intent_path"],
      "properties": {
        "intent_path": { "type": "string" },
        "spec_path": { "type": "string" },
        "plan_path": { "type": "string" },
        "affected_files": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

*(Changed: `retry_count`/`max_retries` removed from the Orchestrator's payload — that accounting is now internal to the Task Layer, per §2.2. The Orchestrator instead reads a `task_layer_report` summarizing the outcome.)*

### 4.2 MCP Tool Invocation Schema (`mcp_tool_call.json`)

```
{
  "mcp_version": "1.0.0",
  "method": "tools/call",
  "params": {
    "name": "run_sandbox_command",
    "arguments": {
      "sandbox_id": "sb_uuid_9921",
      "command": "pytest tests/test_core_orchestration.py",
      "timeout_seconds": 30
    }
  }
}
```

## 5. Security Boundaries & Guardrails

1. **Isolation of Agent Execution:** Agents are structurally barred from executing shell commands on the primary orchestration host. All runtime compilations and package adjustments happen in network-isolated sandboxes.
2. **Context Budgets:** Prompts automatically calculate repository line limits via an AST trimmer before dispatch. Token window consumption metrics terminate any sub-agent that triggers more than `N` downstream API dependencies. **[NEEDS RESOLUTION: `N` is currently a placeholder.]**
3. **Immutability of Main Branches:** The orchestration engine lacks direct write-access authorization to `main` or `master` branches. It can only branch out dynamically (`feature/ai-*`) and file non-destructive pull requests.
4. **Scope Enforcement (DriftGuard):** This lives entirely inside the Task Layer's `TASK_DISPATCH` execution, per **TECHNICAL-PAPER.md §3.1** — the Orchestrator does not run this check itself, it only receives the outcome:
   - The Task Layer generates an isolated git-diff against the base commit for the dispatched task.
   - It parses modified files via AST to confirm every change falls within the file set declared in `context.affected_files`.
   - On violation, the Task Layer rejects the transaction, rolls back unauthorized files, and retries internally (within its own 5-attempt ceiling) rather than surfacing each rejection to the Orchestrator. Only final success or exhausted-retry escalation reaches this RFC's state machine, via `task_layer_report`.

## 6. Implementation Strategy & Next Steps

- **Phase 1:** Code basic state wrapper and schema constraints as a foundational framework utility under `src/orchestrator/state.py`.
- **Phase 2:** Integrate Python `asyncio` or a structural state library (e.g., `LangGraph`) to parse states asynchronously.
- **Phase 3:** Standardize tool execution via a native MCP Server module.
- **Phase 4:** Implement `TASK_DISPATCH` as a call into the Task Layer's own runtime (TECHNICAL-PAPER.md §1.3), not as inline states in the Orchestrator's own state machine.
- **Phase 5 (new):** Resolve the two remaining open items: the `N` placeholder in §5.2, and the HITL timeout / alternative-strategy-search bound in §3.1.
