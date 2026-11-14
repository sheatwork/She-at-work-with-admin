// app/(protected)/layout.tsx
// The only place SessionProvider is mounted. Every useSession()/signOut()
// consumer lives under /dashboard, so public pages never load the provider and
// never call /api/auth/session. See app/layout.tsx.
import { SessionProvider } from "next-auth/react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
