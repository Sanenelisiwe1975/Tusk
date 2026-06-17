# Tusk live demo

`pnpm demo` runs the Hive (a Manager plus Researcher/Analyst/Writer
Specialists) against `WalrusStore` on Sui **testnet**: every memory entry the
agents write is a JSON blob on Walrus whose content hash is anchored on Sui,
and the run ends by re-verifying every entry's hash against its on-chain
anchor.

## What you'll see

1. The Manager writes a `goal` entry and decomposes it into 3 subtasks (one
   each for the researcher, analyst, and writer).
2. Each Specialist claims its task, calls Claude, and writes a `result` entry.
3. The Manager assembles the final artifact from the three results and writes
   it as the last `result` entry.
4. Every one of those writes is printed live as `[kind] id / blobId / hash`.
5. At the end, `verify()` is called for every entry in the run's namespace and
   prints `[ok]`/`[MISMATCH]` for each.

## Setup (clean checkout)

```bash
pnpm install
pnpm --filter @tusk/core run build   # apps/demo and @tusk/agents need packages/core/dist for @tusk/core's types
```

Sui + Walrus config (required for `pnpm demo`):

```bash
cp packages/core/.env.example packages/core/.env
```

Edit `packages/core/.env` and set `SUI_PRIVATE_KEY` to a testnet keypair
(bech32 `suiprivkey1...`) that holds testnet SUI for gas. The deployed
`SUI_PACKAGE_ID`/`SUI_REGISTRY_ID` and Walrus URLs are already filled in from
`packages/contracts/NOTES.md`. If the signer runs out of gas, top it up at
`https://faucet.testnet.sui.io/v2/gas`.

Anthropic key (optional, for real LLM output instead of `FakeLLM`):

```bash
cp packages/agents/.env.example packages/agents/.env
```

Edit `packages/agents/.env` and set `ANTHROPIC_API_KEY`. Without it, both
`pnpm demo` and `pnpm demo:fallback` still run end-to-end, but each agent's
output is a canned `FakeLLM` echo instead of a real market-brief section.

## Run it

```bash
pnpm demo            # live run: WalrusStore on Sui testnet
pnpm demo:fallback   # offline fallback: InMemoryStore, no network required
```

`pnpm demo` takes several minutes: `WalrusStore.list()`/`listTasks()`
repaginate the full on-chain event history on every call, so the agents poll
every 5-15s instead of the in-memory default of milliseconds. `pnpm
demo:fallback` runs the identical Manager/Specialist pipeline against
`InMemoryStore` and finishes in seconds -- use it if testnet or the Walrus
endpoints are flaky during judging.

## The shared config (for the UI)

`pnpm demo` writes [apps/demo/config.json](apps/demo/config.json) at the start
of the run, before any agent writes happen:

```json
{
  "network": "testnet",
  "rpcUrl": "https://fullnode.testnet.sui.io:443",
  "packageId": "0xa91c711f...",
  "registryId": "0x558d762d...",
  "publisherUrl": "https://publisher.walrus-testnet.walrus.space",
  "aggregatorUrl": "https://aggregator.walrus-testnet.walrus.space",
  "namespace": "tusk-demo-xxxxxxxx",
  "updatedAt": "2026-06-14T12:34:56.789Z"
}
```

A UI reads this file, queries `EntryAnchored` events from `registryId` on
`rpcUrl` filtered to `namespace` (exactly what `WalrusStore.list()` /
`listTasks()` do), and fetches blob contents from
`${aggregatorUrl}/v1/blobs/${blobId}`. Because `config.json` is written before
the Hive starts, a UI polling it from the moment `pnpm demo` starts will show
this run's timeline growing entry-by-entry in real time.

## The 10-second "open a blob, show its hash matches Sui" moment

1. From the `pnpm demo` console output, copy the `blobId` and `hash` printed
   for the final `[result]` entry (the last one logged -- the Manager's
   assembled artifact).
2. Open `${aggregatorUrl}/v1/blobs/${blobId}` in a browser (aggregator URL
   from `config.json`). You'll see the raw JSON envelope Walrus stored:
   `{ namespace, author, payload, parentId, createdAt }` -- the actual market
   brief text is right there in `payload.summary`.
3. Point at the `Verifying every entry against its on-chain anchor` section
   of the same console output and find the line for that entry's id: `[ok]`
   means `WalrusStore.verify()` just recomputed `hashPayload(payload)` from
   that same blob and confirmed it equals the `hash` anchored on Sui via the
   `EntryAnchored` event for this namespace -- the content you're looking at
   in the browser is provably what's anchored on-chain.

## Troubleshooting

- **"Missing required environment variable ..."** -- `packages/core/.env` is
  missing a value; see `packages/core/.env.example`.
- **Insufficient gas** -- fund the signer address at
  `https://faucet.testnet.sui.io/v2/gas`.
- **`pnpm demo` seems stuck** -- this is expected; each Specialist/Manager
  poll is 5-15s and a full run does ~20-30 Sui transactions. Use `pnpm
  demo:fallback` for an instant offline run.
