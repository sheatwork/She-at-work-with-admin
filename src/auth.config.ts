// auth.config.ts
// Edge-safe NextAuth config — NO db imports, NO adapter here.
// This file is imported by BOTH middleware (edge) and auth.ts (Node).
// bcryptjs is edge-compatible (pure JS).

import { LoginSchema } from "@/validaton-schema";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail } from "./actions/user";

export default {
  providers: [
    Credentials({
      async authorize(credentials) {
        const validation = LoginSchema.safeParse(credentials);
        if (!validation.success) return null;

        const { email, password } = validation.data;
        const user = await findUserByEmail(email);
        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        return passwordMatch ? user : null;
      },
    }),
  ],
} satisfies NextAuthConfig;