// A three-part bar under a password field that says how strong the
// password is: Weak, Okay or Strong. It is only a hint for the traveler;
// the real rule (MIN_PASSWORD_LENGTH below) is checked by the forms.

// The shortest password allowed, used by sign-up and Set new password.
// Keep it the same as the minimum password length in Supabase's
// Authentication settings, which checks it too.
export const MIN_PASSWORD_LENGTH = 8;

type Strength = { level: 1 | 2 | 3; label: "Weak" | "Okay" | "Strong" };

// How many kinds of character the password mixes: lowercase letters,
// capital letters, numbers and symbols (anything else, like ! or #).
function kindsOfCharacter(password: string): number {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
}

export function passwordStrength(password: string): Strength {
  const kinds = kindsOfCharacter(password);
  if (password.length < MIN_PASSWORD_LENGTH || kinds < 2) return { level: 1, label: "Weak" };
  if (password.length >= 12 && kinds >= 3) return { level: 3, label: "Strong" };
  return { level: 2, label: "Okay" };
}

// The colour of the filled parts of the bar, for each level.
const fillColour = {
  1: "bg-amber-300",
  2: "bg-yellow-200",
  3: "bg-emerald-300",
} as const;

export function PasswordStrength({ id, password }: { id: string; password: string }) {
  // The empty box stays on the page so screen readers already know about
  // it and announce the first strength as soon as the traveler types.
  if (!password) return <div id={id} aria-live="polite" />;
  const { level, label } = passwordStrength(password);

  return (
    <div id={id} aria-live="polite" className="mt-2 px-1">
      {/* The bar is decoration: the words below say the same thing. */}
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((part) => (
          <span
            key={part}
            className={`h-1.5 flex-1 rounded-full ${part <= level ? fillColour[level] : "bg-white/20"}`}
          />
        ))}
      </div>
      {/* aria-live (on the box above): screen readers read the new
          strength as it changes. */}
      <p className="mt-1 text-xs text-white/80">
        Password strength: <strong className="font-semibold text-white">{label}</strong>
        {level < 3 && " · Longer, with numbers and symbols, is stronger"}
      </p>
    </div>
  );
}
