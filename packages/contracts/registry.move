module tusk::registry {
    use std::string::String;
    use sui::event;
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    /// Anchors a namespace to its current Walrus blob pointer and the
    /// content hash of that blob, so any reader can verify memory
    /// integrity without trusting the storage layer.
    struct Registry has key {
        id: UID,
        namespace: String,
        blob_id: String,
        content_hash: String,
        version: u64,
    }

    /// Emitted on every pointer update so off-chain tooling (e.g.
    /// MemoryScope) can follow a namespace's history without re-reading
    /// the object on each poll.
    struct PointerUpdated has copy, drop {
        namespace: String,
        blob_id: String,
        content_hash: String,
        version: u64,
    }

    public fun create(namespace: String, blob_id: String, content_hash: String, ctx: &mut TxContext): Registry {
        Registry {
            id: object::new(ctx),
            namespace,
            blob_id,
            content_hash,
            version: 0,
        }
    }

    public fun update_pointer(registry: &mut Registry, blob_id: String, content_hash: String) {
        registry.blob_id = blob_id;
        registry.content_hash = content_hash;
        registry.version = registry.version + 1;

        event::emit(PointerUpdated {
            namespace: registry.namespace,
            blob_id: registry.blob_id,
            content_hash: registry.content_hash,
            version: registry.version,
        });
    }
}
