# node-version-call-local

Call a function in a Node version found in PATH.

This is a lightweight alternative to [node-version-call](https://github.com/kmalakoff/node-version-call) that finds an existing Node in PATH rather than installing one. Use this when you need to execute code in a different Node version without the overhead of installation dependencies.

## Installation

```bash
npm install node-version-call-local
```

## Usage

### Sync API (returns value, throws on error)

```javascript
import { callSync, bindSync } from 'node-version-call-local';

// Immediate call - returns value synchronously
const result = callSync('>0.12', '/path/to/worker.js', {}, arg1, arg2);

// Bound caller for repeated use
const worker = bindSync('>0.12', '/path/to/worker.js', {});
const result1 = worker(arg1);
const result2 = worker(arg2);
```

### Async API (callback or Promise)

```javascript
import call, { bind } from 'node-version-call-local';

// With callback (last argument is function)
call('>0.12', '/path/to/worker.js', {}, arg1, (err, result) => {
  if (err) return console.error(err);
  console.log(result);
});

// With Promise (no callback)
const result = await call('>0.12', '/path/to/worker.js', {}, arg1);

// Bound caller with callback
const worker = bind('>0.12', '/path/to/worker.js', {});
worker(arg1, (err, result) => { /* ... */ });

// Bound caller with Promise
const result = await worker(arg1);
```

## API

### Sync Functions

#### `callSync(version, workerPath, options?, ...args)`

Execute a file synchronously in a Node version found in PATH.

- **version** - Semver constraint (`'>0.12'`, `'>=18'`, `'^16'`) or exact (`'v18.0.0'`)
- **workerPath** - Path to the file to execute
- **options** - Execution options (see below)
- **args** - Arguments to pass to the worker

Returns the result from the worker. Throws on error.

#### `bindSync(version, workerPath, options?)`

Create a bound caller for repeated synchronous use.

Returns a function `(...args) => result` that calls the worker.

### Async Functions

#### `call(version, workerPath, options?, ...args)`

Execute a file asynchronously in a Node version found in PATH.

- If last argument is a function, it's treated as a callback: `(err, result) => void`
- Otherwise, returns a Promise

#### `bind(version, workerPath, options?)`

Create a bound caller for repeated async use.

Returns a function that:
- Takes a callback as last arg: `(...args, callback) => void`
- Or returns a Promise: `(...args) => Promise<result>`

### Options

```typescript
interface CallOptions {
  callbacks?: boolean;      // Worker uses callback style (default: false)
  spawnOptions?: boolean;   // Use spawnOptions for child process env setup (default: true)
  env?: NodeJS.ProcessEnv;  // Environment variables (default: process.env)
}
```

- **callbacks** - Set to `true` if the worker function uses callback style (`fn(...args, callback)`) rather than returning a value or Promise
- **spawnOptions** - When `true`, sets up proper environment (PATH, etc.) so child processes spawned by the worker use the correct Node version
- **env** - Custom environment variables to pass to the worker

## Comparison with node-version-call

| Feature | node-version-call-local | node-version-call |
|---------|---------------------------|-------------------|
| Version not found | **Throws error** | Installs it |
| Dependencies | Lightweight | Heavy (install chain) |
| Version binding | At bind time | At call time |
| Use case | Polyfills, bootstrap code | Testing, exact versions |

## Example: HTTPS polyfill for old Node

```javascript
import { callSync } from 'node-version-call-local';

const major = +process.versions.node.split('.')[0];
const noHTTPS = major === 0;

function fetchFileSync(url) {
  if (noHTTPS) {
    // Current Node can't do HTTPS, find one that can
    return callSync('>0', __filename, {}, url);
  }
  // Modern Node - fetch directly
  return fetchSync(url);
}
```

## Example: Async with Promise

```javascript
import call from 'node-version-call-local';

async function fetchData(url) {
  // Worker uses callback style internally
  const result = await call('>10', '/path/to/worker.js', { callbacks: true }, url);
  return result;
}
```

## Example: npm install polyfill

```javascript
import { bindSync } from 'node-version-call-local';

const major = +process.versions.node.split('.')[0];

// Worker that runs npm install
const workerPath = path.join(__dirname, 'workers', 'npmInstall.js');

// Need spawnOptions for npm environment
const npmInstall = bindSync('>10', workerPath, { spawnOptions: true });

function install(packageName) {
  if (major > 10) {
    // Current Node is fine
    return runNpmInstall(packageName);
  }
  // Use older Node found in PATH
  return npmInstall(packageName);
}
```

## License

MIT
