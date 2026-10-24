import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { AuthFrame } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Log in · Lakat Iloilo",
};

// Option 1a from the "Lakat Auth" design: the page frame (AuthFrame) with
// the log-in card inside. The form reads ?next= from the address bar,
// which Next.js only allows inside a Suspense boundary on a page built
// ahead of time.
export default function LoginPage() {
  return (
    <AuthFrame>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
