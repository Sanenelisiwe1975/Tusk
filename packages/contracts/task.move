module tusk::task {
    use std::string;
    use std::string::String;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};

    const STATUS_PENDING: u8 = 0;
    const STATUS_CLAIMED: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;
    const STATUS_FAILED: u8 = 3;

    const E_NOT_PENDING: u64 = 0;
    const E_NOT_CLAIMED: u64 = 1;

    /// A subtask handed out to a specialist agent.
    struct Subtask has key {
        id: UID,
        description: String,
        role: String,
        status: u8,
        claimed_by: address,
        result_blob_id: String,
    }

    public fun create(description: String, role: String, ctx: &mut TxContext): Subtask {
        Subtask {
            id: object::new(ctx),
            description,
            role,
            status: STATUS_PENDING,
            claimed_by: @0x0,
            result_blob_id: string::utf8(b""),
        }
    }

    public fun claim(subtask: &mut Subtask, ctx: &TxContext) {
        assert!(subtask.status == STATUS_PENDING, E_NOT_PENDING);
        subtask.status = STATUS_CLAIMED;
        subtask.claimed_by = tx_context::sender(ctx);
    }

    public fun complete(subtask: &mut Subtask, result_blob_id: String) {
        assert!(subtask.status == STATUS_CLAIMED, E_NOT_CLAIMED);
        subtask.status = STATUS_COMPLETED;
        subtask.result_blob_id = result_blob_id;
    }

    public fun fail(subtask: &mut Subtask) {
        subtask.status = STATUS_FAILED;
    }
}
