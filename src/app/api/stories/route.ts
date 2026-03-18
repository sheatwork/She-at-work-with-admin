// app/api/story-submissions/route.ts
// PUBLIC: Submit a new story
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { StorySubmissionsTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from 'nodemailer';

// ─── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TITLE = 300;
const MAX_STORY = 50_000; // ~10,000 words — prevent huge payloads

// ─── Email configuration ────────────────────────────────────────────────────────

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  });
};

// Logo URL
const LOGO_URL = "https://sheatwork.com/_next/image?url=%2Flogo.png&w=384&q=75";

// Brand colors (consistent with contact form)
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  lightBg: '#f5f5f5',
  lightAccent: '#f8f5ff',
  border: '#eee',
  text: '#333',
  lightText: '#999'
};

// ─── Email templates ───────────────────────────────────────────────────────────

const getAdminStoryEmailHTML = (data: { 
  name: string; 
  email: string; 
  phone?: string; 
  title: string; 
  story: string; 
  businessName?: string; 
  industry?: string;
  images?: string[];
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Story Submission</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${COLORS.text}; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="text-align: center; padding: 20px 0; background: ${COLORS.gradient}; border-radius: 10px 10px 0 0;">
          <img src="${LOGO_URL}" alt="SheAtWork Logo" style="max-width: 150px; height: auto;">
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: ${COLORS.secondary}; margin-top: 0;">📖 New Story Submission</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; width: 120px;"><strong>Name:</strong></td>
              <td style="padding: 10px 0;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Email:</strong></td>
              <td style="padding: 10px 0;"><a href="mailto:${data.email}" style="color: ${COLORS.primary};">${data.email}</a></td>
            </tr>
            ${data.phone ? `
            <tr>
              <td style="padding: 10px 0;"><strong>Phone:</strong></td>
              <td style="padding: 10px 0;"><a href="tel:${data.phone}" style="color: ${COLORS.primary};">${data.phone}</a></td>
            </tr>
            ` : ''}
            ${data.businessName ? `
            <tr>
              <td style="padding: 10px 0;"><strong>Business Name:</strong></td>
              <td style="padding: 10px 0;">${data.businessName}</td>
            </tr>
            ` : ''}
            ${data.industry ? `
            <tr>
              <td style="padding: 10px 0;"><strong>Industry:</strong></td>
              <td style="padding: 10px 0;">${data.industry}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0;"><strong>Story Title:</strong></td>
              <td style="padding: 10px 0;"><strong>${data.title}</strong></td>
            </tr>
          </table>
          
          <div style="margin-top: 20px;">
            <h3 style="color: ${COLORS.secondary};">Story Content:</h3>
            <div style="background-color: ${COLORS.lightBg}; padding: 20px; border-radius: 5px; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${data.story.replace(/\n/g, '<br>')}</div>
          </div>

          ${data.images && data.images.length > 0 ? `
          <div style="margin-top: 20px;">
            <h3 style="color: ${COLORS.secondary};">Images:</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
              ${data.images.map((url, index) => `
                <a href="${url}" target="_blank" style="display: block; text-decoration: none;">
                  <img src="${url}" alt="Story image ${index + 1}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 5px; border: 1px solid ${COLORS.border};">
                </a>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 20px 0;">
          
          <p style="font-size: 12px; color: ${COLORS.lightText}; text-align: center;">
            This story was submitted through the SheAtWork website.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getUserStoryEmailHTML = (data: { 
  name: string; 
  title: string;
  businessName?: string;
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Sharing Your Story</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${COLORS.text}; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="text-align: center; padding: 20px 0; background: ${COLORS.gradient}; border-radius: 10px 10px 0 0;">
          <img src="${LOGO_URL}" alt="SheAtWork Logo" style="max-width: 150px; height: auto;">
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Thank You for Sharing Your Story! 🌟</h2>
          
          <p>Dear ${data.name},</p>
          
          <p>Thank you for sharing your inspiring story with us! We're honored that you've chosen to be part of the SheAtWork community.</p>
          
          <p>We have received your story: <strong>"${data.title}"</strong>${data.businessName ? ` about your business <strong>${data.businessName}</strong>` : ''}.</p>
          
          <div style="background-color: ${COLORS.lightAccent}; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${COLORS.primary};">
            <h3 style="color: ${COLORS.secondary}; margin-top: 0;">What happens next?</h3>
            <ul style="padding-left: 20px; margin-bottom: 0;">
              <li>Our team will review your story within 2-3 business days</li>
              <li>We may reach out if we need any additional information or clarification</li>
              <li>Once approved, your story will be featured on our website to inspire others</li>
              <li>We'll notify you when your story goes live</li>
            </ul>
          </div>
          
          <p>Your story has the power to inspire and motivate other women entrepreneurs. Thank you for being brave enough to share your journey with us.</p>
          
          <p>In the meantime, feel free to explore other inspiring stories on our website!</p>
          
          <p>Warm regards,<br>
          <strong>The SheAtWork Team</strong></p>
          
          <hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 20px 0;">
          
          <p style="font-size: 12px; color: ${COLORS.lightText}; text-align: center;">
            This is an automated confirmation email. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ─── Email sending function ───────────────────────────────────────────────────

async function sendStoryEmails(submissionData: any) {
  const transporter = createTransporter();
  
  try {
    // Send email to admin (info@kommune.in)
    await transporter.sendMail({
      from: `"SheAtWork Stories" <${process.env.MAIL_USERNAME}>`,
      to: `${process.env.ADMIN_MAIL_USERNAME}`,
      subject: `📖 New Story Submission: ${submissionData.title}`,
      html: getAdminStoryEmailHTML(submissionData),
    });

    // Send thank you email to user
    await transporter.sendMail({
      from: `"SheAtWork" <${process.env.MAIL_USERNAME}>`,
      to: submissionData.email,
      subject: 'Thank You for Sharing Your Story with SheAtWork',
      html: getUserStoryEmailHTML({ 
        name: submissionData.name, 
        title: submissionData.title,
        businessName: submissionData.businessName
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

// ─── POST /api/story-submissions ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // FIX: guard against non-JSON bodies (e.g. accidental form posts)
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, message: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { name, email, phone, title, story, businessName, industry, images } = body;

    // ── Required field presence ───────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !title?.trim() || !story?.trim()) {
      return NextResponse.json(
        { success: false, message: "name, email, title and story are required" },
        { status: 400 }
      );
    }

    // ── Format + length validation ────────────────────────────────────────────
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    if (title.trim().length > MAX_TITLE) {
      return NextResponse.json(
        { success: false, message: `Title must be ${MAX_TITLE} characters or fewer` },
        { status: 400 }
      );
    }
    if (story.trim().length > MAX_STORY) {
      return NextResponse.json(
        { success: false, message: `Story must be ${MAX_STORY} characters or fewer` },
        { status: 400 }
      );
    }

    if (images !== undefined && images !== null) {
      if (
        !Array.isArray(images) ||
        images.some((url: any) => typeof url !== "string" || !url.trim())
      ) {
        return NextResponse.json(
          { success: false, message: "images must be an array of URL strings" },
          { status: 400 }
        );
      }
    }

    // Prepare submission data
    const submissionData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      title: title.trim(),
      story: story.trim(),
      businessName: businessName?.trim() || null,
      industry: industry?.trim() || null,
      images: images || null,
    };

    // ── Insert ────────────────────────────────────────────────────────────────
    const [submission] = await db
      .insert(StorySubmissionsTable)
      .values(submissionData)
      .returning();

    // ── Send emails ──────────────────────────────────────────────────────────
    try {
      await sendStoryEmails(submissionData);
    } catch (emailError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[EMAIL ERROR]", emailError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Story submitted successfully",
        data: submission,
      },
      { status: 201 }
    );
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/story-submissions]", err);
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}