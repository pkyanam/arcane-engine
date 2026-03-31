import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createArcaneProject } from '../src/index.js';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('createArcaneProject', () => {
  it('copies the starter template and replaces scaffold placeholders', async () => {
    const cwd = await createTempDir();

    const result = await createArcaneProject({
      cwd,
      destination: 'my-game',
      install: false,
      start: false,
    });

    expect(result.projectName).toBe('my-game');
    expect(result.installed).toBe(false);
    expect(result.started).toBe(false);
    expect(result.dependencyMode).toBe('published');

    const packageJson = JSON.parse(
      await readFile(path.join(result.targetDir, 'package.json'), 'utf8'),
    ) as {
      name: string;
      dependencies: Record<string, string>;
      pnpm: {
        overrides: Record<string, string>;
      };
    };
    const readme = await readFile(path.join(result.targetDir, 'README.md'), 'utf8');
    const indexHtml = await readFile(path.join(result.targetDir, 'index.html'), 'utf8');

    expect(packageJson.name).toBe('my-game');
    expect(packageJson.dependencies['@arcane-engine/assets']).toBe('^0.1.0');
    expect(packageJson.dependencies['@arcane-engine/core']).toBe('^0.1.0');
    expect(packageJson.dependencies['@arcane-engine/input']).toBe('^0.1.0');
    expect(packageJson.dependencies['@arcane-engine/renderer']).toBe('^0.1.0');
    expect(packageJson.pnpm.overrides['@arcane-engine/assets']).toBe('^0.1.0');
    expect(packageJson.pnpm.overrides['@arcane-engine/core']).toBe('^0.1.0');
    expect(packageJson.pnpm.overrides['@arcane-engine/input']).toBe('^0.1.0');
    expect(packageJson.pnpm.overrides['@arcane-engine/renderer']).toBe('^0.1.0');
    expect(readme).toContain('# my-game');
    expect(indexHtml).toContain('<title>my-game - Arcane Engine</title>');

    await expect(readFile(path.join(result.targetDir, 'src', 'main.ts'), 'utf8')).resolves.toContain(
      "import { createGameLoop, createSceneManager, createWorld, runSystems } from '@arcane-engine/core';",
    );
  });

  it('refuses to overwrite a non-empty destination directory', async () => {
    const cwd = await createTempDir();
    const projectRoot = path.join(cwd, 'occupied-project');

    await createArcaneProject({
      cwd,
      destination: 'occupied-project',
      install: false,
      start: false,
    });

    await expect(
      createArcaneProject({
        cwd,
        destination: 'occupied-project',
        install: false,
        start: false,
      }),
    ).rejects.toThrow(`createArcaneProject: ${projectRoot} already exists and is not empty`);
  });

  it('allows scaffolding into an existing empty directory', async () => {
    const cwd = await createTempDir();
    const emptyDirectory = path.join(cwd, 'empty-project');
    await createEmptyDir(emptyDirectory);

    const result = await createArcaneProject({
      destination: emptyDirectory,
      install: false,
      start: false,
    });

    expect(result.targetDir).toBe(emptyDirectory);

    const packageJson = JSON.parse(
      await readFile(path.join(emptyDirectory, 'package.json'), 'utf8'),
    ) as { name: string };
    expect(packageJson.name).toBe('empty-project');
  });

  it('uses local file dependencies when scaffolding inside the monorepo', async () => {
    const cwd = await mkdtemp(path.join(repoRoot, '.tmp-create-arcane-'));
    tempDirectories.push(cwd);

    const result = await createArcaneProject({
      cwd,
      destination: 'workspace-project',
      install: false,
      start: false,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(result.targetDir, 'package.json'), 'utf8'),
    ) as {
      dependencies: Record<string, string>;
      pnpm: {
        overrides: Record<string, string>;
      };
    };
    const expectedAssetsDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'assets'));
    const expectedCoreDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'core'));
    const expectedInputDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'input'));
    const expectedRendererDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'renderer'));

    expect(result.dependencyMode).toBe('local');
    expect(packageJson.dependencies['@arcane-engine/assets']).toBe(expectedAssetsDependency);
    expect(packageJson.dependencies['@arcane-engine/core']).toBe(expectedCoreDependency);
    expect(packageJson.dependencies['@arcane-engine/input']).toBe(expectedInputDependency);
    expect(packageJson.dependencies['@arcane-engine/renderer']).toBe(expectedRendererDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/assets']).toBe(expectedAssetsDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/core']).toBe(expectedCoreDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/input']).toBe(expectedInputDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/renderer']).toBe(expectedRendererDependency);
  });

  it('uses local file dependencies when the local CLI scaffolds to an absolute path outside the repo', async () => {
    const externalRoot = await createTempDir();
    const result = await createArcaneProject({
      cwd: repoRoot,
      destination: path.join(externalRoot, 'external-project'),
      install: false,
      start: false,
    });

    const packageJson = JSON.parse(
      await readFile(path.join(result.targetDir, 'package.json'), 'utf8'),
    ) as {
      dependencies: Record<string, string>;
      pnpm: {
        overrides: Record<string, string>;
      };
    };
    const expectedAssetsDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'assets'));
    const expectedCoreDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'core'));
    const expectedInputDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'input'));
    const expectedRendererDependency = await expectedFileDependency(result.targetDir, path.join(repoRoot, 'packages', 'renderer'));

    expect(result.dependencyMode).toBe('local');
    expect(packageJson.dependencies['@arcane-engine/assets']).toBe(expectedAssetsDependency);
    expect(packageJson.dependencies['@arcane-engine/core']).toBe(expectedCoreDependency);
    expect(packageJson.dependencies['@arcane-engine/input']).toBe(expectedInputDependency);
    expect(packageJson.dependencies['@arcane-engine/renderer']).toBe(expectedRendererDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/assets']).toBe(expectedAssetsDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/core']).toBe(expectedCoreDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/input']).toBe(expectedInputDependency);
    expect(packageJson.pnpm.overrides['@arcane-engine/renderer']).toBe(expectedRendererDependency);
  });

  it('rejects invalid project names before writing files', async () => {
    const cwd = await createTempDir();

    await expect(
      createArcaneProject({
        cwd,
        destination: 'MyGame',
        install: false,
        start: false,
      }),
    ).rejects.toThrow(
      'createArcaneProject: project names must use lowercase letters, numbers, and hyphens only',
    );
  });
});

async function createTempDir(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'create-arcane-'));
  tempDirectories.push(directory);
  return directory;
}

async function createEmptyDir(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
}

async function expectedFileDependency(targetDir: string, dependencyDir: string): Promise<string> {
  const [resolvedTargetDir, resolvedDependencyDir] = await Promise.all([
    realpath(targetDir),
    realpath(dependencyDir),
  ]);
  return `file:${path.relative(resolvedTargetDir, resolvedDependencyDir).split(path.sep).join('/')}`;
}
