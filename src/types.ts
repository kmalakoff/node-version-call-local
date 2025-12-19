/**
 * Options for call/callSync and bind/bindSync functions.
 */
export type CallOptions = {
  /** Worker uses callback style (fn(...args, callback)) rather than returning value/Promise */
  callbacks?: boolean;
  /** Apply spawn options for child process env setup (default: true) */
  spawnOptions?: boolean;
  /** Environment variables (default: process.env) */
  env?: NodeJS.ProcessEnv;
};

/**
 * Options for bind/bindSync functions.
 */
export type BindOptions = CallOptions;

/**
 * Callback function signature for caller callbacks.
 */
export type CallerCallback = (err: unknown, result?: unknown) => void;

/**
 * Function returned by bindSync that calls the worker synchronously.
 */
export type BoundSyncCaller = (...args: unknown[]) => unknown;

/**
 * Function returned by bind that calls the worker with callback or Promise.
 */
export type BoundAsyncCaller = (...args: unknown[]) => unknown;

/**
 * @deprecated Use BoundSyncCaller or BoundAsyncCaller instead
 */
export type BoundCaller = BoundSyncCaller;
