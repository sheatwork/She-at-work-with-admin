// app/layout.tsx
// KEY CHANGE: removed `const session = await auth()`
//
// WHY THIS MATTERS:
//   auth() calls the jwt() callback which calls findUserById() (DB lookup).
//   This ran on EVERY page render — including /, /news, /blogs, /about —
//   pages that have zero need for session data.
//   With 836 invocations, this was the single biggest cost driver.
//
// HOW SessionProvider WORKS WITHOUT pre-fetched session:
//   SessionProvider with no `session` prop simply fetches /api/auth/session
//   on the CLIENT when a component calls useSession(). Public pages never
//   call useSession() so the fetch never happens on those pages at all.
//   Dashboard pages DO call useSession() — they get the session client-side,
//   which is fine because the middleware already verified the JWT before
//   those pages even render.
//
// RESULT: ~200-250 fewer DB lookups per deployment period.

import { Footer } from "@/components/footer/Footer";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://she-at-work-v2.vercel.app"
  ),
  title: "She At Work - Shaping the Future of Women Entrepreneurship",
  description:
    "Join a vibrant community of visionary women leaders, founders, and changemakers. Discover inspiring stories, insights, and resources.",
};

// NO auth() call — no DB lookup, no JWT crypto, no session hydration
// on public pages. This layout is now a pure static shell.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${manrope.variable} antialiased bg-background text-foreground`}
      >
        {/*
          SessionProvider without a session prop = lazy client-side session.
          Components using useSession() will fetch /api/auth/session once on mount.
          Public pages that don't use useSession() = zero session fetches.
        */}
        <SessionProvider
          refetchInterval={0}
          refetchOnWindowFocus={false}
        >
          <main className="flex min-h-screen flex-col">
            {children}
          </main>
        </SessionProvider>

        <Footer />
      </body>
    </html>
  );
}