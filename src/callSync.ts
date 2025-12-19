import bindSync from './bindSync.ts';
import type { CallOptions } from './types.ts';

/**
 * Call a function synchronously in a Node version found in PATH.
 *
 * @param version - Semver constraint ('>0.12', '>=18', '^16') or exact ('v18.0.0')
 * @param workerPath - Path to the file to execute
 * @param options - Execution options
 * @param args - Arguments to pass to the worker
 * @returns The result from the worker. Throws on error.
 */
export default function callSync(version: string, workerPath: string, options?: CallOptions, ...args: unknown[]): unknown {
  return bindSync(version, workerPath, options)(...args);
}
