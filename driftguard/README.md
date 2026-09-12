🌀 DriftGuard: The Open-Source Control Loop Framework for Long-Running Coding Agents

DriftGuard is an open-source, infrastructure-first orchestration framework built to eliminate multi-hour autonomous code-generation drift.
Most AI agent frameworks rely on localized, mono-loop prompt engineering. When an agent runs continuously for hours across a massive repository, it inevitably veers off-course. It starts introducing silent regressions, breaking architectural boundaries, violating design patterns, or creating circular compiler errors.
DriftGuard treats autonomous agents as untrusted actors operating inside a strict Kubernetes-style Observer-Corrector control loop. It isolates code generation from modular, deterministic validation gates across seven systemic layers.

🛠️ The 7 Layers of Drift Mitigation
DriftGuard is architected to isolate and remediate code and structural decay across seven distinct planes:
┌────────────────────────────────────────────────────────┐
│ 1. BUSINESS LAYER        (PRD & Feature Compliance)    │
├────────────────────────────────────────────────────────┤
│ 2. SYSTEM LAYER          (Token Budgets, Latency, Sec) │
├────────────────────────────────────────────────────────┤
│ 3. ARCHITECTURE LAYER    (Service & Import Boundaries) │
├────────────────────────────────────────────────────────┤
│ 4. DESIGN LAYER          (ASTs, Clean Code, SOLID)     │
├────────────────────────────────────────────────────────┤
│ 5. IMPLEMENTATION LAYER  (Compilers, Local Test Suites)│ ◄── [Phase 1 Core]
├────────────────────────────────────────────────────────┤
│ 6. DEPLOYMENT LAYER      (Staging Envs, CI/CD, IaC)    │
├────────────────────────────────────────────────────────┤
│ 7. MAINTENANCE LAYER     (Dependency Lockfiles, Debt)  │
└────────────────────────────────────────────────────────┘



🏗️ Core Architectural Paradigm
Instead of building a massive, monolithic agent loop, DriftGuard uses a decoupled Observer-Corrector loop driven by an append-only event bus.
Observe: Inspects the workspace workspace state (Codebase changes, ASTs, compilation trees).
Evaluate: Measures the delta between the observed reality and the baseline specifications.
Correct: Intercepts failures, intercepts state mutation writes, and emits explicit context payloads back to the LLM to steer it back on track.
      ┌──────────────────────────────────────────────────┐
       │                                                  │
       ▼                                                  │
┌──────────────┐       ┌──────────────┐       ┌───────────┴──┐
│  1. OBSERVE  │ ───>  │  2. EVALUATE │ ───>  │  3. CORRECT  │
└──────────────┘       └──────────────┘       └──────────────┘
(State Snapshot)        (Drift Matrix)        (Remediation Event)



🗺️ Project Status & RFC Roadmap
We are designing DriftGuard entirely in the open prior to locking down the runtime implementation. We believe great infrastructure is designed before it is wrapped.
Our core specification engine is detailed across our live Requests for Comments (RFCs):
RFC-0001: Core Architecture & Data Contracts — Defines the unified DriftGuard type systems and the base loop lifecycle.
RFC-0002: Core Orchestrator Event Bus — Defines the append-only state transaction ledger, FSM lifecycle, and crash-fault recovery loops.
RFC-0003: Ephemeral Sandbox Environments — Details the isolated container runtime wrapper that securely houses the agent workspace and execution tasks.
RFC-0004: Layer 5 (Implementation Guard) Spec — Outlines our first concrete validation gate checking compilation status, error log compaction, and unit-test regression loops.
RFC-0005: Layer 4 (Design Drift Validation) [Upcoming] — Using Abstract Syntax Tree (AST) mapping to block structural code-smells and modular decay.

🤝 Join Us as a Co-Architect (How to Contribute)
We are actively seeking systems engineers, software architects, AI infrastructure builders, and SREs to help build the foundational engine. Because DriftGuard is built on a highly modular layer design, you don't need to understand the whole machine to build a crucial part of it.
How to get involved right now:
Tear Apart the Specifications: Go into the /rfcs directory, read our proposed interface types, and open issues or pull requests proposing improvements, optimization vectors, or edge-case coverage.
Claim a Layer: Want to map out how the Design Drift Guard parses ASTs, or how the Deployment Drift Guard should parse ephemeral Kubernetes or Docker-compose error traces? Propose RFC-0005 or RFC-0006.
Join the System Discussion: Join our core architectural debates on GitHub Discussions regarding parallel vs. sequential middleware evaluation and context-window state pruning strategies.

📜 License
DriftGuard is completely open-source and released under the MIT License.
