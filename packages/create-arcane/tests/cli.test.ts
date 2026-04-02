import { describe, expect, it, vi } from 'vitest';
import * as createArcaneModule from '../src/index.js';
import { runCli } from '../src/cli.js';

describe('runCli', () => {
  it('prints usage for --help', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exitCode = await runCli(['--help']);

    expect(exitCode).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Usage: create-arcane <project-directory> [options]'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('asset-ready'));
    expect(error).not.toHaveBeenCalled();

    log.mockRestore();
    error.mockRestore();
  });

  it('returns an error when no destination is provided', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exitCode = await runCli([]);

    expect(exitCode).toBe(1);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Usage: create-arcane <project-directory> [options]'),
    );

    log.mockRestore();
    error.mockRestore();
  });

  it('passes the requested template through to createArcaneProject', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const createArcaneProject = vi
      .spyOn(createArcaneModule, 'createArcaneProject')
      .mockResolvedValue({
        projectName: 'my-game',
        targetDir: '/tmp/my-game',
        template: 'asset-ready',
        installed: false,
        started: false,
        dependencyMode: 'published',
      });

    const exitCode = await runCli(['my-game', '--template', 'asset-ready', '--no-install', '--no-start']);

    expect(exitCode).toBe(0);
    expect(createArcaneProject).toHaveBeenCalledWith({
      destination: 'my-game',
      template: 'asset-ready',
      install: false,
      start: false,
    });
    expect(log).toHaveBeenCalledWith(
      'Created my-game at /tmp/my-game using the asset-ready template.',
    );
    expect(error).not.toHaveBeenCalled();

    createArcaneProject.mockRestore();
    log.mockRestore();
    error.mockRestore();
  });

  it('returns an error when --template is missing a value', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exitCode = await runCli(['my-game', '--template']);

    expect(exitCode).toBe(1);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('create-arcane: --template requires a template name');

    log.mockRestore();
    error.mockRestore();
  });
});
