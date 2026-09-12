import { Project } from 'ts-morph';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('layer isolation', () => {
  it('keeps the orchestrator free of concrete guard imports', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const file = project.createSourceFile('Orchestrator.ts', readFileSync('src/core/Orchestrator.ts', 'utf8'));
    expect(file.getImportDeclarations().some((i) => i.getModuleSpecifierValue().includes('/guards/'))).toBe(false);
  });
});
