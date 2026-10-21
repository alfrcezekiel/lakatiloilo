"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { displayNameOf, safeNextPath, useCurrentUser } from "@/lib/auth";

type Mode = "login" | "signup";
type Field = "name" | "email" | "password" | "form";
type Errors = Partial<Record<Field, string>>;

const MIN_PASSWORD = 8;

// Supabase answers with a short code when something goes wrong. Each code
// becomes a plain sentence, shown under the field it is about ("form"
// means under the button).
const authErrors: Record<string, { field: Field; message: string }> = {
  invalid_credentials: { field: "form", message: "Wrong email or password." },
  user_already_exists: { field: "email", message: "That email already has an account. Try logging in instead." },
  email_exists: { field: "email", message: "That email already has an account. Try logging in instead." },
  weak_password: { field: "password", message: `That password is too weak. Use at least ${MIN_PASSWORD} characters.` },
  email_address_invalid: { field: "email", message: "Please enter a valid email address." },
  validation_failed: { field: "form", message: "Please check your email address and password." },
  email_not_confirmed: { field: "form", message: "Please confirm your email first, using the link we sent you." },
  over_request_rate_limit: { field: "form", message: "Too many tries. Please wait a minute and try again." },
  // Supabase's built-in email sender allows only a few emails an hour.
  over_email_send_rate_limit: { field: "form", message: "Too many new accounts right now. Please try again in about an hour." },
};
const fallbackError = "Something went wrong. Please try again.";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to go after logging in: the page the traveler came from.
  const next = safeNextPath(searchParams.get("next"));
  const { user, ready } = useCurrentUser();

  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setErrors({});
    setNotice(null);
  };

  // Checks that need no trip to Supabase.
  const checkFields = (): Errors => {
    const found: Errors = {};
    const name = displayName.trim();
    if (mode === "signup" && (name.length < 2 || name.length > 40)) {
      found.name = "Your display name needs 2 to 40 characters.";
    }
    if (!email.includes("@")) {
      found.email = "Please enter a valid email address.";
    }
    if (mode === "signup" && password.length < MIN_PASSWORD) {
      found.password = `Use at least ${MIN_PASSWORD} characters.`;
    } else if (!password) {
      found.password = "Please enter your password.";
    }
    return found;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const found = checkFields();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } =
        mode === "signup"
          ? await supabase.auth.signUp({
            email,
            password,
            // Saved on the account; reviews show this name, never the email.
            options: { data: { display_name: displayName.trim() } },
          })
          : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const known = authErrors[error.code ?? ""];
        setErrors(known ? { [known.field]: known.message } : { form: fallbackError });
        return;
      }

      if (!data.session) {
        // Only happens if "Confirm email" is switched on in Supabase.
        setMode("login");
        setPassword("");
        setNotice("Check your email for a link to confirm your account, then log in.");
        return;
      }
      router.replace(next);
    } catch {
      // For example, no internet connection.
      setErrors({ form: fallbackError });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Top bar: logo and a way back */}
      <header className="flex items-center justify-between px-4 py-6 sm:px-8">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo width={163} height={34} />
        </Link>
        {/* <Link href={next} className="text-sm font-medium text-white/90 hover:text-white">
          ← Back to explore
        </Link> */}
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-md rounded-3xl border border-white/25 bg-white/15 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
            Iloilo City · Iloilo Province
          </p>
          <h1 className="font-fraunces mt-2 mb-6 text-4xl leading-tight font-medium tracking-tight">
            {mode === "login" ? "Welcome back, " : "Start your "}
            <em className="font-normal italic">lakat.</em>
          </h1>

          {ready && user ? (
            // Already logged in: nothing to fill in.
            <div className="space-y-5">
              <p className="text-white/90">
                You&apos;re logged in as <strong>{displayNameOf(user)}</strong>.
              </p>
              <Link
                href={next}
                className="flex h-12 w-full items-center justify-center rounded-full bg-white text-base font-semibold text-teal-900 shadow-lg hover:bg-white/90"
              >
                Continue
              </Link>
            </div>
          ) : (
            <>
              {/* Two tabs: Log in and Create account */}
              <div
                role="group"
                aria-label="Log in or create an account"
                className="mb-6 flex rounded-full border border-white/15 bg-teal-950/30 p-1"
              >
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${mode === m ? "bg-white text-teal-900 shadow" : "text-white hover:bg-white/10"
                      }`}
                  >
                    {m === "login" ? "Log in" : "Create account"}
                  </button>
                ))}
              </div>

              {/* noValidate: our own messages show under each field instead
                  of the browser's pop-ups. */}
              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                {mode === "signup" && (
                  <GlassField
                    id="display-name"
                    label="Username"
                    hint="Shown on your reviews"
                    error={errors.name}
                  >
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="nickname"
                      maxLength={40}
                      placeholder="Juan"
                      aria-invalid={!!errors.name}
                      aria-describedby="display-name-hint display-name-error"
                      className={fieldInputClass}
                    />
                  </GlassField>
                )}

                <GlassField id="email" label="Email" error={errors.email}>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby="email-error"
                    className={fieldInputClass}
                  />
                </GlassField>

                <GlassField
                  id="password"
                  label="Password"
                  error={errors.password}
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
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={`At least ${MIN_PASSWORD} characters`}
                    aria-invalid={!!errors.password}
                    aria-describedby="password-error"
                    className={fieldInputClass}
                  />
                </GlassField>

                {notice && (
                  <p role="status" className="rounded-xl bg-white/15 px-4 py-3 text-sm">
                    {notice}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={busy}
                  className="mt-3 h-12 w-full rounded-full bg-white text-base font-semibold text-teal-900 shadow-lg hover:bg-white/90 hover:opacity-100"
                >
                  {busy && <Spinner />}
                  {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
                </Button>

                {/* Errors that are not about one field, like a wrong password. */}
                {errors.form && (
                  <p role="alert" className="text-center text-sm text-amber-200">
                    {errors.form}
                  </p>
                )}
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-white/80">
            Just looking?{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-white">
              Explore as a guest
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

// The input inside a glass field: no box of its own, the field draws it.
const fieldInputClass =
  "h-auto border-0 bg-transparent p-0 text-base text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base";

// One rounded glass box with a small capital label on top, the input
// under it, an optional button on the right (like Show), and a yellow
// message under the box when something is wrong.
function GlassField({
  id,
  label,
  hint,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-2xl border bg-white/10 px-4 py-2.5 focus-within:border-white/60 ${error ? "border-amber-300/80" : "border-white/25"
          }`}
      >
        <div className="min-w-0 flex-1">
          <Label
            htmlFor={id}
            className="text-[11px] font-semibold uppercase tracking-widest text-white/80"
          >
            {label}
          </Label>
          {children}
        </div>
        {action}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 px-1 text-xs text-white/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 px-1 text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}

// A small turning circle for the button while Supabase answers. It stays
// still for visitors who turned on "reduce motion".
function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 motion-safe:animate-spin"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
