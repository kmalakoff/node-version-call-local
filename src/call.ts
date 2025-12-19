import bind from './bind.ts';
import type { CallOptions } from './types.ts';

/**
 * Call a function asynchronously in a Node version found in PATH.
 *
 * @param version - Semver constraint ('>0.12', '>=18', '^16') or exact ('v18.0.0')
 * @param workerPath - Path to the file to execute
 * @param options - Execution options
 * @param args - Arguments to pass to the worker. If last arg is a function, it's treated as callback.
 * @returns Promise if no callback, undefined if callback provided
 */
export default function call(version: string, workerPath: string, options?: CallOptions, ...args: unknown[]): unknown {
  return bind(version, workerPath, options)(...args);
}
