import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-3 text-5xl">Off course.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-ink">This page isn&apos;t on the route. Let&apos;s get you back.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
