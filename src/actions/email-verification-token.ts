import { db } from "@/db";
import { EmailVerificationTokenTable } from "@/db/schema";

import { eq } from "drizzle-orm";

interface EmailVerificationTokenData {
  email: string;
  token: string;
  expiresAt: Date;
}

export async function createEmailVerificationToken(
  data: EmailVerificationTokenData
) {
  try {
    console.log(
      `Creating email-verification-token for user with email: ${data.email}`
    );
    const results = await db
      .insert(EmailVerificationTokenTable)
      .values({
        email: data.email,
        token: data.token,
        expiresAt: data.expiresAt,
      })
      .returning();
    return results[0] || null;
  } catch (error) {
    console.log(
      `Error creating email-verification-token for user with email: ${data.email}`
    );
    throw error;
  }
}

export async function deleteEmailVerificationToken(id: string) {
  try {
    // console.log(`Deleting email-verification-token with id: ${id}`);
    await db
      .delete(EmailVerificationTokenTable)
      .where(eq(EmailVerificationTokenTable.id, id));
  } catch (error) {
    console.error(
      `Error deleting email-verification-token with id: ${id}`,
      error
    );
    throw error;
  }
}

export async function findEmailVerificationTokenByToken(token: string) {
  try {
    // console.log(`Finding email-verification-token by token: ${token}`);
    return await db.query.EmailVerificationTokenTable.findFirst({
      where: eq(EmailVerificationTokenTable.token, token),
    });
  } catch (error) {
    console.error(
      `Error finding email-verification-token by token ${token}`,
      error
    );
    throw error;
  }
}

export async function findEmailVerificationTokenByEmail(email: string) {
  try {
    // console.log(`Finding email-verification-token by email: ${email}`);
    return await db.query.EmailVerificationTokenTable.findFirst({
      where: eq(EmailVerificationTokenTable.email, email),
    });
  } catch (error) {
    console.error(
      `Error finding email-verification-token by email ${email}`,
      error
    );
    throw error;
  }
}
