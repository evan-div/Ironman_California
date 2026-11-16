"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/types";

/**
 * Run a server action with pending state and toast feedback.
 * Resolves to the result so callers can close dialogs or roll back optimistic state.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, opts?: { onSuccess?: (data: T) => void; onError?: (error: string) => void; silent?: boolean }) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await action();
          } catch (e) {
            // Server-side redirects surface as thrown navigation signals; let them through.
            if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
            result = { ok: false, error: "We couldn't reach the server. Check your connection and try again." };
          }
          // A redirecting action resolves to undefined on the client.
          if (!result) return;
          if (result.ok) {
            if (result.message && !opts?.silent) toast.success(result.message);
            opts?.onSuccess?.(result.data);
          } else {
            toast.error(result.error);
            opts?.onError?.(result.error);
          }
          resolve(result);
        });
      }),
    [],
  );

  return { pending, run };
}
