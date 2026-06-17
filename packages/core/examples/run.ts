import { InMemoryStore, seed } from "../src/index";

async function main() {
  const store = new InMemoryStore();
  const { goal, tasks, result } = await seed(store);

  console.log("Timeline:");
  for (const entry of await store.list({ namespace: "demo" })) {
    console.log(`  [${entry.kind}] ${entry.id} (author: ${entry.author})`);
  }

  console.log("\nTasks:");
  for (const task of tasks) {
    console.log(`  [${task.status}] ${task.description}`);
  }

  console.log(`\nResult: ${result.payload.kind === "result" ? result.payload.summary : ""}`);

  const verification = await store.verify(goal.id);
  console.log(`\nVerify goal entry: ok=${verification.ok} (hash ${verification.localHash})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
