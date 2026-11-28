// The log-in form's own checks, shared by the traveler log-in
// (LoginForm.tsx) and the team's sign-in (/admin/login, AdminSignIn.tsx)
// so both show the same sentences (team request 2026-11-28). The backend's
// RequiredAuthFieldsMiddleware refuses empty fields with the same
// sentences and codes (backend/src/v1/auth/required-auth-fields.middleware.ts).

export const LOGIN_FIELD_MESSAGES = {
  // An empty box, and a box filled in wrongly, get different sentences.
  email_required: "Please enter your email address.",
  email_address_invalid: "Please enter a valid email address.",
  password_required: "Please enter your password.",
} as const;

export type LogInFieldErrors = { email?: string; password?: string };

// Checks the email and password boxes before anything is sent. Each box
// gets its own message; an empty result means both are fine.
export function checkLogInFields(email: string, password: string): LogInFieldErrors {
  const errors: LogInFieldErrors = {};
  const trimmedEmail = email.trim();
  if (!trimmedEmail) errors.email = LOGIN_FIELD_MESSAGES.email_required;
  else if (!trimmedEmail.includes("@")) errors.email = LOGIN_FIELD_MESSAGES.email_address_invalid;
  if (!password) errors.password = LOGIN_FIELD_MESSAGES.password_required;
  return errors;
}

// The backend's codes for a box (empty or wrong), so a refusal shows under
// the box it is about.
export const LOGIN_FIELD_CODES: Record<string, keyof LogInFieldErrors> = {
  email_required: "email",
  email_address_invalid: "email",
  password_required: "password",
};
