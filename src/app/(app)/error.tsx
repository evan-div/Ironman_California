"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display mt-3 text-4xl">We hit a flat.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-ink">
        This page couldn&apos;t load. Your data is safe — try again, and if it keeps happening check your connection.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-faint-ink">Reference: {error.digest}</p> : null}
      <Button className="mt-6" onClick={reset}>
        <RotateCw />
        Try again
      </Button>
    </div>
  );
}
