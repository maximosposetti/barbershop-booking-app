import { Suspense } from "react";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="auth-page shell">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
