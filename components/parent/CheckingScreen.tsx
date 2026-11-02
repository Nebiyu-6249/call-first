import { LoaderCircle } from "lucide-react";

export function CheckingScreen({ message = "Taking a careful look..." }: { message?: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <LoaderCircle aria-hidden="true" className="size-16 text-primary motion-safe:animate-spin" />
      <p role="status" className="text-3xl font-bold">
        {message}
      </p>
    </main>
  );
}

// A short pause so the "checking" message can be read instead of flashing.
export const MIN_CHECKING_MS = 900;

export function atLeast<T>(promise: Promise<T>, ms = MIN_CHECKING_MS): Promise<T> {
  return Promise.all([promise, new Promise((resolve) => setTimeout(resolve, ms))]).then(([value]) => value);
}
