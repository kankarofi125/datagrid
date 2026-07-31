import { cleanEnv } from "@/lib/auth/google";
import { GoogleOneTapHost as ClientHost } from "@/components/auth/GoogleOneTap";

/**
 * Server wrapper — injects public Web client ID for One Tap.
 * Uses GOOGLE_CLIENT_ID (public OAuth client id, not the secret).
 */
export function GoogleOneTapHost({
  context = "signin",
}: {
  context?: "signin" | "signup" | "use";
}) {
  const clientId =
    cleanEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) ||
    cleanEnv(process.env.GOOGLE_CLIENT_ID);

  if (!clientId) return null;

  return <ClientHost clientId={clientId} context={context} />;
}
