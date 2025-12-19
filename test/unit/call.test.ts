// remove NODE_OPTIONS to not interfere with tests
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import pathKey from 'env-path-key';
import keys from 'lodash.keys';
import call, { callSync } from 'node-version-call-local';
import path from 'path';
import Pinkie from 'pinkie-promise';
import semver from 'semver';
import url from 'url';

// Promise polyfill for old Node versions
(() => {
  if (typeof global === 'undefined') return;
  const globalPromise = global.Promise;
  before(() => {
    global.Promise = Pinkie;
  });
  after(() => {
    global.Promise = globalPromise;
  });
})();

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

// Versions that should exist in PATH or match current process
const versions = [process.version, '>0', '>=14'];

function addTests(fn: (version: string) => () => void) {
  for (let i = 0; i < versions.length; i++) {
    it(`works with version ${versions[i]}`, fn(versions[i]));
  }
}

function addAsyncTests(fn: (version: string) => () => Promise<void>) {
  for (let i = 0; i < versions.length; i++) {
    it(`works with version ${versions[i]}`, fn(versions[i]));
  }
}

describe('callSync', () => {
  describe('no export', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'noExport.cjs');
      const result = callSync(version, fnPath, {});
      assert.equal(keys(result).length, 0);
    });
  });

  describe('process version', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const result = callSync(version, fnPath, {}) as string;
      assert.equal(result[0], 'v');
      // Verify version satisfies the constraint
      assert.ok(semver.satisfies(result, version), `${result} should satisfy ${version}`);
    });
  });

  describe('return arguments', () => {
    addTests((version) => () => {
      const major = version.indexOf('.') >= 0 ? +version.split('.')[0] : +process.versions.node.split('.')[0];

      const args = [
        { field2: 1 },
        1,
        function hey() {
          return null;
        },
        major > 0 ? [typeof URL === 'undefined' ? null : new URL('https://hello.com'), typeof Map === 'undefined' ? null : new Map(), typeof Set === 'undefined' ? null : new Set()] : [],
      ];
      const fnPath = path.join(DATA, 'returnArguments.cjs');
      const result = callSync(version, fnPath, {}, ...args);
      assert.equal(JSON.stringify(result), JSON.stringify(args));
    });
  });

  describe('throw error', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'throwError.cjs');
      try {
        callSync(version, fnPath, {});
        assert.ok(false);
      } catch (err) {
        assert.equal((err as Error).message, 'boom');
      }
    });
  });

  describe('error on version not found', () => {
    it('throws when no matching Node in PATH', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      try {
        callSync('>=9999', fnPath, {});
        assert.ok(false, 'Should have thrown');
      } catch (err) {
        assert.ok((err as Error).message.indexOf('No Node matching') >= 0);
      }
    });
  });

  describe('spawnOptions', () => {
    it('defaults spawnOptions to true', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const result = callSync(process.version, fnPath, {}) as string;
      assert.equal(result, process.version);
    });

    it('works with spawnOptions: false', () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const result = callSync(process.version, fnPath, { spawnOptions: false }) as string;
      assert.equal(result, process.version);
    });

    it('spawnOptions ensures child processes use correct Node version', () => {
      const fnPath = path.join(DATA, 'childProcessVersion.cjs');
      // Run with version different from current process
      const result = callSync('>0', fnPath, {}) as { workerVersion: string; childVersion: string };
      // Worker and child should both be same version
      assert.equal(result.workerVersion, result.childVersion);
      // Verify version satisfies the constraint
      assert.ok(semver.satisfies(result.workerVersion, '>0'), `${result.workerVersion} should satisfy >0`);
    });
  });

  describe('callbacks option (worker uses callback style)', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'callbacks.cjs');
      // Worker uses callback style internally, but callSync returns sync
      const result = callSync(version, fnPath, { callbacks: true }, 'arg1');
      assert.equal(result, 'arg1');
    });
  });
});

describe('call (async)', () => {
  describe('with callback', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      let called = false;
      call(version, fnPath, {}, (err: unknown, result: unknown) => {
        called = true;
        assert.equal(err, null);
        assert.equal((result as string)[0], 'v');
        assert.ok(semver.satisfies(result as string, version), `${result} should satisfy ${version}`);
      });
      assert.equal(called, true);
    });
  });

  describe('with Promise', () => {
    addAsyncTests((version) => async () => {
      const fnPath = path.join(DATA, 'processVersion.cjs');
      const result = (await call(version, fnPath, {})) as string;
      assert.equal(result[0], 'v');
      assert.ok(semver.satisfies(result, version), `${result} should satisfy ${version}`);
    });
  });

  describe('callback with error', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'throwError.cjs');
      let called = false;
      call(version, fnPath, {}, (err: unknown, result: unknown) => {
        called = true;
        assert.ok(err);
        assert.equal((err as Error).message, 'boom');
        assert.equal(result, undefined);
      });
      assert.equal(called, true);
    });
  });

  describe('Promise with error', () => {
    addAsyncTests((version) => async () => {
      const fnPath = path.join(DATA, 'throwError.cjs');
      try {
        await call(version, fnPath, {});
        assert.ok(false, 'Should have thrown');
      } catch (err) {
        assert.equal((err as Error).message, 'boom');
      }
    });
  });

  describe('env passing with callback', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'envCheck.cjs');
      const PATH_KEY = pathKey();
      let called = false;
      // envCheck.cjs worker uses callback style, so we need callbacks: true
      call(version, fnPath, { callbacks: true, env: { TEST_ENV_VAR: 'passed', [PATH_KEY]: process.env[PATH_KEY] } }, (err: unknown, result: unknown) => {
        called = true;
        assert.equal(err, null);
        assert.equal(result, 'passed');
      });
      assert.equal(called, true);
    });
  });

  describe('callbacks option (worker uses callback style)', () => {
    addTests((version) => () => {
      const fnPath = path.join(DATA, 'callbacks.cjs');
      let called = false;
      // Worker uses callback style, caller uses callback
      call(version, fnPath, { callbacks: true }, 'arg1', (err: unknown, result: unknown) => {
        called = true;
        assert.equal(err, null);
        assert.equal(result, 'arg1');
      });
      assert.equal(called, true);
    });
  });
});
