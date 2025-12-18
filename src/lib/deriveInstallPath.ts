import path from 'path';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE || '');

/**
 * Derive the Node installation path from the execPath.
 * Windows: node.exe is in the install root
 * Unix: node is in <install>/bin/
 */
export default function deriveInstallPath(execPath: string): string {
  return isWindows ? path.join(execPath, '..') : path.join(execPath, '..', '..');
}
