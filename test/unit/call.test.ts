// remove NODE_OPTIONS to not interfere with tests
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import pathKey from 'env-path-key';
import keys from 'lodash.keys';
import call from 'node-version-call-local';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

// Versions that should exist in PATH or match current process
const versions = [process.version, '>0', '>=14'];

function addTests(fn: (version: string) => () => void) {
  for (let i = 0; i < versions.length; i++) {
    it(`works with version ${versions[i]}`, fn(versions[i]));
  }
}

describe('call', () => {
  describe('callbacks', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'callbacks.cjs');
      const result = call(version, fnPath, { callbacks: true }, 'arg1');
      assert.equal(result, 'arg1');
    });
  });

  describe('no export', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'noExport.cjs');
      const result = call(version, fnPath, { callbacks: false });
      assert.equal(keys(result).length, 0);
    });
  });

  describe('process version', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const result = call(version, fnPath, { callbacks: false }) as string;
      assert.equal(result[0], 'v');
    });
  });

  describe('return arguments', () => {
    addTests((version) => () => {
      const args = [
        { field2: 1 },
        1,
        function hey() {
          return null;
        },
        [typeof URL === 'undefined' ? null : new URL('https://hello.com'), typeof Map === 'undefined' ? null : new Map(), typeof Set === 'undefined' ? null : new Set()],
      ];
      const fnPath = path.join(DATA, 'returnArguments.cjs');
      const result = call(version, fnPath, { callbacks: false }, ...args);
      assert.equal(JSON.stringify(result), JSON.stringify(args));
    });
  });

  describe('throw error', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'throwError.cjs');
      try {
        call(version, fnPath, { callbacks: false });
        assert.ok(false);
      } catch (err) {
        assert.equal((err as Error).message, 'boom');
      }
    });
  });

  describe('env passing', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'envCheck.cjs');
      const PATH_KEY = pathKey();
      const result = call(version, fnPath, { callbacks: true, env: { TEST_ENV_VAR: 'passed', [PATH_KEY]: process.env[PATH_KEY] } });
      assert.equal(result, 'passed');
    });
  });

  describe('error on version not found', () => {
    it('throws when no matching Node in PATH', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      try {
        call('>=9999', fnPath, { callbacks: false });
        assert.ok(false, 'Should have thrown');
      } catch (err) {
        assert.ok((err as Error).message.indexOf('No Node matching') >= 0);
      }
    });
  });

  describe('spawnOptions', () => {
    it('works with spawnOptions: true', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const result = call(process.version, fnPath, { callbacks: false, spawnOptions: true }) as string;
      assert.equal(result[0], 'v');
    });

    it('works with spawnOptions: false (default)', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const result = call(process.version, fnPath, { callbacks: false }) as string;
      assert.equal(result[0], 'v');
    });
  });
});
