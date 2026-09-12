/** RFC-0005 maintenance chaos: loosens one explicit dependency version. */
export function injectMaintenanceChaos(
  manifestPath: string,
  manifestContent: string,
  intensity: number,
  random: () => number = Math.random,
): string {
  if (random() > clamp(intensity)) return manifestContent;

  const config = JSON.parse(manifestContent) as Record<string, any>;
  const dependencies = config.dependencies ?? config.devDependencies;
  if (!dependencies || typeof dependencies !== 'object') return manifestContent;

  const dependency = Object.keys(dependencies).find((name) => {
    const version = dependencies[name];
    return typeof version === 'string' && !version.startsWith('^') && !version.startsWith('~') && version !== 'latest';
  });
  if (!dependency) return manifestContent;

  dependencies[dependency] = `^${dependencies[dependency]}-alpha.rc.0`;
  config._driftMonkey = { mutation: 'maintenance', file: manifestPath, dependency };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
