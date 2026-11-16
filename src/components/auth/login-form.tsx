"use client";

import * as React from "react";
import { Loader2, Mail } from "lucide-react";
import { sendMagicLink, signIn, signUp } from "@/app/actions/auth";
import type { ActionResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";

type Mode = "signin" | "signup";

export function LoginForm({ next, linkError }: { next?: string; linkError: boolean }) {
  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState<{ kind: "error" | "info"; text: string } | null>(
    linkError ? { kind: "error", text: "That link has expired or was already used. Sign in below or request a new one." } : null,
  );
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});

  function handle(result: ActionResult | undefined) {
    if (!result) return; // redirected
    if (result.ok) {
      setFieldErrors({});
      setStatus(result.message ? { kind: "info", text: result.message } : null);
    } else {
      setFieldErrors(result.fieldErrors ?? {});
      setStatus({ kind: "error", text: result.error });
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      handle(mode === "signin" ? await signIn({ email, password }, next) : await signUp({ email, password }));
    });
  }

  function magicLink() {
    setStatus(null);
    startTransition(async () => handle(await sendMagicLink({ email })));
  }

  const emailError = fieldErrors.email?.[0];
  const passwordError = fieldErrors.password?.[0];

  return (
    <div className="mt-8">
      <Segmented<Mode>
        ariaLabel="Sign in or create an account"
        value={mode}
        onValueChange={(m) => {
          setMode(m);
          setStatus(null);
          setFieldErrors({});
        }}
        options={[
          { value: "signin", label: "Sign in" },
          { value: "signup", label: "Create account" },
        ]}
        className="w-full"
      />

      <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
        <Field label="Email" htmlFor="email" error={emailError}>
          <Input
            {...fieldAria("email", emailError)}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={passwordError} hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input
            {...fieldAria("password", passwordError, mode === "signup" ? "hint" : undefined)}
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {status ? (
          <p
            role={status.kind === "error" ? "alert" : "status"}
            className={
              status.kind === "error"
                ? "rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-3 text-[13px] leading-relaxed text-danger"
                : "rounded-lg border border-forest/20 bg-sage/50 px-3.5 py-3 text-[13px] leading-relaxed text-ink"
            }
          >
            {status.text}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? <Loader2 className="animate-spin" /> : null}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {mode === "signin" ? (
        <Button type="button" variant="ghost" className="mt-2 w-full text-muted-ink" disabled={pending} onClick={magicLink}>
          <Mail />
          Email me a sign-in link instead
        </Button>
      ) : (
        <p className="mt-4 text-center text-xs leading-relaxed text-faint-ink">
          PROJECT 140.6 is in private beta. Only invited email addresses can create an account.
        </p>
      )}
    </div>
  );
}
