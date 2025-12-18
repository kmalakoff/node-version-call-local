import Module from 'module';
import type { satisfiesSemverSyncOptions } from 'node-exec-path';
import path from 'path';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE || '');

let satisfiesSemverSync: (version: string, options?: satisfiesSemverSyncOptions) => string | null = null;

export type ResolvedVersion = { execPath: string; installPath: string };
export type ResolveOptions = { env?: NodeJS.ProcessEnv };

export default function resolveVersion(version: string, options?: ResolveOptions): ResolvedVersion {
  if (!satisfiesSemverSync) satisfiesSemverSync = _require('node-exec-path').satisfiesSemverSync;
  const opts = options?.env ? { env: options.env } : {};
  const execPath = satisfiesSemverSync(version, opts);
  if (!execPath) throw new Error(`node-version-call-local: No Node matching "${version}" found in PATH`);
  const installPath = isWindows ? path.join(execPath, '..') : path.join(execPath, '..', '..');
  return { execPath, installPath };
}
