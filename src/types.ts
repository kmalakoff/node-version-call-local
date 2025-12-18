export type CallOptions = {
  callbacks?: boolean;
  spawnOptions?: boolean;
  env?: NodeJS.ProcessEnv;
};

export type BindOptions = CallOptions;

export type CallerCallback = (err: unknown, result?: unknown) => void;

export type BoundCaller = (...args: unknown[]) => unknown;
