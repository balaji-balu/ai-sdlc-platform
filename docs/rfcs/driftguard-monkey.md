RFC-0005: The Drift-Monkey Code Chaos Engine Spec
Status: Proposed
Author: [Your Name/GitHub Handle]
Created: 2026-09-12
Dependencies: RFC-0001 (Core Contracts), RFC-0003 (Execution Sandbox)

1. Executive Summary
Traditional chaos engineering utilities (e.g., Netflix Chaos Monkey) fuzz network pipes, infrastructure nodes, and cloud containers. They are blind to source code syntax, Abstract Syntax Trees (ASTs), and logic degradation. AI agents running for long cycles introduce errors by creating invalid abstractions, messy design patterns, and broken lockfiles.
This RFC specifies Drift-Monkey, an open-source source-code fuzzing engine. It programmatically injects multi-layered semantic and structural faults into a target workspace sandbox. This gives framework architects a deterministic rig to test if DriftGuards can detect, intercept, and correct multi-level agent drift.

2. Injection Architecture & Pipeline
Drift-Monkey sits inside the SandboxProvider pipeline (RFC-0003). It intercepts the agent’s file writes and applies Chaos Mutation Strategies before passing the workspace state to the DriftGuard validation layers.
┌──────────────┐     File Write     ┌───────────────┐     Applies Fault     ┌──────────────────┐
│  AI Agent    │ ─────────────────> │ Drift-Monkey  │ ────────────────────> │ Broken Workspace │
└──────────────┘                    └───────────────┘                       └────────┬─────────┘
                                            │                                        │
                                            ├─► Syntax Corruptor                     ▼
                                            ├─► Architecture Bloater        ┌──────────────────┐
                                            └─► Dependency Unpinner         │  DriftGuard Loop │
                                                                            └──────────────────┘



3. Technical Core Specification
The engine exposes a programmatic injector class that hooks directly into the local file system tracking layers.
export interface ChaosProfile {
  targetLayer: 'design' | 'implementation' | 'maintenance' | 'architecture';
  mutationType: string;
  intensity: number; // Scale 0.0 to 1.0 (frequency or severity of chaos)
}

export interface ChaosInjector {
  /** Injects syntactic or layout corruption into raw files */
  injectImplementationChaos(filePath: string, sourceCode: string, intensity: number): string;

  /** Artificially inflates code complexity metrics to trigger design drift */
  injectDesignChaos(filePath: string, sourceCode: string, intensity: number): string;

  /** Modifies package config file properties to trigger environment/maintenance drift */
  injectMaintenanceChaos(manifestPath: string, manifestContent: string): string;
}

export class DriftMonkeyEngine implements ChaosInjector {
  
  /** Injects Implementation Chaos: Drops matching characters randomly */
  injectImplementationChaos(filePath: string, sourceCode: string, intensity: number): string {
    if (Math.random() > intensity) return sourceCode;
    
    // Target common syntax errors: strip a random closing brace or semicolon
    const targets = ['}', ';', ')'];
    const selectedTarget = targets[Math.floor(Math.random() * targets.length)];
    const lastIndex = sourceCode.lastIndexOf(selectedTarget);
    
    if (lastIndex === -1) return sourceCode;
    return sourceCode.substring(0, lastIndex) + sourceCode.substring(lastIndex + 1);
  }

  /** Injects Design Chaos: Injects heavy anti-patterns into functions */
  injectDesignChaos(filePath: string, sourceCode: string, intensity: number): string {
    if (Math.random() > intensity) return sourceCode;

    // Append deep nested loops/conditionals at the bottom of a file to balloon Cyclomatic Complexity
    const architecturalSpaghetti = `
      // DRIFT_MONKEY_INJECTION: Architectural complexity penalty
      function _driftMonkeyVerifyState() {
        if (true) { if (true) { if (true) { while(false) { console.log("bloat"); } } } }
      }
    `;
    return sourceCode + architecturalSpaghetti;
  }

  /** Injects Maintenance Chaos: Rewrites pinned versions to unstable ranges */
  injectMaintenanceChaos(manifestPath: string, manifestContent: string): string {
    const config = JSON.parse(manifestContent);
    if (!config.dependencies) return manifestContent;

    // Mutate pinned versions to unpinned alpha tags to trigger lockfile warnings
    for (const key of Object.keys(config.dependencies)) {
      if (!config.dependencies[key].startsWith('^')) {
        config.dependencies[key] = `^${config.dependencies[key]}-alpha.rc.0`;
        break; // Corrupt a single dependency to test fine-grained layer isolation
      }
    }
    return JSON.stringify(config, null, 2);
  }
}



4. Architectural Tensions & Open Questions
We invite community systems builders to weigh in on these key design dilemmas:
Idempotency vs Continuous Randomness: Should Drift-Monkey inject identical faults for a specific sequence seed (deterministic testing), or should it randomly cycle variations over time to catch unforeseen vulnerabilities?
Git Workspace Pollution: How do we completely clear the injected code chaos after a test execution run finishes so that the real developer codebase isn't accidentally modified outside of the sandbox boundaries?
AST-Safe Mutations: When injecting design or structural drift, should Drift-Monkey mutate code as pure text strings, or should it parse code into an AST format, inject valid but structural anti-patterns, and then print it back out?

5. Next Steps
Update the main repository roadmap to reflect Drift-Monkey as our primary automated verification rig.
Implement a basic CLI wrapper (bin/drift-monkey) for quick local workspace fuzzing simulations.
