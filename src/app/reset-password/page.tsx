import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set new password · Lakat Iloilo",
};

// Opened from the link in the reset email (see ForgotPasswordForm).
export default function ResetPasswordPage() {
  return (
    <AuthShell
      title={
        <>
          Set a new <em className="font-normal italic">password.</em>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
