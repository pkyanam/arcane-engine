import path from 'node:path';
import { createArcaneProject } from './index.js';

const USAGE = `Usage: create-arcane <project-directory> [--no-install] [--no-start]`;

/**
 * Run the `create-arcane` command-line interface and return the intended exit code.
 */
export async function runCli(args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return 0;
  }

  const positionals = args.filter((arg) => !arg.startsWith('-'));
  if (positionals.length !== 1) {
    console.error(USAGE);
    return 1;
  }

  const destination = positionals[0];
  const install = !args.includes('--no-install');
  const start = install && !args.includes('--no-start') && Boolean(process.stdout.isTTY);

  try {
    const result = await createArcaneProject({
      destination,
      install,
      start,
    });

    console.log(`Created ${result.projectName} at ${result.targetDir}`);

    if (result.started) {
      console.log('Started `pnpm dev` in the background.');
      console.log(`Open http://localhost:5173 after changing into ${path.basename(result.targetDir)}.`);
      return 0;
    }

    console.log('Next steps:');
    console.log(`  cd ${destination}`);

    if (!result.installed) {
      console.log('  pnpm install');
    }

    console.log('  pnpm dev');
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
