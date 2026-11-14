// app/layout.tsx
// Pure static shell: no auth(), no SessionProvider.
//
// SessionProvider lives in app/(protected)/layout.tsx. Mounted here it fetched
// /api/auth/session on every page view (next-auth's provider calls getSession()
// on mount whenever no `session` prop is passed, whether or not anything calls
// useSession()), so each visit to a cached public page still cost a function
// invocation, plus one more in every other open tab via its BroadcastChannel.

import { Footer } from "@/components/footer/Footer";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Loaded as a variable font (no `weight` list), like Inter above. One file
// covers weights 200-800. With a fixed weight list, Google Fonts intermittently
// answers with extensionless `fonts.gstatic.com/l/font?kit=...` URLs, which
// crash next/font's loader in Next 15.1 ("Cannot read properties of null
// (reading '1')") and fail the build.
const manrope = Manrope({
  subsets: ["latin"],
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
        <main className="flex min-h-screen flex-col">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}