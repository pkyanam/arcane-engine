import path from 'node:path';
import { createArcaneProject, listArcaneTemplates } from './index.js';
import type { ArcaneTemplateName } from './index.js';

const TEMPLATE_LINES = listArcaneTemplates().map((template) => {
  const suffix = template.name === 'starter' ? ' (default)' : '';
  return `  ${template.name.padEnd(12)} ${template.description}${suffix}`;
});

const USAGE = [
  'Usage: create-arcane <project-directory> [options]',
  '',
  'Options:',
  '  -t, --template <name>  Choose a template to scaffold.',
  '      --no-install      Skip `pnpm install`.',
  '      --no-start        Scaffold and install, but do not start `pnpm dev`.',
  '  -h, --help           Show this message.',
  '',
  'Templates:',
  ...TEMPLATE_LINES,
].join('\n');

interface ParsedCliArgs {
  destination?: string;
  template?: ArcaneTemplateName;
  install: boolean;
  start: boolean;
}

/**
 * Run the `create-arcane` command-line interface and return the intended exit code.
 */
export async function runCli(args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return 0;
  }

  let parsedArgs: ParsedCliArgs;
  try {
    parsedArgs = parseCliArgs(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(USAGE);
    return 1;
  }

  if (!parsedArgs.destination) {
    console.error(USAGE);
    return 1;
  }

  try {
    const result = await createArcaneProject({
      destination: parsedArgs.destination,
      template: parsedArgs.template,
      install: parsedArgs.install,
      start: parsedArgs.start,
    });

    console.log(`Created ${result.projectName} at ${result.targetDir} using the ${result.template} template.`);

    if (result.started) {
      console.log('Started `pnpm dev` in the background.');
      console.log(`Open http://localhost:5173 after changing into ${path.basename(result.targetDir)}.`);
      return 0;
    }

    console.log('Next steps:');
    console.log(`  cd ${parsedArgs.destination}`);

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

function parseCliArgs(args: string[]): ParsedCliArgs {
  const positionals: string[] = [];
  let install = true;
  let template: ArcaneTemplateName | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;

    if (arg === '--no-install') {
      install = false;
      continue;
    }

    if (arg === '--no-start') {
      continue;
    }

    if (arg === '--template' || arg === '-t') {
      const nextArg = args[index + 1];
      if (!nextArg || nextArg.startsWith('-')) {
        throw new Error('create-arcane: --template requires a template name');
      }

      template = nextArg as ArcaneTemplateName;
      index += 1;
      continue;
    }

    if (arg.startsWith('--template=')) {
      const [, value] = arg.split('=', 2);
      if (!value) {
        throw new Error('create-arcane: --template requires a template name');
      }

      template = value as ArcaneTemplateName;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`create-arcane: unknown option "${arg}"`);
    }

    positionals.push(arg);
  }

  if (positionals.length > 1) {
    throw new Error('create-arcane: expected exactly one project directory');
  }

  return {
    destination: positionals[0],
    template,
    install,
    start: install && !args.includes('--no-start') && Boolean(process.stdout.isTTY),
  };
}
