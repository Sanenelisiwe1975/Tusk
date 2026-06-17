/// Tracks task-coordination state for memory-driven agent work. A `Task` is
/// a shared object so any specialist can claim it; WalrusStore mirrors its
/// state into the off-chain `TaskRecord`. This module holds only storage and
/// state-machine transitions -- no scheduling or business logic.
module tusk::task;

use std::string::String;
use sui::event;

/// Task is waiting to be claimed.
const STATUS_PENDING: u8 = 0;
/// Task has been claimed by an agent and is in progress.
const STATUS_CLAIMED: u8 = 1;
/// Task finished successfully.
const STATUS_DONE: u8 = 2;
/// Task finished unsuccessfully.
const STATUS_FAILED: u8 = 3;

/// `claim_task` called on a task that is not pending.
const E_NOT_PENDING: u64 = 0;
/// `complete_task` called on a task that is not claimed.
const E_NOT_CLAIMED: u64 = 1;
/// `fail_task` called on a task that has already reached a terminal state.
const E_ALREADY_TERMINAL: u64 = 2;

/// A unit of work tied to a memory entry, claimable by any specialist.
public struct Task has key {
    id: UID,
    entry_id: String,
    namespace: String,
    role: String,
    status: u8,
    claimed_by: Option<address>,
    result_id: Option<String>,
    error: Option<String>,
}

/// Emitted when a new task is created and shared.
public struct TaskCreated has copy, drop {
    task_id: ID,
    namespace: String,
    entry_id: String,
    role: String,
}

/// Emitted when a pending task is claimed.
public struct TaskClaimed has copy, drop {
    task_id: ID,
    claimed_by: address,
}

/// Emitted when a claimed task completes successfully.
public struct TaskCompleted has copy, drop {
    task_id: ID,
    result_id: String,
}

/// Emitted when a task fails.
public struct TaskFailed has copy, drop {
    task_id: ID,
    reason: String,
}

/// Create a new pending task tied to `entry_id` and share it so any
/// specialist can claim it.
public fun create_task(namespace: String, entry_id: String, role: String, ctx: &mut TxContext) {
    let task = Task {
        id: object::new(ctx),
        entry_id,
        namespace,
        role,
        status: STATUS_PENDING,
        claimed_by: option::none(),
        result_id: option::none(),
        error: option::none(),
    };

    event::emit(TaskCreated {
        task_id: object::id(&task),
        namespace: task.namespace,
        entry_id: task.entry_id,
        role: task.role,
    });

    transfer::share_object(task);
}

/// Claim a pending task. Aborts with `E_NOT_PENDING` if it is not pending.
public fun claim_task(task: &mut Task, agent: address) {
    assert!(task.status == STATUS_PENDING, E_NOT_PENDING);
    task.status = STATUS_CLAIMED;
    task.claimed_by = option::some(agent);

    event::emit(TaskClaimed { task_id: object::id(task), claimed_by: agent });
}

/// Complete a claimed task with the id of the memory entry holding the
/// result. Aborts with `E_NOT_CLAIMED` if the task is not claimed.
public fun complete_task(task: &mut Task, result_id: String) {
    assert!(task.status == STATUS_CLAIMED, E_NOT_CLAIMED);
    task.status = STATUS_DONE;
    task.result_id = option::some(result_id);

    event::emit(TaskCompleted { task_id: object::id(task), result_id });
}

/// Mark a pending or claimed task as failed with a reason. Aborts with
/// `E_ALREADY_TERMINAL` if the task has already reached a terminal state.
public fun fail_task(task: &mut Task, reason: String) {
    assert!(task.status == STATUS_PENDING || task.status == STATUS_CLAIMED, E_ALREADY_TERMINAL);
    task.status = STATUS_FAILED;
    task.error = option::some(reason);

    event::emit(TaskFailed { task_id: object::id(task), reason });
}

#[test_only]
use std::string;

#[test_only]
fun destroy_for_testing(task: Task) {
    let Task {
        id,
        entry_id: _,
        namespace: _,
        role: _,
        status: _,
        claimed_by: _,
        result_id: _,
        error: _,
    } = task;
    object::delete(id);
}

#[test]
fun test_task_lifecycle() {
    let mut ctx = tx_context::dummy();
    let mut task = Task {
        id: object::new(&mut ctx),
        entry_id: string::utf8(b"entry-1"),
        namespace: string::utf8(b"demo"),
        role: string::utf8(b"researcher"),
        status: STATUS_PENDING,
        claimed_by: option::none(),
        result_id: option::none(),
        error: option::none(),
    };

    assert!(task.status == STATUS_PENDING, 0);

    claim_task(&mut task, @0xA11CE);
    assert!(task.status == STATUS_CLAIMED, 1);
    assert!(task.claimed_by == option::some(@0xA11CE), 2);

    complete_task(&mut task, string::utf8(b"entry-2"));
    assert!(task.status == STATUS_DONE, 3);
    assert!(task.result_id == option::some(string::utf8(b"entry-2")), 4);

    destroy_for_testing(task);
}

#[test]
fun test_fail_from_pending() {
    let mut ctx = tx_context::dummy();
    let mut task = Task {
        id: object::new(&mut ctx),
        entry_id: string::utf8(b"entry-1"),
        namespace: string::utf8(b"demo"),
        role: string::utf8(b"researcher"),
        status: STATUS_PENDING,
        claimed_by: option::none(),
        result_id: option::none(),
        error: option::none(),
    };

    fail_task(&mut task, string::utf8(b"no agent available"));
    assert!(task.status == STATUS_FAILED, 0);
    assert!(task.error == option::some(string::utf8(b"no agent available")), 1);

    destroy_for_testing(task);
}

#[test]
#[expected_failure(abort_code = E_NOT_PENDING)]
fun test_double_claim_rejected() {
    let mut ctx = tx_context::dummy();
    let mut task = Task {
        id: object::new(&mut ctx),
        entry_id: string::utf8(b"entry-1"),
        namespace: string::utf8(b"demo"),
        role: string::utf8(b"researcher"),
        status: STATUS_PENDING,
        claimed_by: option::none(),
        result_id: option::none(),
        error: option::none(),
    };

    claim_task(&mut task, @0xA11CE);
    claim_task(&mut task, @0xB0B);

    destroy_for_testing(task);
}

#[test]
#[expected_failure(abort_code = E_NOT_CLAIMED)]
fun test_complete_without_claim_rejected() {
    let mut ctx = tx_context::dummy();
    let mut task = Task {
        id: object::new(&mut ctx),
        entry_id: string::utf8(b"entry-1"),
        namespace: string::utf8(b"demo"),
        role: string::utf8(b"researcher"),
        status: STATUS_PENDING,
        claimed_by: option::none(),
        result_id: option::none(),
        error: option::none(),
    };

    complete_task(&mut task, string::utf8(b"entry-2"));

    destroy_for_testing(task);
}

#[test]
#[expected_failure(abort_code = E_ALREADY_TERMINAL)]
fun test_fail_after_done_rejected() {
    let mut ctx = tx_context::dummy();
    let mut task = Task {
        id: object::new(&mut ctx),
        entry_id: string::utf8(b"entry-1"),
        namespace: string::utf8(b"demo"),
        role: string::utf8(b"researcher"),
        status: STATUS_PENDING,
        claimed_by: option::none(),
        result_id: option::none(),
        error: option::none(),
    };

    claim_task(&mut task, @0xA11CE);
    complete_task(&mut task, string::utf8(b"entry-2"));
    fail_task(&mut task, string::utf8(b"too late"));

    destroy_for_testing(task);
}
