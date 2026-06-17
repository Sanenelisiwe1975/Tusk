import { createHash, randomUUID } from "node:crypto";
import { bcs } from "@mysten/sui/bcs";
import type { EventId, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import type { WalrusStoreConfig } from "./config";
import { hashPayload } from "./hash";
import type { MemoryStore } from "./store";
import type {
  AgentId,
  BlobId,
  CreateTaskInput,
  EntryId,
  Hash,
  ListFilter,
  MemoryEntry,
  Namespace,
  Payload,
  TaskFilter,
  TaskId,
  TaskRecord,
  VerifyResult,
  WriteInput,
} from "./types";

type Listener = (entry: MemoryEntry) => void;

/// JSON blob stored in Walrus for a memory entry. The on-chain anchor's hash
/// is `hashPayload(payload)`, so verify() can recompute it from this blob's
/// `payload` field alone.
interface EntryEnvelope {
  namespace: Namespace;
  author: AgentId;
  payload: Payload;
  parentId?: EntryId;
  createdAt: number;
}

/// `EntryAnchored` event fields as returned by `parsedJson`.
interface ParsedEntryAnchored {
  namespace: string;
  entry_id: string;
  blob_id: string;
  hash: number[];
  author: string;
  created_at: string;
}

type WalrusPutResponse =
  | { newlyCreated: { blobObject: { blobId: string } } }
  | { alreadyCertified: { blobId: string } };

const TASK_ANCHOR_PREFIX = "task:";
const EVENT_PAGE_SIZE = 50;
const WATCH_POLL_INTERVAL_MS = 3000;

/// Walrus + Sui backed MemoryStore. Memory entries and task companion records
/// are stored as JSON blobs in Walrus; their content hashes are anchored on
/// Sui via the `registry` package, which also provides the event log that
/// list(), listTasks(), and watch() read from. The `task` package tracks task
/// status transitions as on-chain objects/events alongside the companion blobs.
export class WalrusStore implements MemoryStore {
  private readonly client: SuiClient;
  private readonly config: WalrusStoreConfig;
  private readonly namespacePrefix: string;
  private readonly watchers = new Map<Namespace, Set<Listener>>();
  private readonly notified = new Set<EntryId>();
  private executionQueue: Promise<unknown> = Promise.resolve();

  constructor(config: WalrusStoreConfig) {
    this.config = config;
    this.namespacePrefix = config.namespacePrefix ?? "";
    this.client = new SuiClient({ url: config.rpcUrl, network: config.network });
  }

  async write(input: WriteInput): Promise<MemoryEntry> {
    const id: EntryId = `entry-${randomUUID()}`;
    const createdAt = Date.now();
    const hash = hashPayload(input.payload);

    // Mark as notified before the anchor tx is submitted: watch()'s
    // background poller can otherwise observe this entry's EntryAnchored
    // event (and notify for it) before this function reaches its own
    // notify() call below, double-notifying listeners.
    this.notified.add(id);

    const envelope: EntryEnvelope = {
      namespace: input.namespace,
      author: input.author,
      payload: input.payload,
      createdAt,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    };

    const blobId = await this.putBlob(JSON.stringify(envelope));

    const tx = new Transaction();
    this.addAnchorEntryCall(tx, this.onChainNamespace(input.namespace), id, blobId, hash);
    await this.execute(tx);

    const entry: MemoryEntry = {
      id,
      namespace: input.namespace,
      author: input.author,
      kind: input.payload.kind,
      payload: input.payload,
      blobId,
      hash,
      createdAt,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    };

    this.notify(entry);
    return entry;
  }

  async read(id: EntryId): Promise<MemoryEntry | null> {
    const anchor = await this.getAnchor(id);
    if (!anchor) return null;

    const envelope = await this.getEntryEnvelope(anchor.blobId);
    return {
      id,
      namespace: envelope.namespace,
      author: envelope.author,
      kind: envelope.payload.kind,
      payload: envelope.payload,
      blobId: anchor.blobId,
      hash: anchor.hash,
      createdAt: envelope.createdAt,
      ...(envelope.parentId !== undefined ? { parentId: envelope.parentId } : {}),
    };
  }

  async list(filter: ListFilter = {}): Promise<MemoryEntry[]> {
    const onChainNamespace = filter.namespace !== undefined ? this.onChainNamespace(filter.namespace) : undefined;
    const events = await this.queryEntryAnchored();

    const candidates = events.filter(
      (event) =>
        !event.entry_id.startsWith(TASK_ANCHOR_PREFIX) &&
        (onChainNamespace === undefined || event.namespace === onChainNamespace),
    );

    let results = await Promise.all(candidates.map((event) => this.toMemoryEntry(event)));

    if (filter.author !== undefined) {
      results = results.filter((entry) => entry.author === filter.author);
    }
    if (filter.kind !== undefined) {
      results = results.filter((entry) => entry.kind === filter.kind);
    }
    if (filter.parentId !== undefined) {
      results = results.filter((entry) => entry.parentId === filter.parentId);
    }
    if (filter.since !== undefined) {
      results = results.filter((entry) => entry.createdAt >= filter.since!);
    }

    results = results.sort((a, b) => a.createdAt - b.createdAt);

    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  async search(namespace: Namespace, query: string, limit?: number): Promise<MemoryEntry[]> {
    const needle = query.toLowerCase();

    const matches = (await this.list({ namespace }))
      .filter((entry) => JSON.stringify(entry.payload).toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt - a.createdAt);

    return limit !== undefined ? matches.slice(0, limit) : matches;
  }

  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const createTx = new Transaction();
    createTx.moveCall({
      package: this.config.packageId,
      module: "task",
      function: "create_task",
      arguments: [
        createTx.pure.string(this.onChainNamespace(input.namespace)),
        createTx.pure.string(input.parentId ?? ""),
        createTx.pure.string(input.description),
      ],
    });

    const created = await this.execute(createTx);
    const taskId = findCreatedObjectId(created, `${this.config.packageId}::task::Task`);

    const now = Date.now();
    const task: TaskRecord = {
      id: taskId,
      namespace: input.namespace,
      description: input.description,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    };

    const anchorTx = new Transaction();
    await this.addTaskAnchorCall(anchorTx, task, 0);
    await this.execute(anchorTx);

    return task;
  }

  async claimTask(taskId: TaskId, agentId: AgentId): Promise<TaskRecord> {
    const { record, revision } = await this.requireTaskRecord(taskId);
    const updated: TaskRecord = { ...record, status: "claimed", claimedBy: agentId, updatedAt: Date.now() };

    const tx = new Transaction();
    tx.moveCall({
      package: this.config.packageId,
      module: "task",
      function: "claim_task",
      arguments: [tx.object(taskId), tx.pure.address(this.address())],
    });
    await this.addTaskAnchorCall(tx, updated, revision + 1);
    await this.execute(tx);

    return updated;
  }

  async completeTask(taskId: TaskId, resultId: EntryId): Promise<TaskRecord> {
    const { record, revision } = await this.requireTaskRecord(taskId);
    const updated: TaskRecord = { ...record, status: "done", resultId, updatedAt: Date.now() };

    const tx = new Transaction();
    tx.moveCall({
      package: this.config.packageId,
      module: "task",
      function: "complete_task",
      arguments: [tx.object(taskId), tx.pure.string(resultId)],
    });
    await this.addTaskAnchorCall(tx, updated, revision + 1);
    await this.execute(tx);

    return updated;
  }

  async failTask(taskId: TaskId, error: string): Promise<TaskRecord> {
    const { record, revision } = await this.requireTaskRecord(taskId);
    const updated: TaskRecord = { ...record, status: "failed", error, updatedAt: Date.now() };

    const tx = new Transaction();
    tx.moveCall({
      package: this.config.packageId,
      module: "task",
      function: "fail_task",
      arguments: [tx.object(taskId), tx.pure.string(error)],
    });
    await this.addTaskAnchorCall(tx, updated, revision + 1);
    await this.execute(tx);

    return updated;
  }

  async listTasks(filter: TaskFilter = {}): Promise<TaskRecord[]> {
    const onChainNamespace = filter.namespace !== undefined ? this.onChainNamespace(filter.namespace) : undefined;
    const events = await this.queryEntryAnchored();

    const latestByTask = new Map<TaskId, { revision: number; blobId: BlobId; namespace: string }>();
    for (const event of events) {
      if (!event.entry_id.startsWith(TASK_ANCHOR_PREFIX)) continue;
      if (onChainNamespace !== undefined && event.namespace !== onChainNamespace) continue;

      const rest = event.entry_id.slice(TASK_ANCHOR_PREFIX.length);
      const separator = rest.lastIndexOf(":");
      const taskId = rest.slice(0, separator);
      const revision = Number(rest.slice(separator + 1));

      const existing = latestByTask.get(taskId);
      if (!existing || revision > existing.revision) {
        latestByTask.set(taskId, { revision, blobId: event.blob_id, namespace: event.namespace });
      }
    }

    let results = await Promise.all(
      Array.from(latestByTask.values()).map(async (entry) => this.getTaskRecord(entry.blobId)),
    );

    if (filter.status !== undefined) {
      results = results.filter((task) => task.status === filter.status);
    }

    return results.sort((a, b) => a.createdAt - b.createdAt);
  }

  async verify(id: EntryId): Promise<VerifyResult> {
    const entry = await this.read(id);
    if (!entry) throw new Error(`Unknown entry: ${id}`);

    const localHash = hashPayload(entry.payload);
    const anchoredHash = entry.hash;
    return { ok: localHash === anchoredHash, localHash, anchoredHash };
  }

  watch(namespace: Namespace, listener: Listener): () => void {
    const listeners = this.watchers.get(namespace) ?? new Set<Listener>();
    listeners.add(listener);
    this.watchers.set(namespace, listeners);

    let stopped = false;
    let timer: NodeJS.Timeout | undefined;
    let cursor: EventId | null | undefined;

    const poll = async () => {
      if (stopped) return;
      try {
        const onChainNamespace = this.onChainNamespace(namespace);
        const page = await this.client.queryEvents({
          query: { MoveEventType: `${this.config.packageId}::registry::EntryAnchored` },
          cursor,
          order: "ascending",
          limit: EVENT_PAGE_SIZE,
        });

        for (const event of page.data) {
          cursor = event.id;
          const parsed = event.parsedJson as ParsedEntryAnchored;
          if (parsed.namespace !== onChainNamespace) continue;
          if (parsed.entry_id.startsWith(TASK_ANCHOR_PREFIX)) continue;
          if (this.notified.has(parsed.entry_id)) continue;

          this.notified.add(parsed.entry_id);
          const entry = await this.toMemoryEntry(parsed);
          if (!stopped) listener(entry);
        }
      } catch {
        // Best-effort polling; retry on the next tick.
      } finally {
        if (!stopped) {
          timer = setTimeout(poll, WATCH_POLL_INTERVAL_MS);
          timer.unref?.();
        }
      }
    };

    // Seed the cursor to "now" so polling doesn't replay history written
    // before watch() was called, then start polling.
    void this.client
      .queryEvents({
        query: { MoveEventType: `${this.config.packageId}::registry::EntryAnchored` },
        order: "descending",
        limit: 1,
      })
      .then((page) => {
        if (stopped) return;
        cursor = page.data[0]?.id ?? null;
        timer = setTimeout(poll, WATCH_POLL_INTERVAL_MS);
        timer.unref?.();
      })
      .catch(() => {
        if (stopped) return;
        timer = setTimeout(poll, WATCH_POLL_INTERVAL_MS);
        timer.unref?.();
      });

    return () => {
      listeners.delete(listener);
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }

  // -- internals -------------------------------------------------------------

  private address(): string {
    return this.config.signer.toSuiAddress();
  }

  /// Prefixes a caller-facing namespace for on-chain storage so multiple
  /// WalrusStore instances (e.g. one per test) can share a registry without
  /// their entries colliding. MemoryEntry/TaskRecord namespaces always stay
  /// as the caller-facing value, read back from the blob envelope.
  private onChainNamespace(namespace: Namespace): string {
    return this.namespacePrefix ? `${this.namespacePrefix}::${namespace}` : namespace;
  }

  private notify(entry: MemoryEntry): void {
    for (const listener of this.watchers.get(entry.namespace) ?? []) {
      listener(entry);
    }
  }

  private async toMemoryEntry(event: ParsedEntryAnchored): Promise<MemoryEntry> {
    const envelope = await this.getEntryEnvelope(event.blob_id);
    return {
      id: event.entry_id,
      namespace: envelope.namespace,
      author: envelope.author,
      kind: envelope.payload.kind,
      payload: envelope.payload,
      blobId: event.blob_id,
      hash: bytesToHex(event.hash),
      createdAt: envelope.createdAt,
      ...(envelope.parentId !== undefined ? { parentId: envelope.parentId } : {}),
    };
  }

  private async requireTaskRecord(taskId: TaskId): Promise<{ record: TaskRecord; revision: number }> {
    const found = await this.findLatestTaskRecord(taskId);
    if (!found) throw new Error(`Unknown task: ${taskId}`);
    return found;
  }

  private async findLatestTaskRecord(taskId: TaskId): Promise<{ record: TaskRecord; revision: number } | null> {
    const events = await this.queryEntryAnchored();
    const prefix = `${TASK_ANCHOR_PREFIX}${taskId}:`;

    let best: { revision: number; blobId: BlobId } | null = null;
    for (const event of events) {
      if (!event.entry_id.startsWith(prefix)) continue;
      const revision = Number(event.entry_id.slice(prefix.length));
      if (!best || revision > best.revision) {
        best = { revision, blobId: event.blob_id };
      }
    }
    if (!best) return null;

    return { record: await this.getTaskRecord(best.blobId), revision: best.revision };
  }

  /// Uploads `record` as its companion blob and anchors it under
  /// `task:<taskId>:<revision>`, adding the anchor_entry call to `tx`.
  private async addTaskAnchorCall(tx: Transaction, record: TaskRecord, revision: number): Promise<void> {
    const content = JSON.stringify(record);
    const blobId = await this.putBlob(content);
    const hash = sha256Hex(content);
    this.addAnchorEntryCall(
      tx,
      this.onChainNamespace(record.namespace),
      `${TASK_ANCHOR_PREFIX}${record.id}:${revision}`,
      blobId,
      hash,
    );
  }

  private addAnchorEntryCall(tx: Transaction, namespace: string, entryId: string, blobId: BlobId, hash: Hash): void {
    tx.moveCall({
      package: this.config.packageId,
      module: "registry",
      function: "anchor_entry",
      arguments: [
        tx.object(this.config.registryId),
        tx.pure.string(namespace),
        tx.pure.string(entryId),
        tx.pure.string(blobId),
        tx.pure.vector("u8", hexToBytes(hash)),
        tx.pure.address(this.address()),
      ],
    });
  }

  /// Looks up `registry::get_anchor(entryId)` via devInspect. Returns null if
  /// the entry has never been anchored (the Move call aborts with
  /// E_NOT_ANCHORED, surfaced as `result.error`).
  private async getAnchor(entryId: EntryId): Promise<{ blobId: BlobId; hash: Hash } | null> {
    const tx = new Transaction();
    tx.moveCall({
      package: this.config.packageId,
      module: "registry",
      function: "get_anchor",
      arguments: [tx.object(this.config.registryId), tx.pure.string(entryId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      sender: this.address(),
      transactionBlock: tx,
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (result.error || !returnValues) return null;

    const [blobIdBytes] = returnValues[0]!;
    const [hashBytes] = returnValues[1]!;

    const blobId = bcs.string().parse(Uint8Array.from(blobIdBytes));
    const hashArray = bcs.vector(bcs.u8()).parse(Uint8Array.from(hashBytes));

    return { blobId, hash: bytesToHex(hashArray) };
  }

  private async queryEntryAnchored(): Promise<ParsedEntryAnchored[]> {
    const events: ParsedEntryAnchored[] = [];
    let cursor: EventId | null | undefined;

    for (;;) {
      const page = await this.client.queryEvents({
        query: { MoveEventType: `${this.config.packageId}::registry::EntryAnchored` },
        cursor,
        order: "ascending",
        limit: EVENT_PAGE_SIZE,
      });

      for (const event of page.data) {
        events.push(event.parsedJson as ParsedEntryAnchored);
      }

      if (!page.hasNextPage) break;
      cursor = page.nextCursor;
    }

    return events;
  }

  /// Submits transactions one at a time. The Hive runs the Manager and every
  /// Specialist concurrently against a single WalrusStore/signer, so without
  /// this queue their transactions race on the signer's gas-coin object and
  /// Sui rejects all but one with "object version ... unavailable for
  /// consumption".
  private async execute(tx: Transaction): Promise<SuiTransactionBlockResponse> {
    const run = async (): Promise<SuiTransactionBlockResponse> => {
      const result = await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: this.config.signer,
        options: { showEffects: true, showObjectChanges: true },
      });

      await this.client.waitForTransaction({ digest: result.digest });

      if (result.effects?.status.status !== "success") {
        throw new Error(`Sui transaction ${result.digest} failed: ${result.effects?.status.error}`);
      }

      return result;
    };

    const queued = this.executionQueue.then(run, run);
    this.executionQueue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  private async getEntryEnvelope(blobId: BlobId): Promise<EntryEnvelope> {
    return JSON.parse(await this.getBlob(blobId)) as EntryEnvelope;
  }

  private async getTaskRecord(blobId: BlobId): Promise<TaskRecord> {
    return JSON.parse(await this.getBlob(blobId)) as TaskRecord;
  }

  private async putBlob(content: string): Promise<BlobId> {
    const response = await fetch(`${this.config.publisherUrl}/v1/blobs?epochs=1`, {
      method: "PUT",
      body: content,
    });

    if (!response.ok) {
      throw new Error(`Walrus publisher error ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as WalrusPutResponse;
    if ("newlyCreated" in body) return body.newlyCreated.blobObject.blobId;
    if ("alreadyCertified" in body) return body.alreadyCertified.blobId;
    throw new Error(`Unexpected Walrus publisher response: ${JSON.stringify(body)}`);
  }

  private async getBlob(blobId: BlobId): Promise<string> {
    const response = await fetch(`${this.config.aggregatorUrl}/v1/blobs/${blobId}`);
    if (!response.ok) {
      throw new Error(`Walrus aggregator error ${response.status}: ${await response.text()}`);
    }
    return await response.text();
  }
}

function findCreatedObjectId(result: SuiTransactionBlockResponse, objectType: string): string {
  for (const change of result.objectChanges ?? []) {
    if (change.type === "created" && change.objectType === objectType) {
      return change.objectId;
    }
  }
  throw new Error(`Transaction ${result.digest} did not create an object of type ${objectType}`);
}

function sha256Hex(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function bytesToHex(bytes: number[] | Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

function hexToBytes(hex: string): number[] {
  return Array.from(Buffer.from(hex, "hex"));
}
