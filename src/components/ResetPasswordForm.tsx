"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { MIN_PASSWORD_LENGTH, PasswordStrength } from "@/components/PasswordStrength";
import { authButtonClass } from "@/components/AuthShell";
import { StatusModal } from "@/components/StatusModal";
import { createClient } from "@/lib/supabase/client";
import { endPasswordReset, resetIsPending, startPasswordReset } from "@/lib/auth";

// What the page shows:
//   checking - reading the link from the email (a split second)
//   ready    - the link worked: choose a new password
//   bad-link - the link expired, was already used, or was opened in a
//              different browser from the one that asked for it
//   no-link  - someone opened this page without a link
type View = "checking" | "ready" | "bad-link" | "no-link";

// The pop-up shown after "Save new password":
//   saved    - the password changed
//   retry    - it did not change, but trying again may work
//   new-link - it did not change because the link has run out
type Result =
  | { kind: "saved" }
  | { kind: "retry"; message: string }
  | { kind: "new-link" };

export function ResetPasswordForm() {
  const router = useRouter();
  const [view, setView] = useState<View>("checking");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function readLink() {
      // The link from the email lands here with ?code=… on success, or
      // with error details (for example error_code=otp_expired) when it
      // is expired or used. Supabase may put those after ? or after #.
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.hash.slice(1));
      url.searchParams.forEach((value, key) => params.set(key, value));

      const supabase = createClient();
      let next: View;
      if (params.has("error") || params.has("error_code")) {
        next = "bad-link";
      } else if (params.has("code")) {
        // Supabase swaps the code for a login on its own as the page
        // loads, then removes ?code from the address. getSession waits
        // for that to finish. A used or expired code is not swapped, and
        // stays in the address.
        const { data } = await supabase.auth.getSession();
        const swapped = !new URLSearchParams(window.location.search).has("code");
        next = data.session && swapped ? "ready" : "bad-link";
      } else {
        // No link: only fine when a reset is already under way in this
        // browser (for example, the traveler refreshed this page).
        const { data } = await supabase.auth.getSession();
        next = data.session && resetIsPending() ? "ready" : "no-link";
      }

      if (next === "ready") {
        // This login is for resetting only, until the new password is
        // saved. Any other page logs it out (see useCurrentUser).
        startPasswordReset();
      } else if (resetIsPending()) {
        // A reset link left a login behind (for example, the link was
        // opened once already). Remove it so nobody is logged in
        // without their password.
        await supabase.auth.signOut({ scope: "local" });
        endPasswordReset();
      }
      if (!cancelled) setView(next);
    }
    readLink();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setPasswordError(null);

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.code === "same_password") {
          setResult({ kind: "retry", message: "Your new password must be different from your old one." });
        } else if (error.code === "weak_password") {
          setResult({
            kind: "retry",
            message: `That password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters, with numbers and symbols.`,
          });
        } else if (error.code === "session_not_found" || error.code === "session_expired") {
          await supabase.auth.signOut({ scope: "local" });
          endPasswordReset();
          setResult({ kind: "new-link" });
        } else {
          setResult({ kind: "retry", message: "Something went wrong. Please try again." });
        }
        return;
      }
      // The new password is saved. The reset link's login was only for
      // this page, so end it: the traveler logs in with the new password.
      await supabase.auth.signOut({ scope: "local" });
      endPasswordReset();
      setResult({ kind: "saved" });
    } catch {
      // For example, no internet connection.
      setResult({ kind: "retry", message: "Something went wrong. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  if (view === "checking") {
    return (
      <div className="space-y-3">
        <p role="status" className="sr-only">
          Checking your reset link
        </p>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    );
  }

  if (view === "bad-link" || view === "no-link") {
    return (
      <div className="space-y-5">
        <p role="alert" className="rounded-xl bg-white/15 px-4 py-3 text-sm">
          {view === "bad-link"
            ? "This reset link has expired or was already used. Links only work once, for about an hour, in the same browser you asked for them in."
            : "To set a new password, open the link we emailed you."}
        </p>
        <Link
          href="/forgot-password"
          className="flex h-12 w-full items-center justify-center rounded-full bg-white text-base font-semibold text-teal-900 shadow-lg hover:bg-white/90"
        >
          Send me a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <GlassField
        id="password"
        label="New password"
        error={passwordError ?? undefined}
        action={
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-sm font-medium text-white/90 hover:text-white"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        }
      >
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          aria-invalid={!!passwordError}
          aria-describedby="password-error password-strength"
          className={fieldInputClass}
        />
      </GlassField>

      <PasswordStrength id="password-strength" password={password} />

      <Button type="submit" disabled={busy} className={authButtonClass}>
        {busy && <Spinner />}
        {busy ? "Please wait…" : "Save new password"}
      </Button>

      {result?.kind === "saved" && (
        <StatusModal
          open
          tone="success"
          title="Password changed"
          message="Your new password is saved. Log in with it to continue."
          actionLabel="Go to log in"
          onAction={() => router.replace("/login")}
          onClose={() => router.replace("/login")}
        />
      )}
      {result?.kind === "retry" && (
        <StatusModal
          open
          tone="error"
          title="Password not changed"
          message={result.message}
          actionLabel="Try again"
          onAction={() => setResult(null)}
          onClose={() => setResult(null)}
        />
      )}
      {result?.kind === "new-link" && (
        <StatusModal
          open
          tone="error"
          title="Password not changed"
          message="This reset link has expired. Ask for a new link and try again."
          actionLabel="Send me a new link"
          onAction={() => router.push("/forgot-password")}
          onClose={() => {
            setResult(null);
            setView("bad-link");
          }}
        />
      )}
    </form>
  );
}
