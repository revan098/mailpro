"use client"
import { useState, useEffect } from "react"

type Contact = {
  id: string; name: string; company: string; email: string; position: string; tag: string; createdAt: string
}
type Tab = "compose" | "contacts" | "campaigns" | "analytics"

const emailModes = [
  { value: "hr_outreach",     icon: "📧", label: "HR Outreach",     desc: "Cold email to HR" },
  { value: "client_approach", icon: "🤝", label: "Client Approach", desc: "Business proposal" },
  { value: "reply_generator", icon: "↩️", label: "Reply Generator", desc: "Reply to an email" },
  { value: "follow_up",       icon: "🔔", label: "Follow Up",       desc: "Follow up email" },
  { value: "linkedin",        icon: "💼", label: "LinkedIn Note",   desc: "Connection message" },
  { value: "referral",        icon: "🌟", label: "Referral Ask",    desc: "Ask for referral" },
  { value: "thank_you",       icon: "🙏", label: "Thank You",       desc: "Post interview thanks" },
  { value: "apology",         icon: "😔", label: "Apology Email",   desc: "Professional apology" },
  { value: "cold_dm",         icon: "🎯", label: "Cold Pitch",      desc: "Short cold pitch" },
]

const tones = [
  { value: "formal",   emoji: "🎩", label: "Formal" },
  { value: "friendly", emoji: "😊", label: "Friendly" },
  { value: "bold",     emoji: "🔥", label: "Bold" },
  { value: "concise",  emoji: "⚡", label: "Concise" },
]

const quickIdeas = [
  { e: "🎓", t: "Fresher Outreach",  d: "First job after graduation" },
  { e: "💼", t: "Career Switch",     d: "Dev to Data Analytics" },
  { e: "🚀", t: "Startup Pitch",     d: "Offer freelance services" },
  { e: "🌟", t: "Referral Ask",      d: "Ask employee for referral" },
  { e: "🌍", t: "Remote Job",        d: "Apply for remote position" },
  { e: "📈", t: "Promotion Ask",     d: "Request internal promotion" },
  { e: "🙏", t: "Thank You Note",    d: "Post interview gratitude" },
  { e: "🎯", t: "Cold Pitch",        d: "Short punchy cold pitch" },
]

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: "compose",   icon: "✍️", label: "Compose" },
  { id: "contacts",  icon: "👥", label: "Contacts" },
  { id: "campaigns", icon: "📊", label: "Campaigns" },
  { id: "analytics", icon: "📈", label: "Analytics" },
]

const campaigns = [
  { id: 1, name: "Data Analyst Outreach", sent: 8,  opened: 5, status: "Active" },
  { id: 2, name: "Freelance Web Dev",     sent: 12, opened: 7, status: "Completed" },
]

const TAGS = ["Job Seeker", "Freelance", "Client", "Referral", "General"]

// Gmail accounts configured in .env.local
const GMAIL_ACCOUNTS = [
  { id: "primary",   label: "Primary Gmail",   envKey: "GMAIL_USER",   hint: "GMAIL_USER in .env" },
  { id: "secondary", label: "Secondary Gmail",  envKey: "GMAIL_USER_2", hint: "GMAIL_USER_2 in .env" },
  { id: "work",      label: "Work Gmail",       envKey: "GMAIL_USER_3", hint: "GMAIL_USER_3 in .env" },
]

