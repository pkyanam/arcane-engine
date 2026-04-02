import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = fileURLToPath(new URL('.', import.meta.url));
const packageDir = path.resolve(scriptsDir, '..');
const repoRoot = path.resolve(packageDir, '../..');
const sourceDir = path.join(repoRoot, 'templates');
const targetDir = path.join(packageDir, 'templates');

await rm(targetDir, { recursive: true, force: true });
await mkdir(packageDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
