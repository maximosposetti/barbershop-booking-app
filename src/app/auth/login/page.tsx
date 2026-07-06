import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page shell">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
