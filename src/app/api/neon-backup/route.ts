/*eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from "dayjs";
import nodemailer from "nodemailer";

const API_KEY = process.env.NEON_API_KEY!;
const PROJECT_ID = process.env.NEON_PROJECT_ID!;
const BASE_BRANCH = process.env.NEON_BASE_BRANCH || "production";

// Computed per request, not at module load: a warm instance could otherwise
// carry last month's names into this month's run.
function branchNames() {
  return {
    newBranch: `backup-${dayjs().subtract(1, "month").format("YYYY-MM")}`,
    oldBranch: `backup-${dayjs().subtract(2, "month").format("YYYY-MM")}`,
  };
}

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
    to: process.env.ADMIN_MAIL_USERNAME,
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

async function createBranch(newBranch: string) {
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

async function deleteOldBranch(oldBranch: string) {
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

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this gate
  // anyone hitting the URL creates a Neon branch — and every branch runs its
  // own separately-billed compute endpoint.
  //
  // Fails closed: previously an unset CRON_SECRET skipped the check entirely,
  // leaving the route open to anyone.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("neon-backup: CRON_SECRET is not set; refusing to run");
    return Response.json({ error: "Not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newBranch, oldBranch } = branchNames();

  try {
    console.log("📦 Neon backup cron started");

    const created = await createBranch(newBranch);
    await deleteOldBranch(oldBranch);

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