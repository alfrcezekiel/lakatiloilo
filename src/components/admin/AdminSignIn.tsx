"use client";

import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { authButtonClass } from "@/components/AuthShell";
import { Logo } from "@/components/Logo";
import { AdminFrame, adminGlass } from "@/components/admin/AdminFrame";
import { adminLogInThroughBackend, backendRefusal } from "@/lib/api";
import { setAdminCookie } from "@/lib/admin-cookie";
import { freshToken, readLogin, saveLogin, useCurrentUser } from "@/lib/login";
import { cn } from "@/lib/utils";

// Supabase's codes for a refused log-in, as plain sentences (the same as
// the traveler log-in).
const refusals: Record<string, string> = {
  invalid_credentials: "Wrong email or password.",
  validation_failed: "Please check your email address and password.",
  email_not_confirmed: "Please confirm your email first, using the link we sent you.",
  over_request_rate_limit: "Too many tries. Please wait a minute and try again.",
};

// The Lakat Iloilo team's own sign-in (/admin/login, ticket 107): a glass
// card over the darkened Iloilo photo. It is not linked from the traveler
// site. An admin goes to the dashboard; a traveler account is refused
// ("This sign-in is for the Lakat Iloilo team.") and is not logged in,
// because the backend ends that login at once. An admin who is already
// signed in goes straight to the dashboard.
export function AdminSignIn() {
  const router = useRouter();
  const { user, ready } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An admin who is already signed in (for example after the cookie the
  // server checks had run out) gets a fresh cookie and goes to the
  // dashboard.
  useEffect(() => {
    if (!ready || !user?.is_admin) return;
    void freshToken().then((token) => {
      if (!token) return;
      setAdminCookie(token, readLogin()?.expires_at);
      router.replace("/admin");
    });
  }, [ready, user, router]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { session } = await adminLogInThroughBackend(email.trim(), password);
      if (!session) {
        setError("Something went wrong. Please try again.");
        return;
      }
      saveLogin(session);
      // The server checks this before serving admin pages (src/proxy.ts).
      setAdminCookie(session.access_token, session.expires_at);
      router.replace("/admin");
    } catch (e) {
      const refusal = backendRefusal(e);
      setError(
        refusal?.status === 403
          ? "This sign-in is for the Lakat Iloilo team."
          : (refusal?.code && refusals[refusal.code]) || "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminFrame>
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className={cn(adminGlass, "w-full max-w-md p-6 sm:p-8")}>
          <div className="flex items-center justify-between gap-3">
            <Logo width={140} height={29} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-300/15 px-2.5 py-1 text-xs font-semibold text-amber-200">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Team only
            </span>
          </div>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
            Lakat Iloilo · Team
          </p>
          <h1 className="font-fraunces mt-2 mb-6 text-4xl leading-tight font-medium tracking-tight">
            Sign in to the dashboard
          </h1>

          <form onSubmit={signIn} noValidate className="space-y-3">
            <GlassField id="admin-email" label="Email">
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="you@example.com"
                className={fieldInputClass}
              />
            </GlassField>
            <GlassField
              id="admin-password"
              label="Password"
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-sm font-medium text-white/90 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              }
            >
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={fieldInputClass}
              />
            </GlassField>

            {error && (
              <p role="alert" className="px-1 text-sm font-medium text-amber-200">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className={cn(authButtonClass, "mt-3 gap-2")}>
              {busy && <Spinner />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-white/70">
          For the Lakat Iloilo team. Travelers log in on the main site.
        </p>
      </main>
    </AdminFrame>
  );
}