export default function Home() {
  const [activeTab,  setActiveTab]  = useState<Tab>("compose")
  const [activeMode, setActiveMode] = useState("hr_outreach")
  const [tone,       setTone]       = useState("formal")
  const [form,       setForm]       = useState<Record<string, string>>({})
  const [email,      setEmail]      = useState("")
  const [loading,    setLoading]    = useState(false)
  const [aiAction,   setAiAction]   = useState<string | null>(null)
  const [sending,    setSending]    = useState(false)
  const [sent,       setSent]       = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [resume,     setResume]     = useState<{ name: string; data: string } | null>(null)
  const [dailySent,  setDailySent]  = useState(3)
  const [spamScore,  setSpamScore]  = useState<number | null>(null)
  const dailyLimit = 10

  // Multi-account sender
  const [selectedAccount, setSelectedAccount] = useState("primary")

  // CC / BCC
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [ccEmail,   setCcEmail]   = useState("")
  const [bccEmail,  setBccEmail]  = useState("")

  // Contacts
  const [contacts,        setContacts]        = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [showAddForm,     setShowAddForm]     = useState(false)
  const [editingContact,  setEditingContact]  = useState<Contact | null>(null)
  const [contactForm,     setContactForm]     = useState({ name:"", company:"", email:"", position:"", tag:"Job Seeker" })
  const [contactMsg,      setContactMsg]      = useState("")
  const [savingContact,   setSavingContact]   = useState(false)

  useEffect(() => {
    if (activeTab === "contacts") loadContacts()
  }, [activeTab])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleResume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => setResume({ name: file.name, data: (reader.result as string).split(",")[1] })
    reader.readAsDataURL(file)
  }

  const toneText: Record<string, string> = {
    formal:   "Use a very professional and formal tone.",
    friendly: "Use a warm, friendly and approachable tone.",
    bold:     "Use a confident, bold and assertive tone.",
    concise:  "Be extremely concise and direct. Every word counts.",
  }

  const buildPrompt = (action?: string) => {
    const t = toneText[tone]
    if (action === "rewrite") return `Rewrite this email with a ${tone} tone. Keep under 120 words:\n\n${email}`
    if (action === "shorten") return `Shorten this email to under 80 words keeping core message:\n\n${email}`
    if (action === "expand")  return `Expand this email, max 150 words:\n\n${email}`
    if (action === "grammar") return `Fix all grammar and clarity issues. Return only the corrected email:\n\n${email}`
    if (activeMode === "hr_outreach")     return `Write a cold outreach email to HR.\nName: ${form.name}\nSkills: ${form.skills}\nRole: ${form.role}\nCompany: ${form.company}\nReason: ${form.reason}\nTone: ${t}\nMax 120 words, clear subject, sign off with name.`
    if (activeMode === "client_approach") return `Write a business proposal email.\nSender: ${form.name}\nClient: ${form.clientName} at ${form.clientCompany}\nService: ${form.service}\nWhy: ${form.clientReason}\nTone: ${t}\nMax 150 words, clear CTA.`
    if (activeMode === "reply_generator") return `Reply to this email:\n---\n${form.receivedEmail}\n---\nReplier: ${form.name}\nIntent: ${form.replyIntent}\nTone: ${t}\nMax 120 words.`
    if (activeMode === "follow_up")       return `Write a follow-up email.\nName: ${form.name}\nCompany: ${form.company}\nRole: ${form.role}\nOriginal Date: ${form.originalEmailDate}\nReason: ${form.followUpReason}\nTone: ${t}\nMax 100 words, polite.`
    if (activeMode === "linkedin")        return `Write a LinkedIn connection message.\nName: ${form.name}\nTarget: ${form.targetPerson} at ${form.company}\nReason: ${form.reason}\nTone: ${t}\nMax 60 words.`
    if (activeMode === "referral")        return `Write a referral request email.\nName: ${form.name}\nEmployee: ${form.referralPerson} at ${form.company}\nRole: ${form.role}\nHow known: ${form.howKnown}\nTone: ${t}\nMax 100 words.`
    if (activeMode === "thank_you")       return `Write a thank you email after an interview.\nName: ${form.name}\nInterviewer: ${form.interviewer}\nCompany: ${form.company}\nRole: ${form.role}\nKey moment from interview: ${form.keyMoment}\nTone: ${t}\nMax 100 words, warm and genuine.`
    if (activeMode === "apology")         return `Write a professional apology email.\nName: ${form.name}\nTo: ${form.apologyTo}\nReason for apology: ${form.apologyReason}\nWhat you will do to fix it: ${form.apologyFix}\nTone: ${t}\nMax 100 words, sincere and accountable.`
    if (activeMode === "cold_dm")         return `Write a short punchy cold pitch email.\nName: ${form.name}\nTarget: ${form.coldTarget} at ${form.company}\nOffer: ${form.coldOffer}\nBenefit: ${form.coldBenefit}\nTone: ${t}\nMax 80 words, hook in first line, one clear CTA.`
    return ""
  }

  const callAI = async (prompt: string) => {
    const res = await fetch("/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customPrompt: prompt })
    })
    if (!res.ok) throw new Error("Failed")
    return (await res.json()).email as string
  }

  const generateEmail = async () => {
    try {
      setLoading(true); setSent(false); setEmail(""); setSpamScore(null)
      setEmail(await callAI(buildPrompt()))
      setSpamScore(Math.floor(Math.random() * 3) + 1)
    } catch { setEmail("Error generating email.") }
    finally { setLoading(false) }
  }

  const runAIAction = async (action: string) => {
    if (!email) return
    try { setAiAction(action); setEmail(await callAI(buildPrompt(action))) }
    catch { alert("AI action failed.") }
    finally { setAiAction(null) }
  }

  const sendEmail = async () => {
    if (!email || !form.hrEmail) return alert("Add recipient email first!")
    if (dailySent >= dailyLimit) return alert("Daily limit reached!")
    try {
      setSending(true)
      const res = await fetch("/api/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...form, resume, cc: ccEmail, bcc: bccEmail, senderAccount: selectedAccount })
      })
      if (!res.ok) throw new Error("Failed")
      setSent(true); setDailySent(d => d + 1)
    } catch { alert("Failed to send.") }
    finally { setSending(false) }
  }

  const copyEmail = () => { navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const loadContacts = async () => {
    try { setContactsLoading(true); const res = await fetch("/api/contacts"); setContacts((await res.json()).contacts || []) }
    catch { console.error("Failed") } finally { setContactsLoading(false) }
  }

  const saveContact = async () => {
    if (!contactForm.name || !contactForm.email) { setContactMsg("Name and email required!"); return }
    try {
      setSavingContact(true)
      const method = editingContact ? "PUT" : "POST"
      const body   = editingContact ? { id: editingContact.id, ...contactForm } : contactForm
      const res    = await fetch("/api/contacts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) { setContactMsg(data.error || "Error"); return }
      setContactMsg(editingContact ? "Updated!" : "Contact added!")
      setContactForm({ name:"", company:"", email:"", position:"", tag:"Job Seeker" })
      setShowAddForm(false); setEditingContact(null); loadContacts()
      setTimeout(() => setContactMsg(""), 3000)
    } catch { setContactMsg("Something went wrong.") } finally { setSavingContact(false) }
  }

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return
    const res = await fetch(`/api/contacts?id=${id}`, { method: "DELETE" })
    if (res.ok) loadContacts()
  }

  const startEdit = (c: Contact) => {
    setEditingContact(c); setContactForm({ name:c.name, company:c.company, email:c.email, position:c.position, tag:c.tag }); setShowAddForm(true)
  }
  const cancelContactForm = () => {
    setShowAddForm(false); setEditingContact(null); setContactForm({ name:"", company:"", email:"", position:"", tag:"Job Seeker" }); setContactMsg("")
  }

  const wordCount  = email.trim().split(/\s+/).filter(Boolean).length
  const limitPct   = (dailySent / dailyLimit) * 100
  const limitColor = limitPct >= 90 ? "#ef4444" : limitPct >= 60 ? "#f59e0b" : "#22c55e"
  const acct       = GMAIL_ACCOUNTS.find(a => a.id === selectedAccount)!

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Nunito:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;width:100%;overflow:hidden;background:#090909}
        body{font-family:'Nunito',sans-serif;color:#fff}
        .app{display:grid;grid-template-columns:230px 1fr 430px;grid-template-rows:58px 44px calc(100vh - 102px);height:100vh;width:100vw}

        /* TOPBAR */
        .topbar{grid-column:1/-1;background:#111;border-bottom:3px solid #FF6200;display:flex;align-items:center;padding:0 22px;gap:12px}
        .logo-box{width:38px;height:38px;background:#FF6200;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;animation:glow 2.5s ease-in-out infinite}
        @keyframes glow{0%,100%{box-shadow:0 0 22px rgba(255,98,0,0.5)}50%{box-shadow:0 0 40px rgba(255,98,0,1),0 0 70px rgba(255,98,0,0.35)}}
        .logo-name{font-family:'Syne',sans-serif;font-size:1.45rem;font-weight:800;letter-spacing:3px;color:#fff}
        .logo-name em{color:#FF6200;font-style:normal}
        .ai-badge{background:#FF6200;color:#000;font-size:0.58rem;font-weight:800;padding:3px 9px;border-radius:20px;letter-spacing:1.5px}
        .topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px}
        .pill{background:#1c1c1c;border:1.5px solid #2e2e2e;border-radius:8px;padding:5px 12px;font-size:0.73rem;font-weight:700;color:#777;white-space:nowrap}
        .pill b{color:#FF6200}
        .daily-pill{display:flex;align-items:center;gap:8px;background:#1c1c1c;border:1.5px solid #2e2e2e;border-radius:8px;padding:5px 12px}
        .daily-bar-wrap{width:55px;height:5px;background:#2a2a2a;border-radius:3px;overflow:hidden}
        .daily-bar{height:100%;border-radius:3px;transition:width 0.4s;background:${limitColor};width:${limitPct}%}

        /* TABS */
        .tabs{grid-column:1/-1;background:#0f0f0f;border-bottom:1px solid #1e1e1e;display:flex;align-items:center;padding:0 22px;gap:4px}
        .tab-btn{display:flex;align-items:center;gap:7px;padding:10px 18px;border-radius:8px 8px 0 0;cursor:pointer;border:none;background:transparent;font-family:'Nunito',sans-serif;font-size:0.82rem;font-weight:700;color:#555;transition:all 0.18s;border-bottom:2px solid transparent;white-space:nowrap}
        .tab-btn:hover{color:#aaa;background:#1a1a1a}
        .tab-btn.on{color:#FF6200;border-bottom-color:#FF6200;background:#161616}

        /* SIDEBAR */
        .sidebar{background:#111;border-right:1px solid #1e1e1e;padding:14px 10px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;height:100%}
        .sec-label{font-size:0.58rem;font-weight:800;color:#333;letter-spacing:3px;text-transform:uppercase;padding:0 10px;margin:12px 0 6px}
        .sec-label:first-child{margin-top:0}
        .nav-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:10px;cursor:pointer;border:2px solid transparent;background:transparent;width:100%;text-align:left;transition:all 0.18s}
        .nav-item:hover{background:#1c1c1c;border-color:#2a2a2a}
        .nav-item.on{background:rgba(255,98,0,0.13);border-color:#FF6200}
        .nav-icon{width:30px;height:30px;border-radius:8px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;transition:background 0.18s}
        .nav-item.on .nav-icon{background:#FF6200}
        .nav-t{font-size:0.82rem;font-weight:800;color:#bbb;display:block;line-height:1.2}
        .nav-s{font-size:0.63rem;color:#555;display:block;margin-top:1px}
        .nav-item.on .nav-t{color:#FF6200}
        .nav-item.on .nav-s{color:#a04800}
        .sdiv{height:1px;background:#1e1e1e;margin:8px 4px}
        .tone-btn{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:9px;cursor:pointer;border:2px solid transparent;background:transparent;width:100%;transition:all 0.18s;margin-bottom:2px}
        .tone-btn:hover{background:#1c1c1c}
        .tone-btn.on{background:rgba(255,98,0,0.11);border-color:#FF6200}
        .tone-emoji{font-size:16px;width:24px;text-align:center;flex-shrink:0}
        .tone-lbl{font-size:0.83rem;font-weight:700;color:#888}
        .tone-btn.on .tone-lbl{color:#fff}
        .tips-box{margin:6px 4px 0;background:#151515;border:1px solid #202020;border-radius:10px;padding:11px}
        .tip-row{display:flex;gap:7px;font-size:0.71rem;color:#555;margin-bottom:6px;line-height:1.4}
        .tip-row:last-child{margin-bottom:0}
        .tip-arr{color:#FF6200;flex-shrink:0}

        /* FORM PANEL */
        .form-panel{background:#090909;padding:20px 24px;overflow-y:auto;border-right:1px solid #1e1e1e;height:100%}
        .fph{margin-bottom:18px}
        .fph h2{font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;letter-spacing:1px;color:#fff;line-height:1}
        .fph h2 em{color:#FF6200;font-style:normal}
        .fph p{font-size:0.78rem;color:#555;margin-top:5px;font-weight:500}
        .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
        .field label{font-size:0.65rem;font-weight:800;color:#FF6200;letter-spacing:2px;text-transform:uppercase}
        .field input,.field textarea,.field select{background:#151515;border:2px solid #252525;border-radius:10px;padding:11px 14px;color:#fff;font-family:'Nunito',sans-serif;font-size:0.9rem;font-weight:600;outline:none;transition:all 0.2s;resize:none;width:100%}
        .field input::placeholder,.field textarea::placeholder{color:#333;font-weight:400}
        .field input:focus,.field textarea:focus,.field select:focus{border-color:#FF6200;background:#191919;box-shadow:0 0 0 4px rgba(255,98,0,0.1)}
        .field select option{background:#1a1a1a}
        .field textarea{height:90px;line-height:1.6}
        .upload-btn{border:2px dashed #282828;border-radius:12px;padding:12px 15px;display:flex;align-items:center;gap:11px;cursor:pointer;transition:all 0.2s;background:#141414;margin-bottom:14px}
        .upload-btn:hover{border-color:#FF6200;background:#181818}
        .upload-btn input{display:none}
        .upload-ico{width:38px;height:38px;flex-shrink:0;background:linear-gradient(135deg,#FF6200,#FF9500);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px}
        .upload-txt strong{display:block;font-size:0.85rem;font-weight:700;color:#ddd}
        .upload-txt small{font-size:0.68rem;color:#555;margin-top:2px;display:block}
        .upload-txt .ok{color:#FF6200}
        .gen-btn{width:100%;background:linear-gradient(135deg,#FF6200,#FF9500);color:#000;font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:800;letter-spacing:2px;border:none;border-radius:12px;padding:14px;cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden}
        .gen-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent);transform:translateX(-100%);transition:transform 0.55s}
        .gen-btn:hover::after{transform:translateX(100%)}
        .gen-btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(255,98,0,0.55)}
        .gen-btn:disabled{opacity:0.42;cursor:not-allowed;transform:none;box-shadow:none}
        .ideas{margin-top:20px}
        .ideas-title{font-size:0.6rem;font-weight:800;color:#282828;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
        .ig{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .ic{background:#131313;border:2px solid #1e1e1e;border-radius:11px;padding:12px;cursor:pointer;transition:all 0.18s}
        .ic:hover{border-color:#FF6200;background:rgba(255,98,0,0.07);transform:translateY(-2px)}
        .ic-top{display:flex;align-items:center;gap:7px;margin-bottom:3px}
        .ic-emoji{font-size:17px}
        .ic-title{font-size:0.83rem;font-weight:800;color:#ddd}
        .ic-desc{font-size:0.67rem;color:#555;line-height:1.4}

        /* OUTPUT PANEL */
        .out-panel{background:#090909;padding:20px;display:flex;flex-direction:column;gap:11px;overflow-y:auto;height:100%}
        .out-header{display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .out-header h3{font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:800;letter-spacing:1.5px;color:#fff}
        .out-header h3 em{color:#FF6200;font-style:normal}
        .out-actions{display:flex;gap:6px;flex-wrap:wrap}
        .act-btn{background:#181818;border:2px solid #262626;border-radius:8px;padding:6px 12px;font-size:0.7rem;font-weight:800;color:#777;cursor:pointer;transition:all 0.18s;white-space:nowrap}
        .act-btn:hover{border-color:#FF6200;color:#FF6200;background:rgba(255,98,0,0.08)}
        .act-btn.green{border-color:#22c55e;color:#22c55e;background:rgba(34,197,94,0.08)}
        .act-btn:disabled{opacity:0.4;cursor:not-allowed}
        .ai-tools{display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0}
        .ai-tool-btn{flex:1;min-width:70px;background:#141414;border:2px solid #222;border-radius:8px;padding:7px 8px;font-size:0.7rem;font-weight:800;color:#888;cursor:pointer;transition:all 0.18s;text-align:center}
        .ai-tool-btn:hover{border-color:#FF6200;color:#FF6200;background:rgba(255,98,0,0.07)}
        .ai-tool-btn.loading{color:#FF6200;border-color:#FF6200;animation:pulse 1s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}

        /* SENDER ACCOUNT SELECTOR */
        .sender-section{background:#131313;border:2px solid #1e1e1e;border-radius:12px;padding:14px;flex-shrink:0}
        .sender-title{font-size:0.62rem;font-weight:800;color:#FF6200;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}
        .sender-cards{display:flex;gap:7px}
        .sender-card{flex:1;background:#1a1a1a;border:2px solid #252525;border-radius:9px;padding:9px 10px;cursor:pointer;transition:all 0.18s;text-align:center}
        .sender-card:hover{border-color:#FF6200}
        .sender-card.on{border-color:#FF6200;background:rgba(255,98,0,0.1)}
        .sender-card-icon{font-size:18px;margin-bottom:4px}
        .sender-card-label{font-size:0.65rem;font-weight:800;color:#888;display:block;line-height:1.3}
        .sender-card.on .sender-card-label{color:#FF6200}
        .sender-card-hint{font-size:0.58rem;color:#444;display:block;margin-top:2px}
        .sender-card.on .sender-card-hint{color:#a04800}

        /* CC/BCC */
        .ccbcc-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px;flex-shrink:0}
        .ccbcc-label{font-size:0.7rem;font-weight:800;color:#555;letter-spacing:1px;text-transform:uppercase;transition:color 0.18s}
        .ccbcc-toggle:hover .ccbcc-label{color:#FF6200}
        .ccbcc-arrow{font-size:10px;color:#555;transition:all 0.18s}
        .ccbcc-arrow.open{transform:rotate(90deg);color:#FF6200}
        .ccbcc-fields{display:flex;flex-direction:column;gap:7px;animation:rise 0.25s ease both;flex-shrink:0}
        .ccbcc-row{display:flex;align-items:center;gap:8px}
        .ccbcc-tag{font-size:0.65rem;font-weight:800;color:#FF6200;letter-spacing:1px;text-transform:uppercase;width:30px;flex-shrink:0}
        .ccbcc-input{flex:1;background:#151515;border:2px solid #252525;border-radius:8px;padding:9px 13px;color:#fff;font-family:'Nunito',sans-serif;font-size:0.88rem;font-weight:600;outline:none;transition:all 0.2s}
        .ccbcc-input:focus{border-color:#FF6200;box-shadow:0 0 0 3px rgba(255,98,0,0.1)}
        .ccbcc-input::placeholder{color:#333;font-weight:400}

        /* SPAM */
        .spam-row{display:flex;align-items:center;gap:10px;flex-shrink:0}
        .spam-label{font-size:0.68rem;font-weight:800;color:#555;letter-spacing:1px;text-transform:uppercase}
        .spam-dots{display:flex;gap:4px}
        .spam-dot{width:9px;height:9px;border-radius:50%;background:#222}
        .spam-dot.green{background:#22c55e}
        .spam-dot.yellow{background:#f59e0b}
        .spam-dot.red{background:#ef4444}
        .spam-text{font-size:0.68rem;font-weight:700;color:#22c55e}

        /* EMPTY / SHIMMER */
        .empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center}
        .empty-panda{font-size:72px;opacity:0.15;animation:bob 4s ease-in-out infinite}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        .empty h4{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;letter-spacing:2.5px;color:#2a2a2a}
        .empty p{font-size:0.78rem;color:#222;line-height:1.75}
        .empty p b{color:#FF6200}
        .shim-wrap{flex:1}
        .shim{background:linear-gradient(90deg,#161616 25%,#222 50%,#161616 75%);background-size:200% 100%;animation:shim 1.4s infinite;border-radius:7px;margin-bottom:10px}
        @keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .email-out{flex:1;display:flex;flex-direction:column;gap:10px;animation:rise 0.4s ease both}
        @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .meta-row{display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0}
        .meta-tag{background:#171717;border:1.5px solid #242424;border-radius:6px;padding:3px 10px;font-size:0.65rem;font-weight:700;color:#666}
        .meta-tag b{color:#FF6200}
        .email-box{flex:1;min-height:160px;background:#131313;border:2px solid #252525;border-radius:12px;padding:14px;color:#e5e5e5;font-family:'Nunito',sans-serif;font-size:0.9rem;font-weight:500;line-height:1.9;resize:none;outline:none;transition:border-color 0.2s}
        .email-box:focus{border-color:#FF6200}
        .word-row{display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
        .word-count{font-size:0.68rem;color:#333;font-weight:700}
        .send-row{display:flex;gap:8px;align-items:center;flex-shrink:0}
        .send-input{flex:1;background:#151515;border:2px solid #252525;border-radius:10px;padding:11px 14px;color:#fff;font-family:'Nunito',sans-serif;font-size:0.88rem;font-weight:600;outline:none;transition:all 0.2s}
        .send-input:focus{border-color:#FF6200;box-shadow:0 0 0 4px rgba(255,98,0,0.1)}
        .send-input::placeholder{color:#333;font-weight:400}
        .send-btn{background:#FF6200;color:#000;font-family:'Syne',sans-serif;font-size:0.85rem;font-weight:800;letter-spacing:1.5px;border:none;border-radius:10px;padding:11px 18px;cursor:pointer;transition:all 0.18s;white-space:nowrap}
        .send-btn:hover{background:#FF9500;transform:translateY(-1px);box-shadow:0 6px 20px rgba(255,98,0,0.5)}
        .send-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
        .success-banner{background:rgba(34,197,94,0.1);border:2px solid #22c55e;border-radius:12px;padding:13px 16px;font-size:0.85rem;font-weight:700;color:#22c55e;display:flex;align-items:center;gap:9px;flex-shrink:0}

        /* CONTACTS */
        .tab-content{padding:22px 26px;overflow-y:auto;height:100%}
        .tab-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .tab-header h2{font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:#fff}
        .tab-header h2 em{color:#FF6200;font-style:normal}
        .add-btn{background:#FF6200;color:#000;font-family:'Syne',sans-serif;font-size:0.78rem;font-weight:800;letter-spacing:1px;border:none;border-radius:9px;padding:9px 16px;cursor:pointer;transition:all 0.18s}
        .add-btn:hover{background:#FF9500;transform:translateY(-1px)}
        .cancel-btn{background:#1a1a1a;color:#888;font-family:'Syne',sans-serif;font-size:0.78rem;font-weight:800;letter-spacing:1px;border:2px solid #2a2a2a;border-radius:9px;padding:9px 16px;cursor:pointer;transition:all 0.18s}
        .cancel-btn:hover{border-color:#FF6200;color:#FF6200}
        .contact-form-card{background:#131313;border:2px solid #FF6200;border-radius:14px;padding:20px;margin-bottom:20px;animation:rise 0.3s ease both}
        .contact-form-title{font-family:'Syne',sans-serif;font-size:0.9rem;font-weight:800;color:#FF6200;letter-spacing:1.5px;margin-bottom:16px}
        .form-btns{display:flex;gap:10px;align-items:center;margin-top:4px}
        .contact-msg-ok{font-size:0.78rem;font-weight:800;color:#22c55e;padding:7px 0}
        .contact-msg-err{font-size:0.78rem;font-weight:800;color:#ef4444;padding:7px 0}
        .token-section{margin-bottom:16px}
        .token-title{font-size:0.6rem;font-weight:800;color:#FF6200;letter-spacing:2px;text-transform:uppercase;margin-bottom:9px}
        .token-list{display:flex;gap:7px;flex-wrap:wrap}
        .token{background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:7px;padding:5px 12px;font-size:0.71rem;font-weight:700;color:#888;cursor:pointer;transition:all 0.15s}
        .token:hover{border-color:#FF6200;color:#FF6200;background:rgba(255,98,0,0.08)}
        .contacts-table{width:100%;border-collapse:collapse}
        .contacts-table th{text-align:left;font-size:0.63rem;font-weight:800;color:#FF6200;letter-spacing:2px;text-transform:uppercase;padding:0 13px 11px;border-bottom:1px solid #1e1e1e}
        .contacts-table td{padding:12px 13px;font-size:0.84rem;font-weight:600;color:#ccc;border-bottom:1px solid #161616;vertical-align:middle}
        .contacts-table tr:hover td{background:#111}
        .tag-chip{background:rgba(255,98,0,0.12);border:1px solid rgba(255,98,0,0.3);color:#FF6200;font-size:0.65rem;font-weight:800;padding:3px 9px;border-radius:20px;white-space:nowrap}
        .tbl-actions{display:flex;gap:5px}
        .tbl-btn{background:#1a1a1a;border:1.5px solid #252525;border-radius:7px;padding:5px 11px;font-size:0.68rem;font-weight:800;color:#777;cursor:pointer;transition:all 0.15s}
        .tbl-btn:hover{border-color:#FF6200;color:#FF6200}
        .tbl-btn.del:hover{border-color:#ef4444;color:#ef4444}
        .empty-contacts{text-align:center;padding:50px 20px;color:#333;font-size:0.86rem}
        .empty-contacts b{color:#FF6200}

        /* CAMPAIGNS / ANALYTICS */
        .camp-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
        .camp-card{background:#131313;border:2px solid #1e1e1e;border-radius:13px;padding:16px;transition:all 0.18s}
        .camp-card:hover{border-color:#FF6200}
        .camp-name{font-size:0.93rem;font-weight:800;color:#ddd;margin-bottom:10px}
        .camp-stats{display:flex;gap:11px;margin-bottom:11px}
        .camp-stat{background:#1a1a1a;border-radius:8px;padding:8px 12px;text-align:center}
        .camp-stat-num{font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:#FF6200}
        .camp-stat-lbl{font-size:0.6rem;color:#555;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
        .camp-status{font-size:0.68rem;font-weight:800;padding:3px 10px;border-radius:20px}
        .camp-status.active{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid #22c55e}
        .camp-status.done{background:rgba(148,163,184,0.1);color:#94a3b8;border:1px solid #94a3b8}
        .ana-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px;margin-bottom:20px}
        .ana-card{background:#131313;border:2px solid #1e1e1e;border-radius:13px;padding:18px;text-align:center;transition:all 0.18s}
        .ana-card:hover{border-color:#FF6200}
        .ana-num{font-family:'Syne',sans-serif;font-size:1.9rem;font-weight:800;color:#FF6200}
        .ana-lbl{font-size:0.7rem;font-weight:700;color:#555;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px}
        .deliv-section{background:#131313;border:2px solid #1e1e1e;border-radius:13px;padding:18px}
        .deliv-title{font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:800;color:#fff;margin-bottom:13px}
        .deliv-title em{color:#FF6200;font-style:normal}
        .deliv-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #1a1a1a}
        .deliv-row:last-child{border-bottom:none}
        .deliv-key{font-size:0.8rem;font-weight:700;color:#888}
        .deliv-val{font-size:0.8rem;font-weight:800}
        .deliv-val.good{color:#22c55e}
        .deliv-val.warn{color:#f59e0b}
        .deliv-val.bad{color:#ef4444}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#252525;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#FF6200}
      `}</style>

      <div className="app">

        {/* TOPBAR */}
        <div className="topbar">
          <div className="logo-box">🐼</div>
          <div className="logo-name">PANDZ <em>MAIL</em></div>
          <div className="ai-badge">AI POWERED</div>
          <div className="topbar-right">
            <div className="pill">Model: <b>Groq LLaMA</b></div>
            <div className="pill">Tone: <b style={{textTransform:"capitalize"}}>{tone}</b></div>
            <div className="pill">From: <b>{acct.label}</b></div>
            <div className="daily-pill">
              <span style={{fontSize:"0.7rem",fontWeight:800,color:"#777"}}>Daily: <b style={{color:limitColor}}>{dailySent}/{dailyLimit}</b></span>
              <div className="daily-bar-wrap"><div className="daily-bar" /></div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ══ COMPOSE TAB ══ */}
        {activeTab === "compose" && <>
          <div className="sidebar">
            <div className="sec-label">Email Type</div>
            {emailModes.map(m => (
              <button key={m.value} className={`nav-item ${activeMode === m.value ? "on" : ""}`}
                onClick={() => { setActiveMode(m.value); setEmail(""); setSent(false) }}>
                <div className="nav-icon">{m.icon}</div>
                <div><span className="nav-t">{m.label}</span><span className="nav-s">{m.desc}</span></div>
              </button>
            ))}
            <div className="sdiv" />
            <div className="sec-label">Tone</div>
            {tones.map(t => (
              <button key={t.value} className={`tone-btn ${tone === t.value ? "on" : ""}`} onClick={() => setTone(t.value)}>
                <span className="tone-emoji">{t.emoji}</span><span className="tone-lbl">{t.label}</span>
              </button>
            ))}
            <div className="sdiv" />
            <div className="sec-label">Tips</div>
            <div className="tips-box">
              {["Specific skills = better results","Customize per company","Edit before sending","Attach resume for HR","Follow up after 1 week","CC mentor on applications"].map((tip,i) => (
                <div key={i} className="tip-row"><span className="tip-arr">▸</span>{tip}</div>
              ))}
            </div>
          </div>

          {/* FORM PANEL */}
          <div className="form-panel">
            <div className="fph">
              <h2>{emailModes.find(m => m.value === activeMode)?.label.toUpperCase()} <em>EMAIL</em></h2>
              <p>{emailModes.find(m => m.value === activeMode)?.desc} — fill in details below</p>
            </div>

            {activeMode === "hr_outreach" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Your Skills</label><input name="skills" placeholder="Python, SQL, Excel" onChange={handleChange} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Target Role</label><input name="role" placeholder="Data Analyst" onChange={handleChange} /></div>
                <div className="field"><label>Company</label><input name="company" placeholder="Wipro" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>Why This Company?</label><input name="reason" placeholder="I admire their innovation in AI..." onChange={handleChange} /></div>
              <div className="field"><label>HR Email</label><input name="hrEmail" placeholder="hr@company.com" onChange={handleChange} /></div>
            </>}
            {activeMode === "client_approach" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Client Name</label><input name="clientName" placeholder="John Smith" onChange={handleChange} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Client Company</label><input name="clientCompany" placeholder="TechCorp" onChange={handleChange} /></div>
                <div className="field"><label>Service You Offer</label><input name="service" placeholder="Analytics Dashboard" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>Why They Need It</label><input name="clientReason" placeholder="Reduce reporting time by 60%..." onChange={handleChange} /></div>
              <div className="field"><label>Client Email</label><input name="hrEmail" placeholder="client@techcorp.com" onChange={handleChange} /></div>
            </>}
            {activeMode === "reply_generator" && <>
              <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
              <div className="field"><label>Paste Received Email</label><textarea name="receivedEmail" placeholder="Paste the full email you received..." onChange={handleChange} style={{height:"100px"}} /></div>
              <div className="field"><label>Your Reply Intent</label><input name="replyIntent" placeholder="Accept interview, ask for schedule..." onChange={handleChange} /></div>
              <div className="field"><label>Reply To Email</label><input name="hrEmail" placeholder="sender@company.com" onChange={handleChange} /></div>
            </>}
            {activeMode === "follow_up" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Company</label><input name="company" placeholder="Wipro" onChange={handleChange} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Role Applied For</label><input name="role" placeholder="Data Analyst" onChange={handleChange} /></div>
                <div className="field"><label>Original Email Date</label><input name="originalEmailDate" placeholder="March 1, 2026" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>Reason for Follow Up</label><input name="followUpReason" placeholder="No response after 1 week..." onChange={handleChange} /></div>
              <div className="field"><label>HR Email</label><input name="hrEmail" placeholder="hr@company.com" onChange={handleChange} /></div>
            </>}
            {activeMode === "linkedin" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Target Person</label><input name="targetPerson" placeholder="Anita Sharma" onChange={handleChange} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Their Company</label><input name="company" placeholder="Infosys" onChange={handleChange} /></div>
                <div className="field"><label>Their Email</label><input name="hrEmail" placeholder="anita@infosys.com" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>Reason for Connecting</label><input name="reason" placeholder="Admire your work in data science..." onChange={handleChange} /></div>
            </>}
            {activeMode === "referral" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Employee Name</label><input name="referralPerson" placeholder="Ravi Kumar" onChange={handleChange} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Their Company</label><input name="company" placeholder="TCS" onChange={handleChange} /></div>
                <div className="field"><label>Role You Want</label><input name="role" placeholder="Data Analyst" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>How Do You Know Them?</label><input name="howKnown" placeholder="College alumni, LinkedIn connection..." onChange={handleChange} /></div>
              <div className="field"><label>Their Email</label><input name="hrEmail" placeholder="ravi@tcs.com" onChange={handleChange} /></div>
            </>}
            {activeMode === "thank_you" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Interviewer Name</label><input name="interviewer" placeholder="Ms. Anita Sharma" onChange={handleChange} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Company</label><input name="company" placeholder="Wipro" onChange={handleChange} /></div>
                <div className="field"><label>Role Interviewed For</label><input name="role" placeholder="Data Analyst" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>Key Moment From Interview</label><input name="keyMoment" placeholder="Discussed their data pipeline project..." onChange={handleChange} /></div>
              <div className="field"><label>Interviewer Email</label><input name="hrEmail" placeholder="anita@wipro.com" onChange={handleChange} /></div>
            </>}
            {activeMode === "apology" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Apology To</label><input name="apologyTo" placeholder="Mr. Ravi Kumar" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>Reason for Apology</label><input name="apologyReason" placeholder="Missed the deadline for the report..." onChange={handleChange} /></div>
              <div className="field"><label>What You Will Do to Fix It</label><input name="apologyFix" placeholder="Submit by tomorrow EOD with extra detail..." onChange={handleChange} /></div>
              <div className="field"><label>Their Email</label><input name="hrEmail" placeholder="ravi@company.com" onChange={handleChange} /></div>
            </>}
            {activeMode === "cold_dm" && <>
              <div className="row2">
                <div className="field"><label>Your Name</label><input name="name" placeholder="Prathab Murugan" onChange={handleChange} /></div>
                <div className="field"><label>Target Person</label><input name="coldTarget" placeholder="John Smith" onChange={handleChange} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Their Company</label><input name="company" placeholder="TechCorp" onChange={handleChange} /></div>
                <div className="field"><label>Their Email</label><input name="hrEmail" placeholder="john@techcorp.com" onChange={handleChange} /></div>
              </div>
              <div className="field"><label>Your Offer / Service</label><input name="coldOffer" placeholder="Custom React dashboard in 2 weeks" onChange={handleChange} /></div>
              <div className="field"><label>Key Benefit For Them</label><input name="coldBenefit" placeholder="Save 10 hours/week on reporting..." onChange={handleChange} /></div>
            </>}

            {activeMode !== "reply_generator" && (
              <label className="upload-btn">
                <input type="file" accept=".pdf" onChange={handleResume} />
                <div className="upload-ico">📎</div>
                <div className="upload-txt">
                  {resume ? <strong className="ok">{resume.name} — Attached</strong> : <strong>Attach Resume (PDF)</strong>}
                  <small>{resume ? "Click to change" : "Optional — PDF only"}</small>
                </div>
              </label>
            )}

            <button className="gen-btn" onClick={generateEmail} disabled={loading}>
              {loading ? "GENERATING..." : "GENERATE EMAIL WITH AI"}
            </button>

            {!email && !loading && (
              <div className="ideas">
                <div className="ideas-title">Quick Inspiration</div>
                <div className="ig">
                  {quickIdeas.map(i => (
                    <div key={i.t} className="ic">
                      <div className="ic-top"><span className="ic-emoji">{i.e}</span><span className="ic-title">{i.t}</span></div>
                      <div className="ic-desc">{i.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OUTPUT PANEL */}
          <div className="out-panel">
            <div className="out-header">
              <h3>GENERATED <em>EMAIL</em></h3>
              {email && (
                <div className="out-actions">
                  <button className={`act-btn ${copied ? "green" : ""}`} onClick={copyEmail}>{copied ? "Copied!" : "Copy"}</button>
                  <button className="act-btn" onClick={() => { setEmail(""); setSent(false); setSpamScore(null) }}>Clear</button>
                </div>
              )}
            </div>

            {/* ── SENDER ACCOUNT SELECTOR ── */}
            <div className="sender-section">
              <div className="sender-title">Send From Account</div>
              <div className="sender-cards">
                {GMAIL_ACCOUNTS.map(a => (
                  <div key={a.id} className={`sender-card ${selectedAccount === a.id ? "on" : ""}`}
                    onClick={() => setSelectedAccount(a.id)}>
                    <div className="sender-card-icon">{a.id === "primary" ? "Prathab" : a.id === "secondary" ? "GenPandz" : "Suhash"}</div>
                    <span className="sender-card-label">{a.label}</span>
                    <span className="sender-card-hint">{a.hint}</span>
                  </div>
                ))}
              </div>
            </div>

            {email && !loading && (
              <div className="ai-tools">
                {[{id:"rewrite",label:"Rewrite"},{id:"shorten",label:"Shorten"},{id:"expand",label:"Expand"},{id:"grammar",label:"Fix Grammar"}].map(a => (
                  <button key={a.id} className={`ai-tool-btn ${aiAction === a.id ? "loading" : ""}`}
                    onClick={() => runAIAction(a.id)} disabled={!!aiAction}>
                    {aiAction === a.id ? "..." : a.label}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="shim-wrap">
                {[55,90,72,88,40,80,65,50,78].map((w,i) => (
                  <div key={i} className="shim" style={{width:`${w}%`,height:i===0?"10px":"13px"}} />
                ))}
              </div>
            )}

            {!email && !loading && (
              <div className="empty">
                <div className="empty-pandz">🐼</div>
                <h4>READY TO WRITE</h4>
                <p>Fill in the form and click<br /><b>Generate Email with AI</b></p>
              </div>
            )}

            {email && !loading && (
              <div className="email-out">
                <div className="meta-row">
                  <div className="meta-tag">Mode: <b>{emailModes.find(m=>m.value===activeMode)?.label}</b></div>
                  <div className="meta-tag">Tone: <b style={{textTransform:"capitalize"}}>{tone}</b></div>
                  <div className="meta-tag">From: <b>{acct.label}</b></div>
                  {resume && <div className="meta-tag">Resume: <b>Attached</b></div>}
                </div>

                {spamScore !== null && (
                  <div className="spam-row">
                    <span className="spam-label">Spam Score</span>
                    <div className="spam-dots">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`spam-dot ${n<=spamScore?(spamScore<=2?"green":spamScore<=3?"yellow":"red"):""}`} />
                      ))}
                    </div>
                    <span className="spam-text">{spamScore<=2?"Low Risk":spamScore<=3?"Medium":"High Risk"}</span>
                  </div>
                )}

                <textarea className="email-box" value={email} onChange={e => setEmail(e.target.value)} />

                <div className="word-row">
                  <span className="word-count">{wordCount} words</span>
                  <span className="word-count">Edit before sending</span>
                </div>

                {/* CC / BCC TOGGLE */}
                <div className="ccbcc-toggle" onClick={() => setShowCcBcc(v => !v)}>
                  <span className={`ccbcc-arrow ${showCcBcc ? "open" : ""}`}>▶</span>
                  <span className="ccbcc-label">CC / BCC</span>
                  {(ccEmail || bccEmail) && <span style={{fontSize:"0.65rem",color:"#FF6200",fontWeight:800}}>({[ccEmail&&"CC",bccEmail&&"BCC"].filter(Boolean).join(", ")})</span>}
                </div>

                {showCcBcc && (
                  <div className="ccbcc-fields">
                    <div className="ccbcc-row">
                      <span className="ccbcc-tag">CC</span>
                      <input className="ccbcc-input" placeholder="cc@example.com" value={ccEmail} onChange={e => setCcEmail(e.target.value)} />
                    </div>
                    <div className="ccbcc-row">
                      <span className="ccbcc-tag">BCC</span>
                      <input className="ccbcc-input" placeholder="bcc@example.com" value={bccEmail} onChange={e => setBccEmail(e.target.value)} />
                    </div>
                  </div>
                )}

                {!sent ? (
                  <div className="send-row">
                    <input className="send-input" name="hrEmail" placeholder="To: recipient@email.com" defaultValue={form.hrEmail} onChange={handleChange} />
                    <button className="send-btn" onClick={sendEmail} disabled={sending || dailySent >= dailyLimit}>
                      {sending ? "SENDING..." : dailySent >= dailyLimit ? "LIMIT REACHED" : "SEND"}
                    </button>
                  </div>
                ) : (
                  <div className="success-banner">
                    Sent to <b>{form.hrEmail}</b>
                    {ccEmail && <> · CC: <b>{ccEmail}</b></>}
                    {bccEmail && <> · BCC: <b>{bccEmail}</b></>}
                    {" "}via <b>{acct.label}</b>
                  </div>
                )}
              </div>
            )}
          </div>
        </>}

        {/* ══ CONTACTS TAB ══ */}
        {activeTab === "contacts" && (
          <div className="tab-content" style={{gridColumn:"2/-1"}}>
            <div className="tab-header">
              <h2>CONTACT <em>MANAGER</em></h2>
              <div style={{display:"flex",gap:"10px"}}>
                {showAddForm
                  ? <button className="cancel-btn" onClick={cancelContactForm}>Cancel</button>
                  : <button className="add-btn" onClick={() => setShowAddForm(true)}>+ Add Contact</button>}
              </div>
            </div>
            {showAddForm && (
              <div className="contact-form-card">
                <div className="contact-form-title">{editingContact ? "EDIT CONTACT" : "NEW CONTACT"}</div>
                <div className="row2">
                  <div className="field"><label>Full Name *</label><input placeholder="Anita Sharma" value={contactForm.name} onChange={e => setContactForm(f=>({...f,name:e.target.value}))} /></div>
                  <div className="field"><label>Email *</label><input placeholder="anita@company.com" value={contactForm.email} onChange={e => setContactForm(f=>({...f,email:e.target.value}))} /></div>
                </div>
                <div className="row2">
                  <div className="field"><label>Company</label><input placeholder="Infosys" value={contactForm.company} onChange={e => setContactForm(f=>({...f,company:e.target.value}))} /></div>
                  <div className="field"><label>Position</label><input placeholder="HR Manager" value={contactForm.position} onChange={e => setContactForm(f=>({...f,position:e.target.value}))} /></div>
                </div>
                <div className="field" style={{maxWidth:"220px"}}>
                  <label>Tag</label>
                  <select value={contactForm.tag} onChange={e => setContactForm(f=>({...f,tag:e.target.value}))}>
                    {TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {contactMsg && <div className={contactMsg.includes("!")?"contact-msg-ok":"contact-msg-err"}>{contactMsg}</div>}
                <div className="form-btns">
                  <button className="gen-btn" style={{maxWidth:"200px",padding:"11px",fontSize:"0.82rem",letterSpacing:"1.5px"}}
                    onClick={saveContact} disabled={savingContact}>
                    {savingContact?"SAVING...":editingContact?"UPDATE":"SAVE CONTACT"}
                  </button>
                  <button className="cancel-btn" onClick={cancelContactForm}>Cancel</button>
                </div>
              </div>
            )}
            <div className="token-section">
              <div className="token-title">Personalization Tokens — click to copy</div>
              <div className="token-list">
                {["{{first_name}}","{{company}}","{{position}}","{{role}}","{{date}}"].map(t => (
                  <div key={t} className="token" onClick={() => { navigator.clipboard.writeText(t); setContactMsg(`Copied ${t}`); setTimeout(()=>setContactMsg(""),2000) }}>{t}</div>
                ))}
              </div>
            </div>
            {contactsLoading ? (
              <div style={{color:"#555",padding:"20px 0"}}>Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="empty-contacts">No contacts yet.<br /><b>Click "+ Add Contact"</b> to start.</div>
            ) : (
              <table className="contacts-table">
                <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Position</th><th>Tag</th><th>Actions</th></tr></thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td style={{fontWeight:700,color:"#ddd"}}>{c.name}</td>
                      <td style={{color:"#888"}}>{c.company||"—"}</td>
                      <td style={{color:"#666"}}>{c.email}</td>
                      <td style={{color:"#666"}}>{c.position||"—"}</td>
                      <td><span className="tag-chip">{c.tag}</span></td>
                      <td><div className="tbl-actions">
                        <button className="tbl-btn" onClick={()=>startEdit(c)}>Edit</button>
                        <button className="tbl-btn del" onClick={()=>deleteContact(c.id)}>Delete</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ CAMPAIGNS TAB ══ */}
        {activeTab === "campaigns" && (
          <div className="tab-content" style={{gridColumn:"2/-1"}}>
            <div className="tab-header">
              <h2>CAMPAIGN <em>HISTORY</em></h2>
              <button className="add-btn">+ New Campaign</button>
            </div>
            <div className="camp-grid">
              {campaigns.map(c => (
                <div key={c.id} className="camp-card">
                  <div className="camp-name">{c.name}</div>
                  <div className="camp-stats">
                    <div className="camp-stat"><div className="camp-stat-num">{c.sent}</div><div className="camp-stat-lbl">Sent</div></div>
                    <div className="camp-stat"><div className="camp-stat-num">{c.opened}</div><div className="camp-stat-lbl">Opened</div></div>
                    <div className="camp-stat"><div className="camp-stat-num">{Math.round(c.opened/c.sent*100)}%</div><div className="camp-stat-lbl">Open Rate</div></div>
                  </div>
                  <span className={`camp-status ${c.status==="Active"?"active":"done"}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ ANALYTICS TAB ══ */}
        {activeTab === "analytics" && (
          <div className="tab-content" style={{gridColumn:"2/-1"}}>
            <div className="tab-header"><h2>EMAIL <em>ANALYTICS</em></h2></div>
            <div className="ana-grid">
              {[{num:dailySent,lbl:"Sent Today"},{num:20,lbl:"Total Sent"},{num:"60%",lbl:"Open Rate"},{num:2,lbl:"Bounces"},{num:5,lbl:"Replies"},{num:dailyLimit-dailySent,lbl:"Remaining Today"}].map((a,i) => (
                <div key={i} className="ana-card"><div className="ana-num">{a.num}</div><div className="ana-lbl">{a.lbl}</div></div>
              ))}
            </div>
            <div className="deliv-section">
              <div className="deliv-title">DELIVERABILITY <em>ENGINE</em></div>
              {[
                {k:"SPF Record",v:"Configured",c:"good"},
                {k:"DKIM Setup",v:"Configured",c:"good"},
                {k:"Domain Verified",v:"Verified",c:"good"},
                {k:"Bounce Rate",v:"2% (Healthy)",c:"good"},
                {k:"Send Pacing",v:"1-2 min delay",c:"good"},
                {k:"Daily Limit",v:`${dailySent}/${dailyLimit} used`,c:dailySent>=dailyLimit?"bad":dailySent>7?"warn":"good"},
              ].map((r,i) => (
                <div key={i} className="deliv-row"><span className="deliv-key">{r.k}</span><span className={`deliv-val ${r.c}`}>{r.v}</span></div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}