import pathKey from 'env-path-key';
import type functionExecSync from 'function-exec-sync';
import Module from 'module';
import type { satisfiesSemverSyncOptions } from 'node-exec-path';
import { type SpawnOptions, spawnOptions } from 'node-version-utils';
import semver from 'semver';
import deriveInstallPath from './lib/deriveInstallPath.ts';

import type { BindOptions, BoundCaller, CallerCallback, CallOptions } from './types.ts';

export type * from './types.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const SLEEP_MS = 60;

function findExecPath(version: string, env?: NodeJS.ProcessEnv): string {
  const satisfiesSemverSync = _require('node-exec-path').satisfiesSemverSync as (version: string, options?: satisfiesSemverSyncOptions) => string | null;
  const options = env ? { env } : {};
  const execPath = satisfiesSemverSync(version, options);
  if (!execPath) {
    throw new Error(`node-version-call-local: No Node matching "${version}" found in PATH`);
  }
  return execPath;
}

/**
 * Call a function in a Node version found in PATH.
 *
 * @param version - Semver constraint ('>0.12', '>=18', '^16') or exact ('v18.0.0')
 * @param workerPath - Path to the file to execute
 * @param options - Execution options
 * @param args - Arguments to pass to the worker
 */
export default function call(version: string, workerPath: string, options?: CallOptions, ...args: unknown[]): unknown {
  const opts = options || {};
  const callbacks = opts.callbacks !== false; // default true
  const useSpawnOptions = opts.spawnOptions === true; // default false
  const env = opts.env || process.env;

  // Check if current process satisfies the version constraint
  const currentSatisfies = semver.satisfies(process.version, version);

  if (currentSatisfies) {
    // Local execution
    if (callbacks) {
      const PATH_KEY = pathKey();
      if (opts.env && !opts.env[PATH_KEY]) {
        throw new Error(`node-version-call-local: options.env missing required ${PATH_KEY}`);
      }
      const execOptions = { execPath: process.execPath, sleep: SLEEP_MS, callbacks: true, env };
      return (_require('function-exec-sync') as typeof functionExecSync).apply(null, [execOptions, workerPath, ...args]);
    }
    const fn = _require(workerPath);
    return typeof fn === 'function' ? fn.apply(null, args) : fn;
  }

  // Find Node in PATH
  const execPath = findExecPath(version, opts.env);

  // Execute in found Node
  const functionExec = _require('function-exec-sync') as typeof functionExecSync;

  if (useSpawnOptions) {
    // Full environment setup for npm operations
    const installPath = deriveInstallPath(execPath);
    const execOptions = spawnOptions(installPath, { execPath, sleep: SLEEP_MS, callbacks, env } as SpawnOptions);
    return functionExec.apply(null, [execOptions, workerPath, ...args]);
  }

  // Simple execution (like get-file-compat)
  const execOptions = { execPath, sleep: SLEEP_MS, callbacks, env };
  return functionExec.apply(null, [execOptions, workerPath, ...args]);
}

/**
 * Create a bound caller for a specific version and worker.
 * Looks up the execPath ONCE on first call (lazy) and caches it.
 *
 * @param version - Semver constraint ('>0.12', '>=18', '^16') or exact ('v18.0.0')
 * @param workerPath - Path to the file to execute
 * @param options - Execution options
 * @returns A function that calls the worker with the bound version/path/options
 */
export function bind(version: string, workerPath: string, options?: BindOptions): BoundCaller {
  const opts = { callbacks: true, ...options };
  const callbacks = opts.callbacks !== false;
  const useSpawnOptions = opts.spawnOptions === true;
  const env = opts.env || process.env;

  // Cache these on first call (lazy)
  let initialized = false;
  let currentSatisfies: boolean;
  let cachedExecPath: string | null = null;

  return function boundCaller(...args: unknown[]): unknown {
    // Check if last arg is a callback first
    const lastArg = args[args.length - 1];
    const hasCallback = typeof lastArg === 'function';

    const execute = (): unknown => {
      // Lazy initialization on first call
      if (!initialized) {
        currentSatisfies = semver.satisfies(process.version, version);
        if (!currentSatisfies) {
          cachedExecPath = findExecPath(version, opts.env);
        }
        initialized = true;
      }

      if (currentSatisfies) {
        // Local execution
        if (callbacks) {
          const PATH_KEY = pathKey();
          if (opts.env && !opts.env[PATH_KEY]) {
            throw new Error(`node-version-call-local: options.env missing required ${PATH_KEY}`);
          }
          const execOptions = { execPath: process.execPath, sleep: SLEEP_MS, callbacks: true, env };
          return (_require('function-exec-sync') as typeof functionExecSync).apply(null, [execOptions, workerPath, ...args]);
        }
        const fn = _require(workerPath);
        return typeof fn === 'function' ? fn.apply(null, args) : fn;
      }

      // Execute in cached Node - cachedExecPath is guaranteed to be set when currentSatisfies is false
      if (cachedExecPath === null) {
        throw new Error('node-version-call-local: Internal error - execPath should be set');
      }
      const execPath = cachedExecPath;
      const functionExec = _require('function-exec-sync') as typeof functionExecSync;

      if (useSpawnOptions) {
        const installPath = deriveInstallPath(execPath);
        const execOptions = spawnOptions(installPath, { execPath, sleep: SLEEP_MS, callbacks, env } as SpawnOptions);
        return functionExec.apply(null, [execOptions, workerPath, ...args]);
      }

      const execOptions = { execPath, sleep: SLEEP_MS, callbacks, env };
      return functionExec.apply(null, [execOptions, workerPath, ...args]);
    };

    if (hasCallback) {
      const callback = args.pop() as CallerCallback;
      try {
        const result = execute();
        callback(null, result);
        return undefined;
      } catch (err) {
        callback(err);
        return undefined;
      }
    }

    return execute();
  };
}
