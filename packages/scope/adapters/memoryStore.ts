// Re-exports the canonical store accessor so existing hooks (built in B2–B5)
// can import from this path without needing to change their import statements.
export { getStore } from "../src/store/source";
