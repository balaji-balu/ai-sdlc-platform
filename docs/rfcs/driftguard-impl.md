RFC-0004: Layer 5 (Implementation Drift Guard) Specification
Status: Proposed
Author: [Your Name/GitHub Handle]
Created: 2026-09-12
Dependencies: RFC-0001 (Core Architecture), RFC-0003 (Execution Sandbox)

1. Executive Summary
During long-running code generation sessions, an agent can easily drift from a working implementation into a broken state. This manifests as syntactic degradation (introducing typos or missing imports), semantic regressions (breaking existing unit tests), or hallucinated tool loops (repeatedly running the same failing compile command hoping for a different outcome).
This RFC specifies the ImplementationDriftGuard. It leverages deterministic compiler checks, runtime testing frameworks, and execution loop limits within the isolated sandbox to catch and correct execution-plane drift before it pollutes upper architecture layers.

2. Component Pipeline Architecture
The ImplementationDriftGuard acts as an automated quality gate between the sandbox execution layer and the state machine commit phase.
                 ┌────────────────────────────────────────┐
                  │       Sandbox Code Generation          │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ 1. OBSERVE: Parse File Diffs  │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │  2. EVALUATE: Run Static/CI   │
                      │     (Linter -> Compiler ->     │
                      │        Unit Test Suite)       │
                      └───────────────┬───────────────┘
                                      │
                       No Drift       ▼        Drift Detected
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
      ┌─────────────────────┐                   ┌─────────────────────┐
      │  Approve State &    │                   │   Generate Precise  │
      │  Proceed to Loop    │                   │   Correction Event  │
      └─────────────────────┘                   └─────────────────────┘



3. Implementation Specification
The Implementation Guard implements the DriftGuard contract defined in RFC-0001, utilizing the secure sandbox primitives defined in RFC-0003.
import { DriftGuard, StateSnapshot, DriftReport, CorrectionPlan } from './rfc0001-types';
import { SandboxProvider } from './rfc0003-types';

export class ImplementationDriftGuard implements DriftGuard {
  readonly id = 'guard-layer5-implementation';
  readonly targetLayer = 'implementation';
  
  private lastKnownWorkingCommit: string | null = null;
  private continuousFailureCount = 0;
  private readonly MAX_RETRY_THRESHOLD = 4; // Prevent infinite loop fixing

  constructor(private sandbox: SandboxProvider) {}

  /** 1. OBSERVE: Gather compile states and test suite telemetry */
  async observe(workspacePath: string, contextState: any): Promise<StateSnapshot> {
    // Run configured pipeline commands sequentially in the sandbox
    const lintResult = await this.sandbox.executeCommand('npm run lint', 30000);
    const buildResult = await this.sandbox.executeCommand('npm run build', 60000);
    const testResult = await this.sandbox.executeCommand('npm run test', 120000);

    return {
      timestamp: Date.now(),
      layer: this.targetLayer,
      payload: {
        lint: { exitCode: lintResult.exitCode, stderr: lintResult.stderr },
        build: { exitCode: buildResult.exitCode, stderr: buildResult.stderr },
        test: { exitCode: testResult.exitCode, stdout: testResult.stdout, stderr: testResult.stderr }
      }
    };
  }

  /** 2. EVALUATE: Classify the nature and severity of code decay */
  async evaluate(current: StateSnapshot, baseline: any): Promise<DriftReport> {
    const { lint, build, test } = current.payload;

    // Critical: Code does not compile/build
    if (build.exitCode !== 0) {
      this.continuousFailureCount++;
      return {
        hasDrifted: true,
        severity: this.continuousFailureCount >= this.MAX_RETRY_THRESHOLD ? 'critical' : 'high',
        varianceDescription: 'Compilation/Build failure detected. Code state cannot execute.',
        telemetryDelta: { compilationError: build.stderr }
      };
    }

    // High: Build passes, but functional requirements regressed (Tests failing)
    if (test.exitCode !== 0) {
      this.continuousFailureCount++;
      return {
        hasDrifted: true,
        severity: this.continuousFailureCount >= this.MAX_RETRY_THRESHOLD ? 'critical' : 'medium',
        varianceDescription: 'Regression detected: Existing or newly generated unit tests failed.',
        telemetryDelta: { testFailureOutput: test.stdout || test.stderr }
      };
    }

    // Reset loop circuit breaker on absolute success
    this.continuousFailureCount = 0;
    return { hasDrifted: false, severity: 'low', varianceDescription: 'Clean implementation state.', telemetryDelta: null };
  }

  /** 3. CORRECT: Issue explicit error maps or force state recovery */
  async correct(report: DriftReport): Promise<CorrectionPlan> {
    // Circuit breaker tripped: Agent is stuck in an infinite failure loop
    if (report.severity === 'critical') {
      return {
        strategy: 'rollback',
        instructionSet: `CRITICAL: You have failed to resolve this compilation/test loop after ${this.MAX_RETRY_THRESHOLD} attempts. The system is forcing a hard rollback to the last known working state snapshot. Re-evaluate your structural approach entirely.`
      };
    }

    // Standard correction loop: Feed pure error logs straight back to LLM context
    return {
      strategy: 'refactor',
      instructionSet: `IMPLEMENTATION_DRIFT: Your latest code modification broke the workspace validation pipeline. Review the explicit error logs below and correct your implementation immediately:\n\n${JSON.stringify(report.telemetryDelta)}`
    };
  }
}



4. Operational Configuration (drift.yaml)
Developers can toggle and configure the sensitivity of the Implementation Guard per repository via a root yaml manifest:
guards:
  layer5_implementation:
    enabled: true
    max_retries: 4
    pipeline:
      lint_command: "npm run lint"
      build_command: "npm run build"
      test_command: "npm run test -- --watchAll=false"
    severity_mapping:
      build_fail: "high"
      test_fail: "medium"
      lint_fail: "low"



5. Architectural Tensions & Open Questions
We invite community feedback on these lower-level runtime edge cases:
Flaky Tests Handling: How should the guard differentiate between an actual agent implementation regression and a flaky test suite that occasionally drops connections or times out under memory pressure?
Dynamic Test Coverage Creep: Should the guard enforce that an agent writing new logic must write matching tests? If code lines change but test execution counts remain stagnant, is that considered implementation drift?
Log Sanitization: Raw compiler outputs or test traces can be hundreds of lines long, clogging context windows. How do we cleanly compress tool error logs into high-signal summaries for the correction payload?

6. Next Steps to Code Implementation
Build an abstract Test/Build log parsing library (src/core/parsers/) to strip away noise from Jest, PyTest, and Cargo logs.
Open a pull request implementing the concrete ImplementationDriftGuard class.
