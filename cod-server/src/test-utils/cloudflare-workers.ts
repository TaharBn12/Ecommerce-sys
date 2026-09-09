/**
 * Test stub for the `cloudflare:workers` runtime module, which does not exist
 * under Node. Vitest aliases `cloudflare:workers` to this file so packages
 * that extend `WorkerEntrypoint` or `WorkflowEntrypoint` can be imported in unit tests.
 */
export class WorkerEntrypoint {}

export class WorkflowEntrypoint<Env = any, Params = any> {
  env: Env;
  ctx: any;
  constructor(ctx: any, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}

export interface WorkflowEvent<T = any> {
  payload: T;
  instanceId?: string;
  timestamp?: Date;
}

export interface WorkflowStep {
  do<R>(name: string, callbackOrConfig: any, callback?: () => Promise<R>): Promise<R>;
  sleep(name: string, duration: string | number): Promise<void>;
  sleepUntil(name: string, timestamp: Date | number): Promise<void>;
}
