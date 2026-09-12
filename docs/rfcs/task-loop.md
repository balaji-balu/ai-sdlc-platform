# RFC-003: Ephemeral Task Loop & DriftGuard Engine Specification

## Status
*   **Status:** Proposed
*   **Author:** Architecture Core Team
*   **Created:** 2026-09-12
*   **Dependencies:** RFC-001, RFC-002

## 1. Abstract & Context
This RFC specifies the lower-level execution harness inside **Layer 3 (The Task Layer)**. It covers the micro-loop interface execution boundary (**Planner → Code Gen → QA Loop**) and outlines the mechanics of **Task-Level DriftGuard** validation to reject rogue file mutations.

## 2. Technical Specification

### 2.1 The Execution Micro-Loop Workflows
Every atomized task assigned by the Layer 2 Orchestrator passes sequentially through a fast-cycling self-correction state pipeline:
1. **Planner State:** Formulates execution targets using local codebase context trees.
2. **Code Gen State:** Executes localized diff writing via strict structural file mutators.
3. **QA Evaluator State:** Spawns test runners (Jest, PyTest, etc.) and analyzes output strings.

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ Planner Agent │ ────► │ CodeGen Agent │ ────► │   QA Engine   │
└───────────────┘       └───────┬───────┘       └───────┬───────┘
                                ▲                       │ (If compilation fails)
                                └───────────────────────┘ (Max 5 attempts)
```

### 2.2 Task-Level DriftGuard (Git-Diff Enforcer)
Before the Task Layer reports a successful mutation event back to the orchestrator, a strict validation step checks for unauthorized changes:

```python
import git
import ast

def verify_task_drift(repo_path: str, allowed_files: list) -> dict:
    """
    Enforces strict file modification fences over the agent runtime sandbox.
    """
    repo = git.Repo(repo_path)
    changed_files = [item.a_path for item in repo.index.diff(None)]
    
    # Check for file path violations
    for file in changed_files:
        if file not in allowed_files:
            return {
                "status": "rejected",
                "reason": f"Scope Drift: Modification to unallocated file '{file}' forbidden."
            }
            
    return {"status": "approved"}
```

### 2.3 Automated Termination Limits
If the QA process encounters continuous failures, it is prohibited from entering an infinite billing cycle.
* **Max Retries:** 5 attempts.
* **Escalation Protocol:** The sandbox is frozen, logs are captured, and a `HALT` signal payload detailing the compiler trace stack is returned upstream to the Layer 2 Orchestrator.

---

## 3. Implementation Drawbacks & Alternatives
*   *Alternative:* Relying solely on prompt instructions to restrict file access boundaries. *Rejected* because models frequently fail soft context gates when debugging deep code trees.

## 4. Open Questions
1. How should binary dependencies or localized framework modifications be flagged within drift checks?
