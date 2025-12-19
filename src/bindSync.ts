import pathKey from 'env-path-key';
import type functionExecSync from 'function-exec-sync';
import Module from 'module';
import { type SpawnOptions, spawnOptions } from 'node-version-utils';
import semver from 'semver';

import resolveVersion from './lib/resolveVersion.ts';
import type { BindOptions, BoundSyncCaller } from './types.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const SLEEP_MS = 60;

/**
 * Create a bound sync caller for a specific version and worker.
 * Looks up the execPath ONCE on first call (lazy) and caches it.
 *
 * @param version - Semver constraint ('>0.12', '>=18', '^16') or exact ('v18.0.0')
 * @param workerPath - Path to the file to execute
 * @param options - Execution options
 * @returns A function that calls the worker synchronously with the bound version/path/options
 */
let functionExec: typeof functionExecSync = null;
export default function bindSync(version: string, workerPath: string, options?: BindOptions): BoundSyncCaller {
  const opts = options || {};
  const callbacks = opts.callbacks;
  const useSpawnOptions = opts.spawnOptions !== false; // default true
  const env = opts.env || process.env;

  let initialized = false;
  let currentSatisfies: boolean;
  let cachedExecPath: string | null = null;
  let cachedInstallPath: string | null = null;

  return function boundSyncCaller(...args: unknown[]): unknown {
    // Initialize on first call
    if (!initialized) {
      currentSatisfies = version === process.version || semver.satisfies(process.version, version);
      if (!currentSatisfies) {
        const resolved = resolveVersion(version, { env: opts.env });
        cachedExecPath = resolved.execPath;
        cachedInstallPath = resolved.installPath;
      }
      initialized = true;
    }

    // Local execution - current process satisfies version
    if (currentSatisfies) {
      // If worker uses callbacks, we need function-exec-sync to convert to sync
      if (callbacks) {
        const PATH_KEY = pathKey();
        if (opts.env && !opts.env[PATH_KEY]) {
          throw new Error(`node-version-call-local: options.env missing required ${PATH_KEY}`);
        }
        if (!functionExec) functionExec = _require('function-exec-sync');
        const execOptions = { execPath: process.execPath, sleep: SLEEP_MS, callbacks, env };
        return functionExec.apply(null, [execOptions, workerPath, ...args]);
      }
      // Direct require for sync workers
      const fn = _require(workerPath);
      return typeof fn === 'function' ? fn.apply(null, args) : fn;
    }

    // Remote execution - spawn child process
    if (!functionExec) functionExec = _require('function-exec-sync');

    if (useSpawnOptions) {
      const execOptions = spawnOptions(cachedInstallPath, { execPath: cachedExecPath, sleep: SLEEP_MS, callbacks, env } as SpawnOptions);
      return functionExec.apply(null, [execOptions, workerPath, ...args]);
    }

    const execOptions = { execPath: cachedExecPath, sleep: SLEEP_MS, callbacks, env };
    return functionExec.apply(null, [execOptions, workerPath, ...args]);
  };
}
