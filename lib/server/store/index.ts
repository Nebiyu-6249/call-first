import "server-only";

import { ConfigError } from "../config";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

// Kept on globalThis so the in-memory store survives hot reloads in development.
const globalStore = globalThis as unknown as { __secondLookStore?: Store };

// Supabase when it is configured. Otherwise an in-memory store in development only, so the
// family loop can be tried locally without a Supabase project.
export function getStore(): Store {
  if (globalStore.__secondLookStore) return globalStore.__secondLookStore;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    globalStore.__secondLookStore = new SupabaseStore(url, key);
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("[store] SUPABASE_URL is not set: using an in-memory store. Data is lost on restart.");
    globalStore.__secondLookStore = new MemoryStore();
  } else {
    throw new ConfigError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  return globalStore.__secondLookStore;
}

// For tests.
export function setStoreForTesting(store: Store | undefined): void {
  globalStore.__secondLookStore = store;
}
