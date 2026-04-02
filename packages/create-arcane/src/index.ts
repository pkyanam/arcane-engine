import { cp, mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_NAME_PLACEHOLDER = '__ARCANE_PROJECT_NAME__';
const ASSETS_DEPENDENCY_PLACEHOLDER = '__ARCANE_ENGINE_ASSETS_DEPENDENCY__';
const CORE_DEPENDENCY_PLACEHOLDER = '__ARCANE_ENGINE_CORE_DEPENDENCY__';
const INPUT_DEPENDENCY_PLACEHOLDER = '__ARCANE_ENGINE_INPUT_DEPENDENCY__';
const RENDERER_DEPENDENCY_PLACEHOLDER = '__ARCANE_ENGINE_RENDERER_DEPENDENCY__';
const ARCANE_PACKAGES = ['assets', 'core', 'input', 'renderer'] as const;
const ARCANE_TEMPLATE_DEFINITIONS = [
  {
    name: 'starter',
    description: 'Minimal ECS + scene-transition starter.',
  },
  {
    name: 'asset-ready',
    description: 'Textured scene + model + preload walkthrough.',
  },
] as const;
const DEFAULT_TEMPLATE_NAME = 'starter';

type ArcanePackageName = (typeof ARCANE_PACKAGES)[number];
type DependencyMode = 'local' | 'published';
export type ArcaneTemplateName = (typeof ARCANE_TEMPLATE_DEFINITIONS)[number]['name'];

interface DependencySpecifiers {
  assets: string;
  core: string;
  input: string;
  renderer: string;
}

/**
 * Metadata describing one shipped `create-arcane` template.
 */
export interface ArcaneTemplateDefinition {
  /** Template name passed to `--template`. */
  name: ArcaneTemplateName;
  /** Short user-facing description for help text and docs. */
  description: string;
}

/**
 * Options for scaffolding a new Arcane Engine project.
 */
export interface CreateArcaneProjectOptions {
  /** Destination directory name or path for the new project. */
  destination: string;
  /** Base directory used to resolve {@link destination}. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Scaffold a specific template. Defaults to `"starter"`. */
  template?: ArcaneTemplateName;
  /** Run `pnpm install` after copying the template. Defaults to `true`. */
  install?: boolean;
  /** Start `pnpm dev` in the background after install. Defaults to `true`. */
  start?: boolean;
}

/**
 * Result metadata returned after a project has been scaffolded.
 */
export interface CreateArcaneProjectResult {
  /** Final project directory name. */
  projectName: string;
  /** Absolute path to the generated project directory. */
  targetDir: string;
  /** Template that was scaffolded. */
  template: ArcaneTemplateName;
  /** Whether dependency installation was run. */
  installed: boolean;
  /** Whether the dev server was started in the background. */
  started: boolean;
  /** Whether dependencies were linked from the local monorepo or resolved as published packages. */
  dependencyMode: DependencyMode;
}

/**
 * Return the shipped templates supported by `create-arcane`.
 */
export function listArcaneTemplates(): readonly ArcaneTemplateDefinition[] {
  return ARCANE_TEMPLATE_DEFINITIONS;
}

/**
 * Copy the selected template, replace placeholders, optionally install
 * dependencies, and optionally start the dev server.
 */
export async function createArcaneProject(
  options: CreateArcaneProjectOptions,
): Promise<CreateArcaneProjectResult> {
  if (!options.destination.trim()) {
    throw new Error('createArcaneProject: a destination directory is required');
  }

  const cwd = options.cwd ?? process.cwd();
  const targetDir = path.resolve(cwd, options.destination);
  const projectName = path.basename(targetDir);
  const template = resolveTemplateName(options.template);

  validateProjectName(projectName);
  await assertSafeTargetDirectory(targetDir);

  const templateDir = await resolveTemplateDirectory(template);
  await copyTemplateDirectory(templateDir, targetDir);

  const { mode, specifiers } = await resolveDependencySpecifiers(targetDir, cwd);
  await replaceTemplatePlaceholders(targetDir, {
    [PROJECT_NAME_PLACEHOLDER]: projectName,
    [ASSETS_DEPENDENCY_PLACEHOLDER]: specifiers.assets,
    [CORE_DEPENDENCY_PLACEHOLDER]: specifiers.core,
    [INPUT_DEPENDENCY_PLACEHOLDER]: specifiers.input,
    [RENDERER_DEPENDENCY_PLACEHOLDER]: specifiers.renderer,
  });

  let installed = false;
  if (options.install !== false) {
    await runPnpmCommand(['install'], targetDir);
    installed = true;
  }

  let started = false;
  if (options.start !== false) {
    await startDetachedPnpmCommand(['dev'], targetDir);
    started = true;
  }

  return {
    projectName,
    targetDir,
    template,
    installed,
    started,
    dependencyMode: mode,
  };
}

function validateProjectName(projectName: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(projectName)) {
    throw new Error(
      'createArcaneProject: project names must use lowercase letters, numbers, and hyphens only',
    );
  }
}

