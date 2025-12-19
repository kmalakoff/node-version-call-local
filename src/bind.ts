import pathKey from 'env-path-key';
import type functionExecSync from 'function-exec-sync';
import Module from 'module';
import { loadModuleSync } from 'module-compat';
import { type SpawnOptions, spawnOptions } from 'node-version-utils';
import semver from 'semver';

import resolveVersion from './lib/resolveVersion.ts';
import type { BindOptions, BoundAsyncCaller, CallerCallback } from './types.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const SLEEP_MS = 60;

/**
 * Create a bound async caller for a specific version and worker.
 * Looks up the execPath ONCE on first call (lazy) and caches it.
 *
 * @param version - Semver constraint ('>0.12', '>=18', '^16') or exact ('v18.0.0')
 * @param workerPath - Path to the file to execute
 * @param options - Execution options
 * @returns A function that calls the worker with callback or Promise
 */
let functionExec: typeof functionExecSync = null;
export default function bind(version: string, workerPath: string, options?: BindOptions): BoundAsyncCaller {
  const opts = options || {};
  const callbacks = opts.callbacks;
  const useSpawnOptions = opts.spawnOptions !== false; // default true
  const env = opts.env || process.env;
  const moduleType = opts.moduleType || 'auto';
  const interop = opts.interop || 'default';

  let initialized = false;
  let currentSatisfies: boolean;
  let cachedExecPath: string | null = null;
  let cachedInstallPath: string | null = null;

  return function boundAsyncCaller(...args: unknown[]): unknown {
    // Detect callback vs Promise mode (Node convention)
    const lastArg = args[args.length - 1];
    const isCallbackMode = typeof lastArg === 'function';
    const callback = isCallbackMode ? (args.pop() as CallerCallback) : null;

    const execute = (): unknown => {
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
          const execOptions = { execPath: process.execPath, sleep: SLEEP_MS, callbacks, env, moduleType, interop };
          return functionExec.apply(null, [execOptions, workerPath, ...args]);
        }
        // Use loadModuleSync for ESM support
        const fn = loadModuleSync(workerPath, { moduleType, interop });
        return typeof fn === 'function' ? fn.apply(null, args) : fn;
      }

      // Remote execution - spawn child process
      if (!functionExec) functionExec = _require('function-exec-sync');

      if (useSpawnOptions) {
        const execOptions = spawnOptions(cachedInstallPath, { execPath: cachedExecPath, sleep: SLEEP_MS, callbacks, env, moduleType, interop } as SpawnOptions);
        return functionExec.apply(null, [execOptions, workerPath, ...args]);
      }

      const execOptions = { execPath: cachedExecPath, sleep: SLEEP_MS, callbacks, env, moduleType, interop };
      return functionExec.apply(null, [execOptions, workerPath, ...args]);
    };

    // Callback mode
    if (callback) {
      try {
        const result = execute();
        callback(null, result);
        return undefined;
      } catch (err) {
        callback(err);
        return undefined;
      }
    }

    // Promise mode
    return new Promise((resolve, reject) => {
      try {
        const result = execute();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  };
}
