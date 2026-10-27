"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { AuthCard, authButtonClass } from "@/components/AuthShell";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { MIN_PASSWORD_LENGTH, PasswordStrength } from "@/components/PasswordStrength";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusModal } from "@/components/StatusModal";
import { createClient } from "@/lib/supabase/client";
import { backendRefusal, logInThroughBackend, signUpThroughBackend } from "@/lib/api";
import {
  displayNameOf,
  rememberedEmail,
  rememberEmail,
  safeNextPath,
  useCurrentUser,
} from "@/lib/auth";
import { travelerTypes, type TravelerType } from "@/lib/labels";

type Mode = "login" | "signup";
type Field = "name" | "traveler" | "email" | "password" | "form";
type Errors = Partial<Record<Field, string>>;

// Supabase answers with a short code when something goes wrong. Each code
// becomes a plain sentence, shown under the field it is about ("form"
// means under the button).
const authErrors: Record<string, { field: Field; message: string }> = {
  invalid_credentials: { field: "form", message: "Wrong email or password." },
  user_already_exists: { field: "email", message: "That email already has an account. Try logging in instead." },
  email_exists: { field: "email", message: "That email already has an account. Try logging in instead." },
  weak_password: { field: "password", message: `That password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters.` },
  email_address_invalid: { field: "email", message: "Please enter a valid email address." },
  validation_failed: { field: "form", message: "Please check your email address and password." },
  email_not_confirmed: { field: "form", message: "Please confirm your email first, using the link we sent you." },
  over_request_rate_limit: { field: "form", message: "Too many tries. Please wait a minute and try again." },
  // Supabase's built-in email sender allows only a few emails an hour.
  over_email_send_rate_limit: { field: "form", message: "Too many new accounts right now. Please try again in about an hour." },
  // The backend's own checks (POST /v1/auth/signup).
  display_name_invalid: { field: "name", message: "Your display name needs 2 to 40 characters." },
  traveler_type_invalid: { field: "traveler", message: "Please pick how you're traveling." },
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
  // "I'm traveling as" (sign-up only). null until the traveler picks one.
  const [travelerType, setTravelerType] = useState<TravelerType | null>(null);
  // Log in mode starts with the email saved by "Remember my email", if
  // there is one. (The form only appears after the page has loaded in
  // the browser, so reading browser storage here is safe.)
  const [email, setEmail] = useState(() => (mode === "login" ? rememberedEmail() : ""));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // "Remember my email" (log-in only). Unticked by default; starts ticked
  // if they ticked it last time (their email was remembered).
  const [rememberMyEmail, setRememberMyEmail] = useState(() => rememberedEmail() !== "");
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  // Set right after an account is created, to show the "Account created"
  // pop-up. Creating an account does not log the traveler in.
  const [created, setCreated] = useState<{
    name: string;
    needsConfirmation: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  // True once this form has logged the traveler in and is sending them on.
  // Supabase says "logged in" a moment before the next page appears; this
  // keeps the form (with its spinner) on screen in that gap, instead of
  // flashing the "You're logged in as …" box meant for visitors who open
  // /login while already logged in.
  const [leaving, setLeaving] = useState(false);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    // Start each tab with empty fields, so nothing typed in one tab
    // shows up in the other.
    setDisplayName("");
    setTravelerType(null);
    // Back to Log in: bring back the remembered email and ticked box.
    const remembered = newMode === "login" ? rememberedEmail() : "";
    setEmail(remembered);
    setRememberMyEmail(remembered !== "");
    setPassword("");
    setShowPassword(false);
    setErrors({});
    setNotice(null);
  };

  // From the "Account created" pop-up: open Log in with every field
  // empty, so the traveler types their own email and password (nothing
  // from sign-up, or from a remembered email, is filled in).
  const goToLogIn = () => {
    setCreated(null);
    switchMode("login");
    setEmail("");
    setRememberMyEmail(false);
  };

  // Checks that need no trip to Supabase.
  const checkFields = (): Errors => {
    const found: Errors = {};
    const name = displayName.trim();
    if (mode === "signup" && (name.length < 2 || name.length > 40)) {
      found.name = "Your display name needs 2 to 40 characters.";
    }
    if (mode === "signup" && !travelerType) {
      found.traveler = "Please pick how you're traveling.";
    }
    if (!email.includes("@")) {
      found.email = "Please enter a valid email address.";
    }
    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      found.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
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
      // Through the NestJS backend (POST /v1/auth/signup or /login), which
      // asks Supabase Auth. The display name is saved on the account
      // (reviews show it, never the email), and the database copies
      // traveler_type onto their reviews (supabase/sql/022).
      let data;
      try {
        if (mode === "signup") {
          const result = await signUpThroughBackend({
            email,
            password,
            display_name: displayName.trim(),
            traveler_type: travelerType ?? "",
          });
          // Not logged in: show the pop-up, then they log in themselves.
          setCreated({
            name: displayName.trim(),
            needsConfirmation: result.needs_confirmation,
          });
          return;
        }
        data = await logInThroughBackend(email, password);
      } catch (error) {
        const refusal = backendRefusal(error);
        if (!refusal) throw error; // no answer at all: handled below
        // Supabase's code (passed on by the backend) picks the message.
        // 429 = "too many requests", which Supabase does not always label.
        const known =
          authErrors[refusal.code ?? ""] ??
          (refusal.status === 429
            ? { field: "form" as const, message: "Too many tries. Please wait a few minutes and try again." }
            : undefined);
        setErrors(known ? { [known.field]: known.message } : { form: fallbackError });
        return;
      }

      if (!data.session) {
        setErrors({ form: fallbackError });
        return;
      }
      // Keep the login the backend handed back, in this browser, exactly
      // as a direct Supabase log-in would (the navbar, reviews and
      // "Remember my email" all work as before).
      const { error: keepError } = await createClient().auth.setSession(data.session);
      if (keepError) {
        setErrors({ form: fallbackError });
        return;
      }
      rememberEmail(rememberMyEmail, email);
      setLeaving(true);
      router.replace(next);
    } catch {
      // For example, no internet connection.
      setErrors({ form: fallbackError });
    } finally {
      setBusy(false);
    }
  };

  return (
    // The glass card; the page around it (background, logo, footer) is
    // AuthFrame, in the log-in page.
    <AuthCard
      title={
        <>
          {mode === "login" ? "Welcome back, " : "Start your "}
          <em className="font-normal italic">lakat.</em>
        </>
      }
    >

      {!ready ? (
        // Still checking the login cookie (a split second). Showing the
        // form here would flash it at travelers who are logged in.
        <div className="space-y-3">
          <p role="status" className="sr-only">
            Checking whether you are logged in
          </p>
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      ) : user && !leaving ? (
        // Opened /login while already logged in: nothing to fill in.
        <div className="space-y-5">
          <p className="text-white/90">
            You&apos;re logged in as <strong>{displayNameOf(user)}</strong>.
          </p>
          <Link
            href={next}
            className={authButtonClass}
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
                // "off" stops the browser from filling in saved emails.
                autoComplete="off"
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
                // "new-password" stops the browser from filling in a saved
                // password (browsers ignore "off" on password fields).
                autoComplete="new-password"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                aria-invalid={!!errors.password}
                aria-describedby={
                  mode === "signup" ? "password-error password-strength" : "password-error"
                }
                className={fieldInputClass}
              />
            </GlassField>

            {mode === "signup" && (
              <PasswordStrength id="password-strength" password={password} />
            )}

            {mode === "signup" && (
              // Radio buttons styled as pills: mouse, touch and keyboard
              // (Tab, then the arrow keys) all work.
              <fieldset aria-describedby="traveler-error">
                <legend className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-white/80">
                  I&apos;m traveling as
                </legend>
                {/* Three equal pills in one row, like the mockup. */}
                <div className="grid grid-cols-3 gap-2">
                  {travelerTypes.map((type) => (
                    <label
                      key={type.id}
                      className={`flex cursor-pointer items-center justify-center rounded-full border px-2 py-2 text-center text-xs leading-tight font-medium sm:text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white ${
                        travelerType === type.id
                          ? "border-white bg-white text-teal-900 shadow"
                          : errors.traveler
                            ? "border-amber-300/80 bg-white/10 text-white hover:bg-white/20"
                            : "border-white/25 bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="traveler-type"
                        value={type.id}
                        checked={travelerType === type.id}
                        onChange={() => setTravelerType(type.id)}
                        className="sr-only"
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
                {errors.traveler && (
                  <p id="traveler-error" role="alert" className="mt-1 px-1 text-sm text-amber-200">
                    {errors.traveler}
                  </p>
                )}
              </fieldset>
            )}

            {mode === "login" && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-white/90">
                  <input
                    type="checkbox"
                    checked={rememberMyEmail}
                    onChange={(e) => setRememberMyEmail(e.target.checked)}
                    className="size-4 cursor-pointer accent-white"
                  />
                  Remember my email
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-white/90 underline underline-offset-2 hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {notice && (
              <p role="status" className="rounded-xl bg-white/15 px-4 py-3 text-sm">
                {notice}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy || leaving}
              className={`mt-3 ${authButtonClass}`}
            >
              {(busy || leaving) && <Spinner />}
              {leaving
                ? "Taking you back…"
                : busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Log in"
                    : "Create account"}
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

      {created && (
        <StatusModal
          tone="success"
          title="Account created"
          message={
            created.needsConfirmation
              ? `Welcome to Lakat Iloilo, ${created.name}! Check your email for a link to confirm your account, then log in.`
              : `Welcome to Lakat Iloilo, ${created.name}! Your account is ready. Log in with your email and password to start writing reviews.`
          }
          actionLabel="Go to log in"
          onAction={goToLogIn}
          onClose={goToLogIn}
        />
      )}
    </AuthCard>
  );
}
