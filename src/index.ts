import pathKey from 'env-path-key';
import type functionExecSync from 'function-exec-sync';
import Module from 'module';
import { type SpawnOptions, spawnOptions } from 'node-version-utils';
import semver from 'semver';

import resolveVersion from './lib/resolveVersion.ts';
import type { BindOptions, BoundCaller, CallerCallback, CallOptions } from './types.ts';

export type * from './types.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const SLEEP_MS = 60;

let functionExec: typeof functionExecSync = null;

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
  const callbacks = opts.callbacks === true; // default false (matches function-exec-sync)
  const useSpawnOptions = opts.spawnOptions !== false; // default true
  const env = opts.env || process.env;

  const currentSatisfies = version === process.version || semver.satisfies(process.version, version);

  if (currentSatisfies && !callbacks) {
    const fn = _require(workerPath);
    return typeof fn === 'function' ? fn.apply(null, args) : fn;
  }

  if (!functionExec) functionExec = _require('function-exec-sync');

  if (currentSatisfies) {
    const PATH_KEY = pathKey();
    if (opts.env && !opts.env[PATH_KEY]) {
      throw new Error(`node-version-call-local: options.env missing required ${PATH_KEY}`);
    }
    const execOptions = { execPath: process.execPath, sleep: SLEEP_MS, callbacks: true, env };
    return functionExec.apply(null, [execOptions, workerPath, ...args]);
  }

  const { execPath, installPath } = resolveVersion(version, { env: opts.env });

  if (useSpawnOptions) {
    const execOptions = spawnOptions(installPath, { execPath, sleep: SLEEP_MS, callbacks, env } as SpawnOptions);
    return functionExec.apply(null, [execOptions, workerPath, ...args]);
  }

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
  const opts = options || {};
  const callbacks = opts.callbacks === true; // default false (matches function-exec-sync)
  const useSpawnOptions = opts.spawnOptions !== false; // default true
  const env = opts.env || process.env;

  let initialized = false;
  let currentSatisfies: boolean;
  let cachedExecPath: string | null = null;
  let cachedInstallPath: string | null = null;

  return function boundCaller(...args: unknown[]): unknown {
    const lastArg = args[args.length - 1];
    const hasCallback = typeof lastArg === 'function';

    const execute = (): unknown => {
      if (!initialized) {
        currentSatisfies = version === process.version || semver.satisfies(process.version, version);
        if (!currentSatisfies) {
          const resolved = resolveVersion(version, { env: opts.env });
          cachedExecPath = resolved.execPath;
          cachedInstallPath = resolved.installPath;
        }
        initialized = true;
      }

      if (currentSatisfies && !callbacks) {
        const fn = _require(workerPath);
        return typeof fn === 'function' ? fn.apply(null, args) : fn;
      }

      if (!functionExec) functionExec = _require('function-exec-sync');

      if (currentSatisfies) {
        const PATH_KEY = pathKey();
        if (opts.env && !opts.env[PATH_KEY]) {
          throw new Error(`node-version-call-local: options.env missing required ${PATH_KEY}`);
        }
        const execOptions = { execPath: process.execPath, sleep: SLEEP_MS, callbacks: true, env };
        return functionExec.apply(null, [execOptions, workerPath, ...args]);
      }

      if (useSpawnOptions) {
        const execOptions = spawnOptions(cachedInstallPath, { execPath: cachedExecPath, sleep: SLEEP_MS, callbacks, env } as SpawnOptions);
        return functionExec.apply(null, [execOptions, workerPath, ...args]);
      }

      const execOptions = { execPath: cachedExecPath, sleep: SLEEP_MS, callbacks, env };
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