async function assertSafeTargetDirectory(targetDir: string): Promise<void> {
  const targetStat = await getOptionalStat(targetDir);

  if (!targetStat) {
    return;
  }

  if (!targetStat.isDirectory()) {
    throw new Error(`createArcaneProject: ${targetDir} already exists and is not a directory`);
  }

  const entries = await readdir(targetDir);
  if (entries.length > 0) {
    throw new Error(`createArcaneProject: ${targetDir} already exists and is not empty`);
  }
}

function resolveTemplateName(templateName: ArcaneTemplateName | undefined): ArcaneTemplateName {
  const resolvedTemplateName = templateName ?? DEFAULT_TEMPLATE_NAME;

  if (
    ARCANE_TEMPLATE_DEFINITIONS.some((definition) => definition.name === resolvedTemplateName)
  ) {
    return resolvedTemplateName;
  }

  throw new Error(
    `createArcaneProject: unknown template "${resolvedTemplateName}". ` +
      `Available templates: ${listArcaneTemplates().map((template) => template.name).join(', ')}`,
  );
}

async function resolveTemplateDirectory(templateName: ArcaneTemplateName): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, `../templates/${templateName}`),
    path.resolve(moduleDir, `../../../templates/${templateName}`),
  ];

  for (const candidate of candidates) {
    const candidateStat = await getOptionalStat(candidate);
    if (candidateStat?.isDirectory()) {
      return candidate;
    }
  }

  throw new Error(`createArcaneProject: could not locate the "${templateName}" template`);
}

async function copyTemplateDirectory(sourceDir: string, targetDir: string): Promise<void> {
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    await cp(path.join(sourceDir, entry.name), path.join(targetDir, entry.name), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  }
}

async function replaceTemplatePlaceholders(
  rootDir: string,
  replacements: Record<string, string>,
): Promise<void> {
  for (const filePath of await collectFiles(rootDir)) {
    const original = await readFile(filePath, 'utf8');
    let updated = original;

    for (const [placeholder, value] of Object.entries(replacements)) {
      updated = updated.split(placeholder).join(value);
    }

    if (updated !== original) {
      await writeFile(filePath, updated, 'utf8');
    }
  }
}

async function collectFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function resolveDependencySpecifiers(
  targetDir: string,
  cwd: string,
): Promise<{ mode: DependencyMode; specifiers: DependencySpecifiers }> {
  const monorepoRoot = await findArcaneMonorepo(cwd) ?? await findArcaneMonorepo(path.dirname(targetDir));

  if (monorepoRoot) {
    const [assets, core, input, renderer] = await Promise.all([
      toFileDependency(targetDir, path.join(monorepoRoot, 'packages', 'assets')),
      toFileDependency(targetDir, path.join(monorepoRoot, 'packages', 'core')),
      toFileDependency(targetDir, path.join(monorepoRoot, 'packages', 'input')),
      toFileDependency(targetDir, path.join(monorepoRoot, 'packages', 'renderer')),
    ]);

    return {
      mode: 'local',
      specifiers: {
        assets,
        core,
        input,
        renderer,
      },
    };
  }

  const publishedVersion = await readPublishedArcaneVersion();

  return {
    mode: 'published',
    specifiers: {
      assets: publishedVersion,
      core: publishedVersion,
      input: publishedVersion,
      renderer: publishedVersion,
    },
  };
}

async function findArcaneMonorepo(startDir: string): Promise<string | undefined> {
  let currentDir = startDir;

  while (true) {
    if (await hasArcanePackages(currentDir)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
}

async function hasArcanePackages(rootDir: string): Promise<boolean> {
  for (const packageName of ARCANE_PACKAGES) {
    const packageJsonPath = path.join(rootDir, 'packages', packageName, 'package.json');
    const packageJsonStat = await getOptionalStat(packageJsonPath);

    if (!packageJsonStat?.isFile()) {
      return false;
    }
  }

  return true;
}

async function readPublishedArcaneVersion(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(moduleDir, '../package.json'),
    path.resolve(moduleDir, '../../package.json'),
  ];

  for (const packageJsonPath of candidatePaths) {
    const packageJsonStat = await getOptionalStat(packageJsonPath);
    if (!packageJsonStat?.isFile()) {
      continue;
    }

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version?: string };
    if (packageJson.version) {
      return `^${packageJson.version}`;
    }
  }

  return '^0.1.0';
}

async function toFileDependency(targetDir: string, dependencyDir: string): Promise<string> {
  const [resolvedTargetDir, resolvedDependencyDir] = await Promise.all([
    realpath(targetDir),
    realpath(dependencyDir),
  ]);
  const relativePath = path.relative(resolvedTargetDir, resolvedDependencyDir).split(path.sep).join('/');
  return `file:${relativePath}`;
}

async function getOptionalStat(targetPath: string) {
  try {
    return await stat(targetPath);
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return undefined;
    }

    throw error;
  }
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

async function runPnpmCommand(args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(getPnpmExecutable(), args, {
      cwd,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`createArcaneProject: pnpm ${args.join(' ')} exited with code ${code ?? 'unknown'}`),
      );
    });
  });
}

async function startDetachedPnpmCommand(args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(getPnpmExecutable(), args, {
      cwd,
      stdio: 'ignore',
      detached: true,
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

function getPnpmExecutable(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}
