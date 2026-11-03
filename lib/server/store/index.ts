import "server-only";

import { ConfigError } from "../config";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

// Kept on globalThis so the in-memory store survives hot reloads in development.
const globalStore = globalThis as unknown as { __callFirstStore?: Store };

// Supabase when it is configured. Otherwise an in-memory store in development only, so the
// family loop can be tried locally without a Supabase project.
export function getStore(): Store {
  if (globalStore.__callFirstStore) return globalStore.__callFirstStore;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    globalStore.__callFirstStore = new SupabaseStore(url, key);
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("[store] SUPABASE_URL is not set: using an in-memory store. Data is lost on restart.");
    globalStore.__callFirstStore = new MemoryStore();
  } else {
    throw new ConfigError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  return globalStore.__callFirstStore;
}

// For tests.
export function setStoreForTesting(store: Store | undefined): void {
  globalStore.__callFirstStore = store;
}
