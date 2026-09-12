/** RFC-0005 design chaos: injects structural complexity. */
export function injectDesignChaos(
  filePath: string,
  sourceCode: string,
  intensity: number,
  random: () => number = Math.random,
): string {
  if (random() > clamp(intensity)) return sourceCode;

  return `${sourceCode}\n\n// DRIFT_MONKEY_INJECTION: design complexity (${filePath})\nfunction _driftMonkeyVerifyState(value: unknown) {\n  if (value) {\n    if (Array.isArray(value)) {\n      for (const item of value) {\n        while (item && false) {\n          if (String(item).length > 0) console.log(item);\n        }\n      }\n    }\n  }\n}\n`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
