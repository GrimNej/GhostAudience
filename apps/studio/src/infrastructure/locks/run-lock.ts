import type { GhostAudienceDatabase } from "../db/database";

export class RunAlreadyActiveError extends Error {
  public constructor(public readonly runId: string) {
    super(`Analysis run ${runId} is active in another tab.`);
    this.name = "RunAlreadyActiveError";
  }
}

export interface RunExecutionLease {
  readonly signal: AbortSignal;
  readonly fence: number;
}

const LEASE_MS = 30_000;
const HEARTBEAT_MS = 5_000;

export class RunLockManager {
  public constructor(
    private readonly db: GhostAudienceDatabase,
    private readonly tabId: string,
  ) {}

  public async withExclusiveRunLock<T>(
    runId: string,
    task: (lease: RunExecutionLease) => Promise<T>,
  ): Promise<T> {
    if ("locks" in navigator) {
      return navigator.locks.request(
        `analysis-run:${runId}`,
        { mode: "exclusive", ifAvailable: true },
        async (lock) => {
          if (lock === null) throw new RunAlreadyActiveError(runId);
          return this.withFencedLease(runId, task);
        },
      );
    }
    return this.withFencedLease(runId, task);
  }

  private async withFencedLease<T>(
    runId: string,
    task: (lease: RunExecutionLease) => Promise<T>,
  ): Promise<T> {
    const fence = await this.acquire(runId);
    const controller = new AbortController();
    const heartbeat = setInterval(() => {
      void this.heartbeat(runId, fence).catch((error: unknown) =>
        controller.abort(error),
      );
    }, HEARTBEAT_MS);

    try {
      return await task({ signal: controller.signal, fence });
    } finally {
      clearInterval(heartbeat);
      await this.release(runId, fence);
    }
  }

  private async acquire(runId: string): Promise<number> {
    const now = Date.now();
    return this.db.transaction("rw", [this.db.runLeases, this.db.runs], async () => {
      const current = await this.db.runLeases.get(runId);
      if (
        current !== undefined &&
        current.expiresAtEpochMs > now &&
        current.ownerTabId !== this.tabId
      ) {
        throw new RunAlreadyActiveError(runId);
      }
      const run = await this.db.runs.get(runId);
      if (run === undefined) throw new Error(`Run ${runId} does not exist.`);
      const fence = Math.max(current?.fence ?? 0, run.activeFence) + 1;
      await this.db.runLeases.put({
        runId,
        ownerTabId: this.tabId,
        fence,
        heartbeatAtEpochMs: now,
        expiresAtEpochMs: now + LEASE_MS,
      });
      await this.db.runs.update(runId, { activeFence: fence });
      return fence;
    });
  }

  private async heartbeat(runId: string, fence: number): Promise<void> {
    const now = Date.now();
    await this.db.transaction("rw", this.db.runLeases, async () => {
      const lease = await this.db.runLeases.get(runId);
      if (
        lease === undefined ||
        lease.ownerTabId !== this.tabId ||
        lease.fence !== fence
      ) {
        throw new Error("Run lease fence was lost.");
      }
      await this.db.runLeases.put({
        ...lease,
        heartbeatAtEpochMs: now,
        expiresAtEpochMs: now + LEASE_MS,
      });
    });
  }

  private async release(runId: string, fence: number): Promise<void> {
    await this.db.transaction("rw", this.db.runLeases, async () => {
      const lease = await this.db.runLeases.get(runId);
      if (lease?.ownerTabId === this.tabId && lease.fence === fence)
        await this.db.runLeases.delete(runId);
    });
  }
}
