// auth.ts
// Node.js runtime only — never imported by middleware.
// Contains: DrizzleAdapter, DB callbacks, session/jwt logic.
// Middleware uses getToken() directly instead of importing this.

import authConfig from "@/auth.config";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { DefaultSession } from "next-auth";
// import { JWT } from "next-auth/jwt";
import { findUserById } from "./actions/user";
import { db } from "./db";
import { Role } from "./validaton-schema";

export type ExtendedUser = DefaultSession["user"] & {
  role: Role;
};

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error:  "/auth/error",
  },
  callbacks: {
    async signIn({ user }) {
      const existingUser = await findUserById(user.id!);
      // Block login if user doesn't exist or email not verified
      return !!(existingUser?.emailVerified);
    },

    async jwt({ token }) {
      if (!token.sub) return token;
      const existingUser = await findUserById(token.sub);
      if (!existingUser) return token;
      token.role = existingUser.role;
      return token;
    },

    async session({ session, token }) {
      if (token.sub  && session.user) session.user.id   = token.sub;
      if (token.role && session.user) session.user.role = token.role;
      return session;
    },
  },
  ...authConfig,
});