import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password · Lakat Iloilo",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title={
        <>
          Forgot your <em className="font-normal italic">password?</em>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
