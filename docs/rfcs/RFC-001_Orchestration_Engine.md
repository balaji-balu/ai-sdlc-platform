# RFC-001: Orchestration Engine Architecture for AI-SDLC Platform
**Status:** DRAFT  
**Author:** AI Collaborator & Balaji Balu  
**Date:** September 2026  

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
       |        Orchestration Workflow Engine        |
       |       (State Machine, MCP Route Controller) |
       +-----------+---------------------+-----------+
                   |                     |
                   v                     v
       +-----------------------+     +-----------------------+
       |   Multi-Agent Pool    |     |   Tool Runtimes (MCP) |
       | (Spec, Code, QA, SRE) |     | (Git, Sandbox, AST)   |
       +-----------------------+     +-----------------------+
```

### 2.1 Component Breakdown
* **State Machine Router:** Evaluates transition criteria and safeguards progression across execution phases.
* **Model Context Protocol (MCP) Bridge:** Standardizes the interface layer enabling LLMs to safely invoke system commands, read files, and write software patches.
* **Secure Environment Sandbox:** Ephemeral, containerized micro-runtimes (Docker/MicroVMs) isolated from the orchestration host.


## 3. Workflow State Machine Specification

The workflow engine enforces a strict **Directed Acyclic Graph (DAG)** of states. State persistence is maintained out-of-memory to guarantee resumption capabilities.

```
 [Intent Ingested] 
        |
        v
 [Planning & Spec] ---------> (Human Checkpoint 1: Spec Sign-off)
        |
        v
 [Code Generation] 
        |
        v
 [Sandbox Execution] <----+
        |                 |
        v                 | [Compile/Test Error Loop] (Max 3 Retries)
 [Automated Testing] -----+
        |
        v
 [Agent Architecture Review]
        |
        v
 [Pull Request Staging] ----> (Human Checkpoint 2: Final PR Merge)
```

### 3.1 State Transitions and Exit Criteria

| State | Entry Criteria | Main Operations / Agent | Exit Criteria |
| :--- | :--- | :--- | :--- |
| **PLANNING** | User provides `intent.md` via UI/CLI | **Spec Agent:** Analyzes repo context, builds technical `spec.md` and step-by-step `plan.md`. | Complete generation of `spec.md` and manual Human-in-the-Loop (HITL) approval. |
| **CODING** | Validated `spec.md` present | **Coding Agent:** Performs AST lookup, reads target classes, and modifies/creates code patches. | Successful injection of changes into local workspace; code syntactically sound. |
| **SANDBOX_TEST**| Code patches applied | **QA Agent:** Provisions ephemeral sandbox container, compiles code, runs test suites, catches `stderr`. | Zero compilation errors. Execution of tests passes completely or Max Retries (3) reached. |
| **CRITIC_REVIEW**| Tests pass in sandbox | **Review Agent:** Audits diffs against organizational coding guidelines and security boundaries. | Generation of audit attestation without critical blocker findings. |
| **PR_STAGING** | Review approved | **Orchestration Core:** Formulates a pull request with an automated markdown execution summary. | Code pushed to remote branch, awaiting peer engineer final code review. |

## 4. Technical Data Schemas

To ensure cross-agent compatibility and predictable outputs, all workflow payloads are structured using rigid JSON contracts.

### 4.1 State Payload Schema (`state_payload.json`)
```json
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
      "enum": ["PLANNING", "CODING", "SANDBOX_TEST", "CRITIC_REVIEW", "PR_STAGING", "FAILED"]
    },
    "retry_count": { "type": "integer", "minimum": 0, "maximum": 3 },
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

### 4.2 MCP Tool Invocation Schema (`mcp_tool_call.json`)
```json
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
2. **Context Budgets:** Prompts automatically calculate repository line limits via an AST trimmer before dispatch. Token window consumption metrics terminate any sub-agent that triggers more than $N$ downstream API dependencies.
3. **Immutability of Main Branches:** The orchestration engine lacks direct write-access authorization to `main` or `master` branches. It can only branch out dynamically (`feature/ai-*`) and file non-destructive pull requests.

## 6. Implementation Strategy & Next Steps

* **Phase 1:** Code basic state wrapper and schema constraints as a foundational framework utility under `src/orchestrator/state.py`.
* **Phase 2:** Integrate Python `asyncio` or a structural state library (e.g., `LangGraph`) to parse states asynchronously.
* **Phase 3:** Standardize tool execution via a native MCP Server module.