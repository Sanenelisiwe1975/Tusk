# Deployment Notes — `tusk_contracts`

## Network

- **Network**: Sui testnet (`https://fullnode.testnet.sui.io:443`)
- **Edition**: Move 2024.beta
- **Framework dependency**: `Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }`
- **CLI used**: `sui 1.73.1-ff1fe0ec4551-dirty` (testnet-v1.73.1 release build)

## Published package

| Item | Value |
| --- | --- |
| Package ID | `0xa91c711fe09a79f7306fa86377051abfdacd3fa4e2bb89d06ff74ddf2953fb89` |
| Modules | `registry`, `task` |
| Publish tx digest | `2QMj4SyjuVEu74ohX75FWwN5TK3TzSDbA3fraPgLVFT9` |
| Publisher address | `0x84d1569db0e678553953f2172d497fc744cd6976268558dbdaa668a19ce5b585` |
| UpgradeCap object ID | `0xe157f0d7f66867201e9d361d98c699fe328f0ec3347487cb25fa330d3c9f3650` |

## Shared `Registry` object

Created and shared once in `registry::init` at publish time.

| Item | Value |
| --- | --- |
| Object ID | `0x558d762df929740ef5d48aa5384a95cad443f503c1706a2199501f1083c98ca9` |
| Initial shared version | `349181731` |
| Type | `0xa91c711fe09a79f7306fa86377051abfdacd3fa4e2bb89d06ff74ddf2953fb89::registry::Registry` |

WalrusStore should call `anchor_entry` on this object's id (with the shared
version above) to anchor memory-entry hashes, and `get_anchor` / `has_anchor`
to read them back.

## `task::Task` objects

`task::create_task` creates and shares a new `Task` object per call — there
is no single shared `Task` registry object; each task is its own shared
object, discovered off-chain via the `TaskCreated` event (and subsequent
`TaskClaimed` / `TaskCompleted` / `TaskFailed` events keyed by `task_id`).

## Reproducing this deployment

```sh
cd packages/contracts
sui move build
sui move test
sui client faucet                # fund the active address on testnet
sui client publish --gas-budget 200000000 --json
```

## Notes / caveats

- Publishing this package generated a **new local keypair** in
  `~/.sui/sui_config/client.yaml` (alias `heuristic-prase`,
  address `0x84d1569db0e678553953f2172d497fc744cd6976268558dbdaa668a19ce5b585`)
  because no Sui config existed yet on this machine. It holds only testnet
  SUI from the public faucet (1 SUI requested via
  `https://faucet.testnet.sui.io/v2/gas`) and controls the `UpgradeCap` for
  this package.
- The Move CLI suggested removing the explicit `Sui` dependency from
  `Move.toml` in favor of Sui's automatic implicit dependencies. We kept the
  explicit dependency for reproducibility and parity with the official
  package templates.
