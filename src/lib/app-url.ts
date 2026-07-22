function normalizeUrl(value: string) {
  const withProtocol = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function isLocalUrl(value: string) {
  return value.includes("localhost") || value.includes("127.0.0.1");
}

export function getPublicAppUrl() {
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelDeploymentUrl = process.env.VERCEL_URL;
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    vercelProductionUrl ? normalizeUrl(vercelProductionUrl) : undefined,
    vercelDeploymentUrl ? normalizeUrl(vercelDeploymentUrl) : undefined
  ].filter((value): value is string => Boolean(value));

  const normalizedCandidates = candidates.map(normalizeUrl);
  const publicCandidate = normalizedCandidates.find((value) => !isLocalUrl(value));

  if (process.env.NODE_ENV === "production") {
    if (publicCandidate) return publicCandidate;
    throw new Error("La URL publica de la aplicacion apunta a localhost en produccion.");
  }

  return normalizedCandidates[0] ?? "http://localhost:3000";
}
