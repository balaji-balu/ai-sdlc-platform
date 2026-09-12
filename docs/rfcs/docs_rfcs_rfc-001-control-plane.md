# RFC-001: Isolated Sandbox Control Plane & Chaos Engine Implementation

## Status
*   **Status:** Proposed
*   **Author:** Architecture Core Team
*   **Created:** 2026-09-12
*   **Target Version:** v1.0.0-alpha

## 1. Abstract & Context
This RFC specifies the operational design of the **Layer 1 Control Plane**. The core objective is providing an entirely isolated runtime for execution tasks, establishing hard budget controls to prevent infinite agent run loops, and engineering an active system failure layer (**Chaos Monkey Engine**) verified by an immutable **Write-Ahead Log (WAL)**.

## 2. Technical Specification

### 2.1 Micro-VM Sandbox & Container Orchestration
To prevent arbitrary code execution attacks and environmental contamination, all Task Layer assignments must run in isolated sandboxes.
*   **Runtime:** Ephemeral micro-VM micro-containers (e.g., Firecracker or gVisor-backed runtimes) managed via an internal API.
*   **Lifecycle:**
    1. Orchestrator requests runtime environment.
    2. Control Plane provisions container with standard tools (`git`, `node`, `python`).
    3. Codebase snapshot is mounted read-write; global root filesystems are mounted read-only.
    4. Container is destroyed immediately upon task termination or failure escalation.

### 2.2 FinOps & Hard Ceilings
The Control Plane intercepts all LLM API bindings through an outbound proxy layer to enforce real-time budgeting:
*   **Tokens/Dollar Caps:** Tracks aggregate context window usage per Project ID. If a project crosses its configured threshold (e.g., $50.00/run), the proxy returns an HTTP `402 Payment Required` equivalent to halt execution.
*   **Iteration Guardrails:** Maximum execution duration is hard-capped at 1,800 seconds (30 minutes) per individual sub-task assignment.

### 2.3 Write-Ahead Log (WAL) Database Schema (PostgreSQL)
To survive unexpected agent runner terminations, all Orchestrator states are serialized into a highly durable transaction log.

```sql
CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'failed', 'halted');

CREATE TABLE orchestration_wal (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    target_ddd_node VARCHAR(255) NOT NULL,
    input_subgraph_snapshot JSONB NOT NULL,
    current_status task_status DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wal_idempotency ON orchestration_wal(idempotency_key);
```

### 2.4 Chaos Monkey Failure Injection Engine
A background daemon, `chaos-monkeyd`, will dynamically perturb system layers by running asynchronous threads that perform target interruptions:
*   **`drop_llm_connection()`**: Manipulates local proxy routing tables to inject random `HTTP 429 / 502` status codes with a 5% probability on active agent streams.
*   **`terminate_runner_pod()`**: Queries the internal runtime API and violently issues a `SIGKILL` to 2% of active containers during heavy compute (e.g., compilation tasks).

---

## 3. Implementation Drawbacks & Alternatives
*   *Alternative:* Using standard Docker sockets directly on the host machine. *Rejected* due to lack of strict file system segregation and multi-tenant security vulnerabilities.

## 4. Open Questions
1. Should the `chaos-monkeyd` daemon be active during production deployments, or strictly restricted to continuous staging simulations?
