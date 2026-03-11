import nodemailer from "nodemailer"

// ── Helper: build transporter based on selected account ──
function getTransporter(account: string) {
  const configs: Record<string, { user: string | undefined; pass: string | undefined }> = {
    primary:   { user: process.env.GMAIL_USER,   pass: process.env.GMAIL_APP_PASSWORD },
    secondary: { user: process.env.GMAIL_USER_2, pass: process.env.GMAIL_APP_PASSWORD_2 },
    work:      { user: process.env.GMAIL_USER_3, pass: process.env.GMAIL_APP_PASSWORD_3 },
  }

  const cfg = configs[account] ?? configs.primary

  if (!cfg.user || !cfg.pass) {
    throw new Error(`Missing credentials for account: ${account}. Check your .env.local`)
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: cfg.user, pass: cfg.pass },
  })
}

export async function POST(req: Request) {
  try {
    const {
      email,
      hrEmail,
      name,
      role,
      company,
      resume,
      cc,
      bcc,
      senderAccount = "primary",
    } = await req.json()

    // Validate required fields
    if (!email)    return Response.json({ error: "Email body is required" },     { status: 400 })
    if (!hrEmail)  return Response.json({ error: "Recipient email is required" }, { status: 400 })

    const transporter = getTransporter(senderAccount)

    // Get the sender address for this account
    const senderMap: Record<string, string | undefined> = {
      primary:   process.env.GMAIL_USER,
      secondary: process.env.GMAIL_USER_2,
      work:      process.env.GMAIL_USER_3,
    }
    const senderEmail = senderMap[senderAccount] ?? process.env.GMAIL_USER

    // Build attachments if resume included
    const attachments = resume
      ? [{ filename: resume.name, content: resume.data, encoding: "base64" as const }]
      : []

    // Build mail options
    const mailOptions: nodemailer.SendMailOptions = {
      from:    `"${name || "Panda Mail"}" <${senderEmail}>`,
      to:      hrEmail,
      subject: `Application for ${role || "a position"} at ${company || "your company"}`,
      text:    email,
      attachments,
    }

    // Add CC if provided
    if (cc && cc.trim()) {
      mailOptions.cc = cc.trim()
    }

    // Add BCC if provided
    if (bcc && bcc.trim()) {
      mailOptions.bcc = bcc.trim()
    }

    await transporter.sendMail(mailOptions)

    return Response.json({
      success: true,
      message: `Email sent via ${senderAccount} account`,
      sentTo:  hrEmail,
      cc:      cc || null,
      bcc:     bcc || null,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Send email error:", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}