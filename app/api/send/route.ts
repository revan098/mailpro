import nodemailer from "nodemailer"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"

// Service-role client for DB writes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── OPTION A: Gmail OAuth transporter ──
async function getOAuthTransporter(gmail: string, refreshToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  oauth2.setCredentials({ refresh_token: refreshToken })
  const { token: accessToken } = await oauth2.getAccessToken()
  return nodemailer.createTransport({
    service: "gmail",
    auth: { type: "OAuth2", user: gmail, clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, refreshToken, accessToken: accessToken! },
  })
}

// ── OPTION B: Gmail App Password transporter ──
function getAppPasswordTransporter(account: string) {
  const map: Record<string, { user?: string; pass?: string }> = {
    primary:   { user: process.env.GMAIL_USER,   pass: process.env.GMAIL_APP_PASSWORD },
    secondary: { user: process.env.GMAIL_USER_2, pass: process.env.GMAIL_APP_PASSWORD_2 },
    work:      { user: process.env.GMAIL_USER_3, pass: process.env.GMAIL_APP_PASSWORD_3 },
  }
  const cfg = map[account] ?? map.primary
  if (!cfg.user || !cfg.pass) throw new Error(`No credentials for account: ${account}. Add GMAIL_USER and GMAIL_APP_PASSWORD to Vercel env vars.`)
  return { transporter: nodemailer.createTransport({ service: "gmail", auth: { user: cfg.user, pass: cfg.pass } }), from: cfg.user }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorised" }, { status: 401 })

    const {
      email, hrEmail, name, role, company,
      resume, cc, bcc, senderAccount = "primary", mode = "hr_outreach"
    } = await req.json()

    if (!email)   return Response.json({ error: "Email body required" },    { status: 400 })
    if (!hrEmail) return Response.json({ error: "Recipient email required" }, { status: 400 })

    // ── LOOK UP USER'S GMAIL CONFIG ──
    const colMap: Record<string, string> = { primary:"gmail_user", secondary:"gmail_user_2", work:"gmail_user_3" }
    const metMap: Record<string, string> = { primary:"gmail_method", secondary:"gmail_method_2", work:"gmail_method_3" }
    const tokMap: Record<string, string> = { primary:"gmail_token", secondary:"gmail_token_2", work:"gmail_token_3" }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single()

    let transporter: nodemailer.Transporter
    let fromEmail: string

    if (profile?.[metMap[senderAccount]] === "oauth" && profile?.[tokMap[senderAccount]] && profile?.[colMap[senderAccount]]) {
      // ── USE OAUTH (Option A) ──
      fromEmail   = profile[colMap[senderAccount]]
      transporter = await getOAuthTransporter(fromEmail, profile[tokMap[senderAccount]])
    } else if (profile?.[colMap[senderAccount]]) {
      // ── USE APP PASSWORD (Option B) ──
      const { transporter: t, from } = getAppPasswordTransporter(senderAccount)
      transporter = t
      fromEmail   = from || profile[colMap[senderAccount]]
    } else {
      // ── FALLBACK to env vars ──
      const { transporter: t, from } = getAppPasswordTransporter(senderAccount)
      transporter = t
      fromEmail   = from || process.env.GMAIL_USER || ""
    }

    const subject = `Application for ${role || "a position"}${company ? " at " + company : ""}`

    const mailOptions: nodemailer.SendMailOptions = {
      from:        `"${name || "Panda Mail"}" <${fromEmail}>`,
      to:          hrEmail,
      subject,
      text:        email,
      attachments: resume ? [{ filename: resume.name, content: resume.data, encoding: "base64" }] : [],
    }
    if (cc?.trim())  mailOptions.cc  = cc.trim()
    if (bcc?.trim()) mailOptions.bcc = bcc.trim()

    await transporter.sendMail(mailOptions)

    // ── LOG SUCCESS ──
    await supabase.from("email_logs").insert({
      user_id:  userId,
      to_email: hrEmail,
      cc_email: cc?.trim() || null,
      bcc_email: bcc?.trim() || null,
      mode,
      subject,
      status:  "sent",
      sent_at: new Date().toISOString(),
    })

    return Response.json({ success: true, sentFrom: fromEmail })

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("Send error:", msg)

    // ── LOG FAILURE ──
    try {
      const { userId } = await auth()
      if (userId) {
        const body = await req.clone().json().catch(() => ({}))
        await supabase.from("email_logs").insert({
          user_id:  userId,
          to_email: body.hrEmail || "unknown",
          mode:     body.mode || "hr_outreach",
          status:   "failed",
          sent_at:  new Date().toISOString(),
        })
      }
    } catch {}

    return Response.json({ error: msg }, { status: 500 })
  }
}