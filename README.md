# node-version-call-local

Call a function in a Node version found in PATH.

This is a lightweight alternative to [node-version-call](https://github.com/kmalakoff/node-version-call) that finds an existing Node in PATH rather than installing one. Use this when you need to execute code in a different Node version without the overhead of installation dependencies.

## Installation

```bash
npm install node-version-call-local
```

## Usage

### Immediate call

```javascript
import call from 'node-version-call-local';

// Call a worker in any Node > 0.12 found in PATH
const result = call('>0.12', '/path/to/worker.js', { callbacks: true }, arg1, arg2);
```

### Bound caller (for repeated calls)

```javascript
import { bind } from 'node-version-call-local';

// Create a bound caller
const worker = bind('>0.12', '/path/to/worker.js', { callbacks: true });

// Call it multiple times
worker(arg1, callback);
worker(arg2, callback);
```

## API

### `call(version, workerPath, options?, ...args)`

Execute a file in a Node version found in PATH.

- **version** - Semver constraint (`'>0.12'`, `'>=18'`, `'^16'`) or exact (`'v18.0.0'`)
- **workerPath** - Path to the file to execute
- **options** - Execution options (see below)
- **args** - Arguments to pass to the worker

Returns the result from the worker.

### `bind(version, workerPath, options?)`

Create a bound caller for repeated use.

- **version** - Semver constraint or exact version
- **workerPath** - Path to the file to execute
- **options** - Execution options (see below)

Returns a function `(...args) => result` that calls the worker.

### Options

```typescript
interface CallOptions {
  callbacks?: boolean;      // Enable callback serialization (default: true)
  spawnOptions?: boolean;   // Use spawnOptions for npm env setup (default: false)
  env?: NodeJS.ProcessEnv;  // Environment variables (default: process.env)
}
```

- **callbacks** - When `true`, the worker can use callbacks that get serialized across the process boundary
- **spawnOptions** - When `true`, sets up proper npm environment (PATH, npm_* vars) for running npm commands
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
import { call } from 'node-version-call-local';

const major = +process.versions.node.split('.')[0];
const noHTTPS = major === 0;

function fetchFile(url, callback) {
  if (noHTTPS) {
    // Current Node can't do HTTPS, find one that can
    try {
      const result = call('>0', __filename, { callbacks: true }, url);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
    return;
  }

  // Modern Node - fetch directly
  https.get(url, callback);
}
```

## Example: npm install polyfill

```javascript
import { bind } from 'node-version-call-local';

const major = +process.versions.node.split('.')[0];

// Worker that runs npm install
const workerPath = path.join(__dirname, 'workers', 'npmInstall.js');

// Need spawnOptions for npm environment
const npmInstall = bind('>10', workerPath, { callbacks: true, spawnOptions: true });

function install(packageName, callback) {
  if (major > 10) {
    // Current Node is fine
    runNpmInstall(packageName, callback);
    return;
  }

  // Use older Node found in PATH
  npmInstall(packageName, callback);
}
```

## License

MIT
