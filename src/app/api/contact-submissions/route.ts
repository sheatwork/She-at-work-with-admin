// app/api/contact-submissions/route.ts
// PUBLIC: Submit a contact message
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { ContactSubmissionsTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from 'nodemailer';

// ─── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME      = 200;
const MAX_SUBJECT   = 300;
const MAX_MESSAGE   = 10_000;

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

// Brand colors
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  lightBg: '#f5f5f5',
  border: '#eee',
  text: '#333',
  lightText: '#999'
};

// ─── Email templates ───────────────────────────────────────────────────────────

const getAdminEmailHTML = (data: { name: string; email: string; phone?: string; subject?: string; message: string }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${COLORS.text}; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="text-align: center; padding: 20px 0; background: ${COLORS.gradient}; border-radius: 10px 10px 0 0;">
          <img src="${LOGO_URL}" alt="SheAtWork Logo" style="max-width: 150px; height: auto;">
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: ${COLORS.secondary}; margin-top: 0;">📬 New Contact Form Submission</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; width: 100px;"><strong>Name:</strong></td>
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
            ${data.subject ? `
            <tr>
              <td style="padding: 10px 0;"><strong>Subject:</strong></td>
              <td style="padding: 10px 0;">${data.subject}</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="margin-top: 20px;">
            <h3 style="color: ${COLORS.secondary};">Message:</h3>
            <p style="background-color: ${COLORS.lightBg}; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${data.message}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 20px 0;">
          
          <p style="font-size: 12px; color: ${COLORS.lightText}; text-align: center;">
            This email was sent from the contact form on SheAtWork website.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getUserEmailHTML = (data: { name: string; subject?: string }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Contacting Us</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${COLORS.text}; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="text-align: center; padding: 20px 0; background: ${COLORS.gradient}; border-radius: 10px 10px 0 0;">
          <img src="${LOGO_URL}" alt="SheAtWork Logo" style="max-width: 150px; height: auto;">
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Thank You for Contacting Us! ✨</h2>
          
          <p>Dear ${data.name},</p>
          
          <p>Thank you for reaching out to us. We have received your ${
            data.subject ? `message regarding "${data.subject}"` : 'message'
          } and appreciate you taking the time to contact us.</p>
          
          <p>Our team will review your message and get back to you as soon as possible. We strive to respond to all inquiries within 24-48 hours.</p>
          
          <div style="background-color: #f8f5ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${COLORS.primary};">
            <h3 style="color: ${COLORS.secondary}; margin-top: 0;">What to expect next:</h3>
            <ul style="padding-left: 20px;">
              <li>Our team will review your inquiry</li>
              <li>We may contact you for additional information if needed</li>
              <li>You'll receive a detailed response from the appropriate department</li>
            </ul>
          </div>
          
          <p>In the meantime, feel free to explore our website for more information about our services and initiatives.</p>
          
          <p>Best regards,<br>
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

async function sendEmails(submissionData: any) {
  const transporter = createTransporter();
  
  try {
    // Send email to admin (info@kommune.in)
    await transporter.sendMail({
      from: `"SheAtWork Contact" <${process.env.MAIL_USERNAME}>`,
      to: `${process.env.ADMIN_MAIL_USERNAME}`,
      subject: `📬 New Contact Form Submission: ${submissionData.subject || 'No Subject'}`,
      html: getAdminEmailHTML(submissionData),
    });

    // Send thank you email to user
    await transporter.sendMail({
      from: `"SheAtWork" <${process.env.MAIL_USERNAME}>`,
      to: submissionData.email,
      subject: 'Thank You for Contacting SheAtWork',
      html: getUserEmailHTML({ 
        name: submissionData.name, 
        subject: submissionData.subject 
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

// ─── POST /api/contact-submissions ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // FIX: guard against non-JSON bodies
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

    const { name, email, phone, subject, message } = body;

    // ── Required field presence ───────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, message: "name, email and message are required" },
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

    if (name.trim().length > MAX_NAME) {
      return NextResponse.json(
        { success: false, message: `Name must be ${MAX_NAME} characters or fewer` },
        { status: 400 }
      );
    }
    if (subject && subject.trim().length > MAX_SUBJECT) {
      return NextResponse.json(
        { success: false, message: `Subject must be ${MAX_SUBJECT} characters or fewer` },
        { status: 400 }
      );
    }
    if (message.trim().length > MAX_MESSAGE) {
      return NextResponse.json(
        { success: false, message: `Message must be ${MAX_MESSAGE} characters or fewer` },
        { status: 400 }
      );
    }

    // Prepare submission data
    const submissionData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || null,
      message: message.trim(),
    };

    // ── Insert into database ─────────────────────────────────────────────────
    const [submission] = await db
      .insert(ContactSubmissionsTable)
      .values(submissionData)
      .returning();

    // ── Send emails ──────────────────────────────────────────────────────────
    try {
      await sendEmails(submissionData);
    } catch (emailError) {
      // Log email error but don't fail the request
      if (process.env.NODE_ENV === "development") {
        console.error("[EMAIL ERROR]", emailError);
      }
      // You might want to implement a queue or retry mechanism here
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been submitted successfully",
        data: submission,
      },
      { status: 201 }
    );
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/contact-submissions]", err);
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}