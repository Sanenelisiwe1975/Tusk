// Install the browser Buffer shim before any walrus.ts code runs.
// walrus.ts uses bare `Buffer.from()` as a Node global; Vite's define in
// vite.config.ts replaces every `Buffer` identifier with `globalThis.Buffer`,
// so setting it here (synchronously, before initStore()) covers all callers.
import { Buffer as _BrowserBuffer } from "../shims/buffer";
(globalThis as Record<string, unknown>).Buffer = _BrowserBuffer;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initStore } from "./store/source";
import { App } from "./App";
import "./theme.css";

await initStore();

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
