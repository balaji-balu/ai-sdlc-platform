/** RFC-0005 implementation chaos: deterministic syntax corruption. */
export function injectImplementationChaos(
  filePath: string,
  sourceCode: string,
  intensity: number,
  random: () => number = Math.random,
): string {
  if (random() > clamp(intensity)) return sourceCode;

  const candidates = ['}', ';', ')'];
  const target = candidates[Math.floor(random() * candidates.length)];
  const index = sourceCode.lastIndexOf(target);
  if (index < 0) return sourceCode;

  return `${sourceCode.slice(0, index)}${sourceCode.slice(index + 1)}\n// DRIFT_MONKEY_INJECTION: syntax corruption (${filePath})\n`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
