/// Anchors immutable memory-entry hashes and Walrus blob pointers on-chain.
/// WalrusStore calls `anchor_entry` after every memory write so that any
/// reader can verify a blob's content against its anchored hash without
/// trusting the storage layer. Anchors are append-only: once recorded for
/// an `entry_id`, an anchor is never mutated or removed.
module tusk::registry;

use std::string::String;
use sui::event;
use sui::table::{Self, Table};

/// `entry_id` has already been anchored.
const E_ALREADY_ANCHORED: u64 = 0;
/// `entry_id` has not been anchored.
const E_NOT_ANCHORED: u64 = 1;

/// Immutable record of a memory entry's Walrus pointer and content hash.
public struct Anchor has store, copy, drop {
    blob_id: String,
    hash: vector<u8>,
    author: address,
    created_at: u64,
}

/// Shared object mapping entry ids to their immutable anchors. One
/// `Registry` is created and shared in `init` when the package is
/// published.
public struct Registry has key {
    id: UID,
    anchors: Table<String, Anchor>,
}

/// Emitted whenever a new memory entry is anchored.
public struct EntryAnchored has copy, drop {
    namespace: String,
    entry_id: String,
    blob_id: String,
    hash: vector<u8>,
    author: address,
    created_at: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(Registry {
        id: object::new(ctx),
        anchors: table::new(ctx),
    });
}

/// Record an immutable anchor for `entry_id`. Aborts with
/// `E_ALREADY_ANCHORED` if `entry_id` has already been anchored.
public fun anchor_entry(
    registry: &mut Registry,
    namespace: String,
    entry_id: String,
    blob_id: String,
    hash: vector<u8>,
    author: address,
    ctx: &mut TxContext,
) {
    assert!(!table::contains(&registry.anchors, entry_id), E_ALREADY_ANCHORED);

    let created_at = ctx.epoch_timestamp_ms();
    table::add(&mut registry.anchors, entry_id, Anchor { blob_id, hash, author, created_at });

    event::emit(EntryAnchored { namespace, entry_id, blob_id, hash, author, created_at });
}

/// Read back the blob id and content hash anchored for `entry_id`. Aborts
/// with `E_NOT_ANCHORED` if `entry_id` has not been anchored.
public fun get_anchor(registry: &Registry, entry_id: String): (String, vector<u8>) {
    assert!(table::contains(&registry.anchors, entry_id), E_NOT_ANCHORED);
    let anchor = table::borrow(&registry.anchors, entry_id);
    (anchor.blob_id, anchor.hash)
}

/// True if `entry_id` has already been anchored.
public fun has_anchor(registry: &Registry, entry_id: String): bool {
    table::contains(&registry.anchors, entry_id)
}

#[test_only]
use std::string;

#[test]
fun test_anchor_then_read_back() {
    let mut ctx = tx_context::dummy();
    let mut registry = Registry { id: object::new(&mut ctx), anchors: table::new(&mut ctx) };

    let entry_id = string::utf8(b"entry-1");
    let blob_id = string::utf8(b"blob-1");
    let hash = b"deadbeef";

    assert!(!has_anchor(&registry, entry_id), 0);

    anchor_entry(
        &mut registry,
        string::utf8(b"demo"),
        entry_id,
        blob_id,
        hash,
        @0xA11CE,
        &mut ctx,
    );

    assert!(has_anchor(&registry, entry_id), 1);

    let (read_blob_id, read_hash) = get_anchor(&registry, entry_id);
    assert!(read_blob_id == blob_id, 2);
    assert!(read_hash == hash, 3);

    let Registry { id, anchors } = registry;
    table::drop(anchors);
    object::delete(id);
}

#[test]
#[expected_failure(abort_code = E_ALREADY_ANCHORED)]
fun test_double_anchor_rejected() {
    let mut ctx = tx_context::dummy();
    let mut registry = Registry { id: object::new(&mut ctx), anchors: table::new(&mut ctx) };

    let entry_id = string::utf8(b"entry-1");
    anchor_entry(&mut registry, string::utf8(b"demo"), entry_id, string::utf8(b"blob-1"), b"hash-1", @0xA11CE, &mut ctx);
    anchor_entry(&mut registry, string::utf8(b"demo"), entry_id, string::utf8(b"blob-2"), b"hash-2", @0xA11CE, &mut ctx);

    let Registry { id, anchors } = registry;
    table::drop(anchors);
    object::delete(id);
}

#[test]
#[expected_failure(abort_code = E_NOT_ANCHORED)]
fun test_get_unanchored_rejected() {
    let mut ctx = tx_context::dummy();
    let registry = Registry { id: object::new(&mut ctx), anchors: table::new(&mut ctx) };

    let (_blob_id, _hash) = get_anchor(&registry, string::utf8(b"missing"));

    let Registry { id, anchors } = registry;
    table::drop(anchors);
    object::delete(id);
}
