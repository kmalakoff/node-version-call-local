# node-version-call-local

Call a worker function with a Node.js version already available in `PATH`. It does not install Node.js versions. Use `node-version-call` when installation is required.

## Install

```bash
npm install node-version-call-local
```

## Worker

The worker file must export a function. For example, `worker.cjs` can contain:

```js
module.exports = function (value) {
  return process.version + ': ' + value;
};
```

## Usage

```js
import { fileURLToPath } from 'url';
import { bindSync, bind } from 'node-version-call-local';

const workerPath = fileURLToPath(new URL('./worker.cjs', import.meta.url));

const syncWorker = bindSync(process.version, workerPath);
console.log(syncWorker('sync'));

const asyncWorker = bind(process.version, workerPath);
console.log(await asyncWorker('async'));

asyncWorker('callback', (err, result) => {
  if (err) throw err;
  console.log(result);
});
```

Use `callSync(version, workerPath, options?, ...args)` or `call(version, workerPath, options?, ...args)` for one-off calls. The version is a semver constraint such as `'>=18'`, `'^16'`, or `'v18.0.0'`. If no matching Node executable is available in `PATH`, the call fails.

## API

- `bindSync(version, workerPath, options?)` returns a synchronous caller. It throws worker errors.
- `bind(version, workerPath, options?)` returns a caller that supports a callback or a Promise.
- `callSync(version, workerPath, options?, ...args)` performs one synchronous call.
- `call(version, workerPath, options?, ...args)` performs one callback or Promise call.

`options.callbacks: true` tells the library that the worker expects `fn(...args, callback)` instead of returning a value or Promise. `spawnOptions` defaults to `true` and updates the child process environment so nested commands use the selected Node installation. Use `env` for custom environment variables, `moduleType` to select module detection, and `interop` to control ESM default-export handling.
