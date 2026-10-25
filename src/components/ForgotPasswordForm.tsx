"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { authButtonClass } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

// The answer is the same whether or not the email has an account, so this
// page cannot be used to find out who has signed up.
const sentMessage =
  "If that email has an account, we've sent a link to reset your password. " +
  "Open it in this same browser. It can take a few minutes; check your spam folder too.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);

    setBusy(true);
    try {
      // Supabase emails a link that comes back to /reset-password. That
      // address must be in Supabase's allowed Redirect URLs (ticket 46).
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        if (
          error.status === 429 ||
          error.code === "over_email_send_rate_limit" ||
          error.code === "over_request_rate_limit"
        ) {
          // 429 means "too many requests". Supabase does not always send a
          // code with it, so the status is what we check first. Two limits
          // can cause it (one link per email address a minute, and only a
          // few emails an hour from Supabase's built-in sender), so the
          // message fits both.
          setFormError("Too many reset emails right now. Please wait a few minutes and try again.");
        } else if (error.code === "email_address_invalid" || error.code === "validation_failed") {
          setEmailError("Please enter a valid email address.");
        } else {
          setFormError("Something went wrong. Please try again.");
        }
        return;
      }
      setSent(true);
    } catch {
      // For example, no internet connection.
      setFormError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-5">
        <p role="status" className="rounded-xl bg-white/15 px-4 py-3 text-sm">
          {sentMessage}
        </p>
        <BackToLogin />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <p className="text-white/90">
        Type the email you signed up with and we&apos;ll send you a link to choose a new password.
      </p>

      <GlassField id="email" label="Email" error={emailError ?? undefined}>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          placeholder="you@example.com"
          aria-invalid={!!emailError}
          aria-describedby="email-error"
          className={fieldInputClass}
        />
      </GlassField>

      <Button type="submit" disabled={busy} className={`mt-3 ${authButtonClass}`}>
        {busy && <Spinner />}
        {busy ? "Please wait…" : "Send reset link"}
      </Button>

      {formError && (
        <p role="alert" className="text-center text-sm text-amber-200">
          {formError}
        </p>
      )}

      <BackToLogin />
    </form>
  );
}

function BackToLogin() {
  return (
    <p className="pt-2 text-center text-sm text-white/80">
      <Link href="/login" className="underline underline-offset-2 hover:text-white">
        Back to log in
      </Link>
    </p>
  );
}
