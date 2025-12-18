// remove NODE_OPTIONS to not interfere with tests
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import pathKey from 'env-path-key';
import { bind } from 'node-version-call-local';
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

describe('bind', () => {
  describe('returns a callable function', () => {
    it('returns a function', () => {
      const fnPath = path.join(DATA, 'returnArguments.cjs');
      const worker = bind(process.version, fnPath);
      assert.equal(typeof worker, 'function');
    });
  });

  describe('local execution (current process version)', () => {
    it('calls the worker with arguments', () => {
      const fnPath = path.join(DATA, 'returnArguments.cjs');
      const worker = bind(process.version, fnPath, { callbacks: false });
      const result = worker('arg1', 'arg2');
      assert.deepEqual(result, ['arg1', 'arg2']);
    });
  });

  describe('execution with callbacks', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'callbacks.cjs');
      const PATH_KEY = pathKey();
      const worker = bind(version, fnPath, { callbacks: true, env: { [PATH_KEY]: process.env[PATH_KEY] } });

      let called = false;
      worker('test-value', (err: unknown, res: unknown) => {
        called = true;
        assert.equal(err, null);
        assert.equal(res, 'test-value');
      });
      assert.equal(called, true);
    });
  });

  describe('error handling', () => {
    it('passes errors to callback', () => {
      const fnPath = path.join(DATA, 'throwError.cjs');
      const worker = bind(process.version, fnPath, { callbacks: false });

      let errorCaught = false;
      worker((err: unknown) => {
        errorCaught = true;
        assert.ok(err);
        assert.equal((err as Error).message, 'boom');
      });
      assert.equal(errorCaught, true);
    });

    it('throws when no matching Node in PATH', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const worker = bind('>=9999', fnPath, { callbacks: false });

      let errorCaught = false;
      worker((err: unknown) => {
        errorCaught = true;
        assert.ok(err);
        assert.ok((err as Error).message.indexOf('No Node matching') >= 0);
      });
      assert.equal(errorCaught, true);
    });
  });

  describe('default options', () => {
    it('defaults callbacks to false', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const worker = bind(process.version, fnPath);
      const result = worker() as string;
      assert.equal(result[0], 'v');
    });

    it('defaults env to process.env', () => {
      const fnPath = path.join(DATA, 'envCheckSync.cjs');
      process.env.TEST_ENV_VAR = 'from-process-env';
      const worker = bind(process.version, fnPath);
      const result = worker() as string;
      assert.equal(result, 'from-process-env');
      delete process.env.TEST_ENV_VAR;
    });
  });

  describe('spawnOptions', () => {
    it('works with spawnOptions: true', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const worker = bind(process.version, fnPath, { callbacks: false, spawnOptions: true });
      const result = worker() as string;
      assert.equal(result[0], 'v');
    });
  });

  describe('version is bound at bind time', () => {
    it('does not require version at call time', () => {
      const fnPath = path.join(DATA, 'returnArguments.cjs');
      // Version bound at bind time
      const worker = bind(process.version, fnPath, { callbacks: false });
      // No version passed at call time
      const result = worker('only', 'args');
      assert.deepEqual(result, ['only', 'args']);
    });
  });
});
