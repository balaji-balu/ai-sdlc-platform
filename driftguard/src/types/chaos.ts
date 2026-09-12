export interface ChaosProfile { targetLayer: 'design' | 'implementation' | 'maintenance' | 'architecture'; mutationType: string; intensity: number; }
export interface ChaosInjector {
  injectImplementationChaos(filePath: string, sourceCode: string, intensity: number): string;
  injectDesignChaos(filePath: string, sourceCode: string, intensity: number): string;
  injectMaintenanceChaos(manifestPath: string, manifestContent: string, intensity: number): string;
}
