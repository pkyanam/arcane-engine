import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = fileURLToPath(new URL('.', import.meta.url));
const packageDir = path.resolve(scriptsDir, '..');
const repoRoot = path.resolve(packageDir, '../..');
const sourceDir = path.join(repoRoot, 'templates', 'starter');
const targetDir = path.join(packageDir, 'templates', 'starter');

await rm(targetDir, { recursive: true, force: true });
await mkdir(path.dirname(targetDir), { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
