export interface ExecutionResult { exitCode: number; stdout: string; stderr: string; durationMs: number; mutatedFiles: string[]; }
export interface SandboxVolumeInfo { hostPath: string; guestPath: string; readOnly: boolean; }
export interface SandboxProvider {
  readonly id: string; readonly type: 'docker' | 'firecracker' | 'local-mock';
  initialize(volumes: SandboxVolumeInfo[]): Promise<void>;
  writeFile(relativePath: string, content: string): Promise<void>;
  readFile(relativePath: string): Promise<string>;
  executeCommand(command: string, timeoutMs: number): Promise<ExecutionResult>;
  destroy(): Promise<void>;
}
