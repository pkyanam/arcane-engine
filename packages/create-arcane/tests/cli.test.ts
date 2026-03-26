import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli.js';

describe('runCli', () => {
  it('prints usage for --help', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const exitCode = await runCli(['--help']);

    expect(exitCode).toBe(0);
    expect(log).toHaveBeenCalledWith(
      'Usage: create-arcane <project-directory> [--no-install] [--no-start]',
    );
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
      'Usage: create-arcane <project-directory> [--no-install] [--no-start]',
    );

    log.mockRestore();
    error.mockRestore();
  });
});
