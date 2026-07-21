import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;

  return (
    <main className="auth-page shell">
      <ResetPasswordForm token={params.token ?? ""} />
    </main>
  );
}
