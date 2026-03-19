/*eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from "dayjs";
import nodemailer from "nodemailer";

const API_KEY = process.env.NEON_API_KEY!;
const PROJECT_ID = process.env.NEON_PROJECT_ID!;
const BASE_BRANCH = process.env.NEON_BASE_BRANCH || "production";

const current = dayjs().format("YYYY-MM");
const previous = dayjs().subtract(1, "month").format("YYYY-MM");

const newBranch = `backup-${current}`;
const oldBranch = `backup-${previous}`;

const baseUrl = `https://console.neon.tech/api/v2/projects/${PROJECT_ID}`;

async function sendEmail(subject: string, content: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: true,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  });

  await transporter.sendMail({
    from: `SheAtWork Backup <${process.env.MAIL_USERNAME}>`,
    to: process.env.BACKUP_NOTIFY_EMAIL,
    subject,
    html: content
  });

  console.log("📧 Email sent");
}

async function getBranches() {
  const res = await fetch(`${baseUrl}/branches`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });

  if (!res.ok) throw new Error("Failed to fetch branches");

  return res.json();
}

async function createBranch() {
  const data = await getBranches();

  const parent = data.branches.find((b: any) => b.name === BASE_BRANCH);
  if (!parent) throw new Error(`Base branch "${BASE_BRANCH}" not found`);

  const exists = data.branches.find((b: any) => b.name === newBranch);
  if (exists) {
    console.log("⚠️ Backup already exists");
    return false;
  }

  const res = await fetch(`${baseUrl}/branches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      branch: {
        name: newBranch,
        parent_id: parent.id
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Create branch failed: " + err);
  }

  console.log("✅ Backup branch created");
  return true;
}

async function deleteOldBranch() {
  const data = await getBranches();
  const branch = data.branches.find((b: any) => b.name === oldBranch);

  if (!branch) {
    console.log("ℹ️ No old backup");
    return;
  }

  const res = await fetch(`${baseUrl}/branches/${branch.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${API_KEY}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Delete failed: " + err);
  }

  console.log("🗑 Old backup deleted");
}

export async function GET() {
  try {
    console.log("📦 Neon backup cron started");

    const created = await createBranch();
    await deleteOldBranch();

    await sendEmail(
      "Neon Backup Success",
      `
      <h2>Backup Completed</h2>
      <p>Branch: ${newBranch}</p>
      <p>Time: ${new Date()}</p>
      <p>Status: ${created ? "Created new backup" : "Backup already existed"}</p>
      `
    );

    return Response.json({ success: true });

  } catch (e: any) {
    console.error("❌ Backup failed:", e.message);

    await sendEmail(
      "Neon Backup FAILED",
      `
      <h2>Backup Failed</h2>
      <p>Error: ${e.message}</p>
      <p>Time: ${new Date()}</p>
      `
    );

    return Response.json({ error: e.message }, { status: 500 });
  }
}