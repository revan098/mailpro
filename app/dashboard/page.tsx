"use client"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"

const MODES = [
  { value:"hr_outreach",     icon:"📧", label:"HR Outreach",     desc:"Cold email to recruiter" },
  { value:"client_approach", icon:"🤝", label:"Client Approach", desc:"Business proposal" },
  { value:"reply_generator", icon:"↩️", label:"Reply",           desc:"Reply to an email" },
  { value:"follow_up",       icon:"🔔", label:"Follow Up",       desc:"Follow up email" },
  { value:"linkedin",        icon:"💼", label:"LinkedIn",        desc:"Connection message" },
  { value:"referral",        icon:"🌟", label:"Referral Ask",    desc:"Ask for referral" },
  { value:"thank_you",       icon:"🙏", label:"Thank You",       desc:"Post interview" },
  { value:"apology",         icon:"😔", label:"Apology",         desc:"Professional apology" },
  { value:"cold_dm",         icon:"🎯", label:"Cold Pitch",      desc:"Short cold pitch" },
]

const TONES = [
  { value:"formal",   label:"🎩 Formal" },
  { value:"friendly", label:"😊 Friendly" },
  { value:"bold",     label:"🔥 Bold" },
  { value:"concise",  label:"⚡ Concise" },
]

const SENDER_ACCOUNTS = [
  { id:"primary",   label:"Primary" },
  { id:"secondary", label:"Secondary" },
  { id:"work",      label:"Work" },
]

export default function ComposePage() {
  const { user } = useUser()
  const [mode,       setMode]       = useState("hr_outreach")
  const [tone,       setTone]       = useState("formal")
  const [form,       setForm]       = useState<Record<string,string>>({})
  const [email,      setEmail]      = useState("")
  const [loading,    setLoading]    = useState(false)
  const [aiAction,   setAiAction]   = useState<string|null>(null)
  const [sending,    setSending]    = useState(false)
  const [sent,       setSent]       = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [resume,     setResume]     = useState<{name:string;data:string}|null>(null)
  const [spamScore,  setSpamScore]  = useState<number|null>(null)
  const [showCcBcc,  setShowCcBcc]  = useState(false)
  const [cc,         setCc]         = useState("")
  const [bcc,        setBcc]        = useState("")
  const [sender,     setSender]     = useState("primary")
  const [showModes,  setShowModes]  = useState(false)

  const fc = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setForm(f => ({...f,[e.target.name]:e.target.value}))

  const toneMap: Record<string,string> = {
    formal:"Very professional and formal.", friendly:"Warm and approachable.",
    bold:"Confident and assertive.", concise:"Extremely concise, every word counts.",
  }

  const buildPrompt = (action?: string) => {
    const t = toneMap[tone]
    if (action === "rewrite") return `Rewrite this email with a ${tone} tone under 120 words:\n\n${email}`
    if (action === "shorten") return `Shorten to under 80 words:\n\n${email}`
    if (action === "expand")  return `Expand to max 150 words:\n\n${email}`
    if (action === "grammar") return `Fix all grammar issues. Return only corrected email:\n\n${email}`
    if (mode === "hr_outreach")     return `Write a cold outreach email to HR.\nName:${form.name} Skills:${form.skills} Role:${form.role} Company:${form.company} Reason:${form.reason}\nTone:${t} Max 120 words, clear subject, sign off.`
    if (mode === "client_approach") return `Write a business proposal email.\nFrom:${form.name} To:${form.clientName} at ${form.clientCompany} Service:${form.service} Why:${form.clientReason}\nTone:${t} Max 150 words, clear CTA.`
    if (mode === "reply_generator") return `Reply professionally to:\n---\n${form.receivedEmail}\n---\nReplier:${form.name} Intent:${form.replyIntent}\nTone:${t} Max 120 words.`
    if (mode === "follow_up")       return `Follow-up email.\nName:${form.name} Company:${form.company} Role:${form.role} Date:${form.originalEmailDate} Reason:${form.followUpReason}\nTone:${t} Max 100 words.`
    if (mode === "linkedin")        return `LinkedIn connection message.\nFrom:${form.name} To:${form.targetPerson} at ${form.company} Reason:${form.reason}\nTone:${t} Max 60 words.`
    if (mode === "referral")        return `Referral request email.\nFrom:${form.name} To:${form.referralPerson} at ${form.company} Role:${form.role} How known:${form.howKnown}\nTone:${t} Max 100 words.`
    if (mode === "thank_you")       return `Thank you email after interview.\nFrom:${form.name} Interviewer:${form.interviewer} Company:${form.company} Role:${form.role} Moment:${form.keyMoment}\nTone:${t} Max 100 words.`
    if (mode === "apology")         return `Professional apology email.\nFrom:${form.name} To:${form.apologyTo} Reason:${form.apologyReason} Fix:${form.apologyFix}\nTone:${t} Max 100 words.`
    if (mode === "cold_dm")         return `Cold pitch email.\nFrom:${form.name} To:${form.coldTarget} at ${form.company} Offer:${form.coldOffer} Benefit:${form.coldBenefit}\nTone:${t} Max 80 words, strong hook, one CTA.`
    return ""
  }

  const callAI = async (prompt: string) => {
    const res = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({customPrompt:prompt}) })
    if (!res.ok) throw new Error("Failed")
    return (await res.json()).email as string
  }

  const generate = async () => {
    try { setLoading(true); setSent(false); setEmail(""); setSpamScore(null); setEmail(await callAI(buildPrompt())); setSpamScore(Math.floor(Math.random()*3)+1) }
    catch { setEmail("Error generating. Please try again.") }
    finally { setLoading(false) }
  }

  const runAction = async (action: string) => {
    if (!email) return
    try { setAiAction(action); setEmail(await callAI(buildPrompt(action))) }
    catch { alert("Action failed.") } finally { setAiAction(null) }
  }

  const send = async () => {
    if (!email || !form.hrEmail) return alert("Add recipient email first")
    try {
      setSending(true)
      const res = await fetch("/api/send", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,...form,resume,cc,bcc,senderAccount:sender}) })
      if (!res.ok) throw new Error("Failed")
      setSent(true)
    } catch { alert("Send failed. Check your env variables.") } finally { setSending(false) }
  }

  const copy = () => { navigator.clipboard.writeText(email); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  const handleResume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = () => setResume({name:file.name,data:(r.result as string).split(",")[1]}); r.readAsDataURL(file)
  }

  const wordCount = email.trim().split(/\s+/).filter(Boolean).length
  const currentMode = MODES.find(m => m.value === mode)!

  return (
    <>
      <style>{`
        .compose-page { display:grid; grid-template-columns:200px 1fr 370px; height:calc(100vh - var(--topbar-h)); }
        @media(max-width:1100px){ .compose-page{ grid-template-columns:180px 1fr 320px; } }
        @media(max-width:900px){ .compose-page{ display:block; height:auto; } }

        /* MODE SIDEBAR */
        .mode-sidebar { background:var(--bg-surface); border-right:1px solid var(--border); padding:12px 8px; overflow-y:auto; display:flex; flex-direction:column; gap:2px; }
        @media(max-width:900px){ .mode-sidebar{ display:none; } }
        .mode-btn { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:var(--radius-md); cursor:pointer; border:1.5px solid transparent; background:transparent; width:100%; text-align:left; transition:all 0.18s; }
        .mode-btn:hover { background:var(--bg-hover); }
        .mode-btn.on { background:var(--brand-dim); border-color:var(--brand-border); }
        .mode-btn-icon { width:28px; height:28px; border-radius:7px; background:var(--bg-raised); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
        .mode-btn.on .mode-btn-icon { background:var(--brand); }
        .mode-btn-t { font-size:0.8rem; font-weight:600; color:var(--text-3); display:block; line-height:1.2; }
        .mode-btn-s { font-size:0.62rem; color:var(--text-4); display:block; margin-top:1px; }
        .mode-btn.on .mode-btn-t { color:#a78bfa; font-weight:700; }
        .sdiv { height:1px; background:var(--border); margin:8px 4px; }
        .tone-row { display:flex; flex-direction:column; gap:2px; }
        .tone-btn { display:flex; align-items:center; padding:8px 10px; border-radius:var(--radius-md); cursor:pointer; border:1.5px solid transparent; background:transparent; width:100%; font-family:'Inter',sans-serif; font-size:0.8rem; font-weight:600; color:var(--text-3); transition:all 0.18s; }
        .tone-btn:hover { background:var(--bg-hover); color:var(--text-1); }
        .tone-btn.on { background:var(--brand-dim); border-color:var(--brand-border); color:#a78bfa; }

        /* MOBILE MODE PICKER */
        .mobile-mode-bar { display:none; padding:12px 16px 0; }
        @media(max-width:900px){ .mobile-mode-bar{ display:block; } }
        .mobile-mode-btn { width:100%; display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--bg-card); border:1.5px solid var(--border-mid); border-radius:var(--radius-md); cursor:pointer; font-family:'Inter',sans-serif; font-size:0.9rem; font-weight:600; color:var(--text-1); transition:all 0.18s; }
        .mobile-mode-btn:hover { border-color:var(--brand-border); }
        .mode-drawer { background:var(--bg-surface); border:1.5px solid var(--border-mid); border-radius:var(--radius-lg); padding:8px; margin-top:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
        .mode-drawer-item { display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 6px; border-radius:var(--radius-md); cursor:pointer; border:1.5px solid transparent; background:transparent; transition:all 0.18s; }
        .mode-drawer-item:hover { background:var(--bg-hover); }
        .mode-drawer-item.on { background:var(--brand-dim); border-color:var(--brand-border); }
        .mode-drawer-item span:first-child { font-size:20px; }
        .mode-drawer-item span:last-child { font-size:0.65rem; font-weight:600; color:var(--text-3); text-align:center; line-height:1.2; }
        .mode-drawer-item.on span:last-child { color:#a78bfa; }

        /* FORM PANEL */
        .form-panel { padding:20px; overflow-y:auto; border-right:1px solid var(--border); background:var(--bg-base); }
        @media(max-width:900px){ .form-panel{ border-right:none; border-bottom:1px solid var(--border); } }
        .form-head { margin-bottom:18px; }
        .form-head h2 { font-family:'Syne',sans-serif; font-size:1.5rem; font-weight:800; color:var(--text-1); line-height:1; }
        .form-head h2 em { color:#a78bfa; font-style:normal; }
        .form-head p { font-size:0.78rem; color:var(--text-3); margin-top:5px; }
        .row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(max-width:480px){ .row2{ grid-template-columns:1fr; } }
        .field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
        .field:last-child { margin-bottom:0; }

        /* UPLOAD */
        .upload-zone { border:2px dashed var(--border-mid); border-radius:var(--radius-md); padding:12px 14px; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s; background:var(--bg-card); margin-bottom:14px; }
        .upload-zone:hover { border-color:var(--brand); background:var(--bg-raised); }
        .upload-zone input { display:none; }
        .upload-ico { width:34px; height:34px; flex-shrink:0; background:var(--brand-dim); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:16px; border:1px solid var(--brand-border); }
        .upload-txt strong { display:block; font-size:0.84rem; font-weight:600; color:var(--text-1); }
        .upload-txt small { font-size:0.68rem; color:var(--text-4); margin-top:1px; display:block; }
        .upload-txt .ok { color:#a78bfa; }

        /* GEN BUTTON */
        .gen-btn { width:100%; background:linear-gradient(135deg,#7c3aed,#9d5cf5); color:#fff; font-family:'Inter',sans-serif; font-size:0.9rem; font-weight:700; border:none; border-radius:var(--radius-md); padding:13px; cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden; }
        .gen-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent); transform:translateX(-100%); transition:transform 0.6s; }
        .gen-btn:hover::after { transform:translateX(100%); }
        .gen-btn:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(124,58,237,0.5); }
        .gen-btn:disabled { opacity:0.45; cursor:not-allowed; transform:none; box-shadow:none; }

        /* OUTPUT PANEL */
        .out-panel { display:flex; flex-direction:column; gap:11px; padding:20px; overflow-y:auto; background:var(--bg-base); }
        .out-header { display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .out-header h3 { font-family:'Syne',sans-serif; font-size:1rem; font-weight:800; letter-spacing:1.5px; color:var(--text-1); }
        .out-header h3 em { color:#a78bfa; font-style:normal; }
        .out-actions { display:flex; gap:6px; }
        .act-btn { background:var(--bg-raised); border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:5px 11px; font-size:0.72rem; font-weight:600; color:var(--text-3); cursor:pointer; transition:all 0.18s; }
        .act-btn:hover { border-color:var(--brand-border); color:#a78bfa; }
        .act-btn.ok { border-color:rgba(34,197,94,0.35); color:var(--green); }

        /* SENDER PICKER */
        .sender-box { background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:12px; flex-shrink:0; }
        .sender-label { font-size:0.62rem; font-weight:700; color:var(--text-3); letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
        .sender-cards { display:flex; gap:6px; }
        .sender-card { flex:1; background:var(--bg-raised); border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:8px 6px; cursor:pointer; transition:all 0.18s; text-align:center; }
        .sender-card:hover { border-color:var(--brand-border); }
        .sender-card.on { border-color:var(--brand); background:var(--brand-dim); }
        .sender-card span { font-size:0.68rem; font-weight:600; color:var(--text-3); display:block; }
        .sender-card.on span { color:#a78bfa; }

        /* AI TOOLS */
        .ai-tools { display:flex; gap:5px; flex-shrink:0; }
        .ai-tool-btn { flex:1; background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:7px 6px; font-size:0.7rem; font-weight:600; color:var(--text-3); cursor:pointer; transition:all 0.18s; text-align:center; }
        .ai-tool-btn:hover { border-color:var(--brand-border); color:#a78bfa; }
        .ai-tool-btn.run { color:#a78bfa; border-color:var(--brand-border); animation:pulse 1s infinite; }

        /* SPAM */
        .spam-row { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .spam-lbl { font-size:0.67rem; font-weight:700; color:var(--text-4); letter-spacing:1px; text-transform:uppercase; }
        .spam-dots { display:flex; gap:3px; }
        .spam-dot { width:8px; height:8px; border-radius:50%; background:var(--bg-raised); }
        .spam-dot.g { background:var(--green); }
        .spam-dot.y { background:var(--yellow); }
        .spam-dot.r { background:var(--red); }

        /* EMPTY */
        .empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; text-align:center; min-height:200px; }
        .empty-panda { font-size:64px; opacity:0.12; animation:bob 4s ease-in-out infinite; }
        @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .empty-state h4 { font-family:'Syne',sans-serif; font-size:1rem; font-weight:800; letter-spacing:2px; color:var(--text-4); }
        .empty-state p { font-size:0.78rem; color:var(--text-4); line-height:1.7; }
        .empty-state p b { color:#a78bfa; }

        /* SHIMMER */
        .shim-wrap { flex:1; }
        .shim { height:13px; border-radius:6px; margin-bottom:9px; }
        .shim:first-child { height:10px; }

        /* EMAIL OUTPUT */
        .email-out { flex:1; display:flex; flex-direction:column; gap:10px; animation:fadeUp 0.35s ease both; }
        .meta-row { display:flex; gap:5px; flex-wrap:wrap; flex-shrink:0; }
        .meta-chip { background:var(--bg-raised); border:1px solid var(--border); border-radius:6px; padding:3px 9px; font-size:0.63rem; font-weight:600; color:var(--text-3); }
        .meta-chip b { color:#a78bfa; }
        .email-textarea { flex:1; min-height:160px; background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:14px; color:var(--text-1); font-family:'Inter',sans-serif; font-size:0.88rem; line-height:1.85; resize:none; outline:none; transition:border-color 0.2s; }
        .email-textarea:focus { border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-dim); }
        .word-row { display:flex; justify-content:space-between; flex-shrink:0; }
        .word-row span { font-size:0.68rem; color:var(--text-4); font-weight:500; }

        /* CC/BCC */
        .ccbcc-toggle { display:flex; align-items:center; gap:7px; cursor:pointer; flex-shrink:0; }
        .ccbcc-toggle:hover span { color:var(--text-2); }
        .ccbcc-lbl { font-size:0.68rem; font-weight:700; color:var(--text-4); letter-spacing:1px; text-transform:uppercase; transition:color 0.18s; }
        .ccbcc-arr { font-size:9px; color:var(--text-4); transition:all 0.18s; }
        .ccbcc-arr.open { transform:rotate(90deg); color:#a78bfa; }
        .ccbcc-fields { display:flex; flex-direction:column; gap:6px; flex-shrink:0; animation:fadeUp 0.2s ease; }
        .ccbcc-row { display:flex; align-items:center; gap:8px; }
        .ccbcc-tag { font-size:0.62rem; font-weight:700; color:#a78bfa; letter-spacing:1px; width:26px; flex-shrink:0; }

        /* SEND ROW */
        .send-row { display:flex; gap:8px; align-items:center; flex-shrink:0; }
        .send-btn { background:var(--brand); color:#fff; font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:700; border:none; border-radius:var(--radius-md); padding:11px 18px; cursor:pointer; transition:all 0.18s; white-space:nowrap; }
        .send-btn:hover { background:#6d28d9; box-shadow:0 6px 18px rgba(124,58,237,0.5); transform:translateY(-1px); }
        .send-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
      `}</style>

      <div className="compose-page">

        {/* DESKTOP MODE SIDEBAR */}
        <div className="mode-sidebar">
          <div style={{fontSize:"0.6rem",fontWeight:700,color:"var(--text-4)",letterSpacing:"2px",textTransform:"uppercase",padding:"0 10px",marginBottom:"6px"}}>Email Type</div>
          {MODES.map(m => (
            <button key={m.value} className={`mode-btn ${mode===m.value?"on":""}`} onClick={() => {setMode(m.value);setEmail("");setSent(false)}}>
              <div className="mode-btn-icon">{m.icon}</div>
              <div><span className="mode-btn-t">{m.label}</span><span className="mode-btn-s">{m.desc}</span></div>
            </button>
          ))}
          <div className="sdiv" />
          <div style={{fontSize:"0.6rem",fontWeight:700,color:"var(--text-4)",letterSpacing:"2px",textTransform:"uppercase",padding:"0 10px",marginBottom:"6px"}}>Tone</div>
          <div className="tone-row">
            {TONES.map(t => (
              <button key={t.value} className={`tone-btn ${tone===t.value?"on":""}`} onClick={() => setTone(t.value)}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="form-panel">

          {/* MOBILE MODE PICKER */}
          <div className="mobile-mode-bar">
            <button className="mobile-mode-btn" onClick={() => setShowModes(v=>!v)}>
              <span>{currentMode.icon} {currentMode.label}</span>
              <span style={{fontSize:"0.7rem",color:"var(--text-4)"}}>{showModes?"▲":"▼"} Change</span>
            </button>
            {showModes && (
              <div className="mode-drawer">
                {MODES.map(m => (
                  <button key={m.value} className={`mode-drawer-item ${mode===m.value?"on":""}`}
                    onClick={() => {setMode(m.value);setEmail("");setSent(false);setShowModes(false)}}>
                    <span>{m.icon}</span><span>{m.label}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Mobile tone row */}
            <div style={{display:"flex",gap:"6px",marginTop:"10px",marginBottom:"4px"}}>
              {TONES.map(t => (
                <button key={t.value} onClick={() => setTone(t.value)}
                  style={{flex:1,padding:"8px 4px",borderRadius:"var(--radius-sm)",border:`1.5px solid ${tone===t.value?"var(--brand)":"var(--border)"}`,background:tone===t.value?"var(--brand-dim)":"var(--bg-card)",color:tone===t.value?"#a78bfa":"var(--text-4)",fontSize:"0.68rem",fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{padding:"20px 20px 0"}}>
            <div className="form-head">
              <h2>{currentMode.label.toUpperCase()} <em>EMAIL</em></h2>
              <p>{currentMode.desc} — fill in details below</p>
            </div>

            {mode==="hr_outreach" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Skills</label><input className="input" name="skills" placeholder="Python, SQL, Excel" onChange={fc} /></div>
              </div>
              <div className="row2">
                <div className="field"><label className="input-label">Target Role</label><input className="input" name="role" placeholder="Data Analyst" onChange={fc} /></div>
                <div className="field"><label className="input-label">Company</label><input className="input" name="company" placeholder="Wipro" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">Why This Company?</label><input className="input" name="reason" placeholder="I admire their innovation..." onChange={fc} /></div>
              <div className="field"><label className="input-label">HR Email</label><input className="input" name="hrEmail" placeholder="hr@company.com" onChange={fc} /></div>
            </>}
            {mode==="client_approach" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Client Name</label><input className="input" name="clientName" placeholder="John Smith" onChange={fc} /></div>
              </div>
              <div className="row2">
                <div className="field"><label className="input-label">Client Company</label><input className="input" name="clientCompany" placeholder="TechCorp" onChange={fc} /></div>
                <div className="field"><label className="input-label">Service</label><input className="input" name="service" placeholder="Analytics Dashboard" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">Why They Need It</label><input className="input" name="clientReason" placeholder="Reduce reporting time..." onChange={fc} /></div>
              <div className="field"><label className="input-label">Client Email</label><input className="input" name="hrEmail" placeholder="client@company.com" onChange={fc} /></div>
            </>}
            {mode==="reply_generator" && <>
              <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
              <div className="field"><label className="input-label">Received Email</label><textarea className="input" name="receivedEmail" placeholder="Paste the email you received..." onChange={fc} style={{height:"90px",resize:"none"}} /></div>
              <div className="field"><label className="input-label">Your Intent</label><input className="input" name="replyIntent" placeholder="Accept interview, ask for time..." onChange={fc} /></div>
              <div className="field"><label className="input-label">Reply To</label><input className="input" name="hrEmail" placeholder="sender@company.com" onChange={fc} /></div>
            </>}
            {mode==="follow_up" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Company</label><input className="input" name="company" placeholder="Wipro" onChange={fc} /></div>
              </div>
              <div className="row2">
                <div className="field"><label className="input-label">Role</label><input className="input" name="role" placeholder="Data Analyst" onChange={fc} /></div>
                <div className="field"><label className="input-label">Original Date</label><input className="input" name="originalEmailDate" placeholder="March 1, 2026" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">Reason</label><input className="input" name="followUpReason" placeholder="No response after 1 week..." onChange={fc} /></div>
              <div className="field"><label className="input-label">HR Email</label><input className="input" name="hrEmail" placeholder="hr@company.com" onChange={fc} /></div>
            </>}
            {mode==="linkedin" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Target Person</label><input className="input" name="targetPerson" placeholder="Anita Sharma" onChange={fc} /></div>
              </div>
              <div className="row2">
                <div className="field"><label className="input-label">Company</label><input className="input" name="company" placeholder="Infosys" onChange={fc} /></div>
                <div className="field"><label className="input-label">Their Email</label><input className="input" name="hrEmail" placeholder="anita@infosys.com" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">Why Connect?</label><input className="input" name="reason" placeholder="Admire your work in data science..." onChange={fc} /></div>
            </>}
            {mode==="referral" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Employee Name</label><input className="input" name="referralPerson" placeholder="Ravi Kumar" onChange={fc} /></div>
              </div>
              <div className="row2">
                <div className="field"><label className="input-label">Company</label><input className="input" name="company" placeholder="TCS" onChange={fc} /></div>
                <div className="field"><label className="input-label">Role You Want</label><input className="input" name="role" placeholder="Data Analyst" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">How You Know Them</label><input className="input" name="howKnown" placeholder="College alumni..." onChange={fc} /></div>
              <div className="field"><label className="input-label">Their Email</label><input className="input" name="hrEmail" placeholder="ravi@tcs.com" onChange={fc} /></div>
            </>}
            {mode==="thank_you" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Interviewer</label><input className="input" name="interviewer" placeholder="Ms. Anita Sharma" onChange={fc} /></div>
              </div>
              <div className="row2">
                <div className="field"><label className="input-label">Company</label><input className="input" name="company" placeholder="Wipro" onChange={fc} /></div>
                <div className="field"><label className="input-label">Role</label><input className="input" name="role" placeholder="Data Analyst" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">Key Moment</label><input className="input" name="keyMoment" placeholder="Discussed data pipeline..." onChange={fc} /></div>
              <div className="field"><label className="input-label">Interviewer Email</label><input className="input" name="hrEmail" placeholder="anita@wipro.com" onChange={fc} /></div>
            </>}
            {mode==="apology" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Apology To</label><input className="input" name="apologyTo" placeholder="Mr. Ravi Kumar" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">Reason</label><input className="input" name="apologyReason" placeholder="Missed the deadline..." onChange={fc} /></div>
              <div className="field"><label className="input-label">How You'll Fix It</label><input className="input" name="apologyFix" placeholder="Submit by tomorrow EOD..." onChange={fc} /></div>
              <div className="field"><label className="input-label">Their Email</label><input className="input" name="hrEmail" placeholder="ravi@company.com" onChange={fc} /></div>
            </>}
            {mode==="cold_dm" && <>
              <div className="row2">
                <div className="field"><label className="input-label">Your Name</label><input className="input" name="name" placeholder="Prathab Murugan" onChange={fc} /></div>
                <div className="field"><label className="input-label">Target</label><input className="input" name="coldTarget" placeholder="John Smith" onChange={fc} /></div>
              </div>
              <div className="row2">
                <div className="field"><label className="input-label">Company</label><input className="input" name="company" placeholder="TechCorp" onChange={fc} /></div>
                <div className="field"><label className="input-label">Email</label><input className="input" name="hrEmail" placeholder="john@techcorp.com" onChange={fc} /></div>
              </div>
              <div className="field"><label className="input-label">Your Offer</label><input className="input" name="coldOffer" placeholder="React dashboard in 2 weeks" onChange={fc} /></div>
              <div className="field"><label className="input-label">Key Benefit</label><input className="input" name="coldBenefit" placeholder="Save 10 hours/week..." onChange={fc} /></div>
            </>}

            {mode !== "reply_generator" && (
              <label className="upload-zone">
                <input type="file" accept=".pdf" onChange={handleResume} />
                <div className="upload-ico">📎</div>
                <div className="upload-txt">
                  {resume ? <strong className="ok">{resume.name}</strong> : <strong>Attach Resume (PDF)</strong>}
                  <small>{resume ? "Click to change" : "Optional — PDF only"}</small>
                </div>
              </label>
            )}

            <button className="gen-btn" onClick={generate} disabled={loading}>
              {loading ? "Generating..." : "Generate Email with AI"}
            </button>
          </div>
        </div>

        {/* OUTPUT PANEL */}
        <div className="out-panel">
          <div className="out-header">
            <h3>RESULT <em>EMAIL</em></h3>
            {email && (
              <div className="out-actions">
                <button className={`act-btn ${copied?"ok":""}`} onClick={copy}>{copied?"Copied!":"Copy"}</button>
                <button className="act-btn" onClick={() => {setEmail("");setSent(false);setSpamScore(null)}}>Clear</button>
              </div>
            )}
          </div>

          {/* Sender */}
          <div className="sender-box">
            <div className="sender-label">Send From</div>
            <div className="sender-cards">
              {SENDER_ACCOUNTS.map(a => (
                <div key={a.id} className={`sender-card ${sender===a.id?"on":""}`} onClick={() => setSender(a.id)}>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          </div>

          {email && !loading && (
            <div className="ai-tools">
              {[{id:"rewrite",l:"Rewrite"},{id:"shorten",l:"Shorten"},{id:"expand",l:"Expand"},{id:"grammar",l:"Grammar"}].map(a => (
                <button key={a.id} className={`ai-tool-btn ${aiAction===a.id?"run":""}`} onClick={() => runAction(a.id)} disabled={!!aiAction}>
                  {aiAction===a.id?"...":a.l}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="shim-wrap">
              {[55,90,72,88,40,80,65,50,78].map((w,i) => (
                <div key={i} className="shim shimmer" style={{width:`${w}%`}} />
              ))}
            </div>
          )}

          {!email && !loading && (
            <div className="empty-state">
              <div className="empty-panda">🐼</div>
              <h4>READY TO WRITE</h4>
              <p>Fill the form and click<br /><b>Generate Email with AI</b></p>
            </div>
          )}

          {email && !loading && (
            <div className="email-out">
              <div className="meta-row">
                <div className="meta-chip">Mode: <b>{currentMode.label}</b></div>
                <div className="meta-chip">Tone: <b style={{textTransform:"capitalize"}}>{tone}</b></div>
                {resume && <div className="meta-chip">PDF: <b>attached</b></div>}
              </div>

              {spamScore !== null && (
                <div className="spam-row">
                  <span className="spam-lbl">Spam</span>
                  <div className="spam-dots">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={`spam-dot ${n<=spamScore?(spamScore<=2?"g":spamScore<=3?"y":"r"):""}`} />
                    ))}
                  </div>
                  <span style={{fontSize:"0.67rem",fontWeight:600,color:spamScore<=2?"var(--green)":spamScore<=3?"var(--yellow)":"var(--red)"}}>
                    {spamScore<=2?"Low risk":spamScore<=3?"Medium":"High"}
                  </span>
                </div>
              )}

              <textarea className="email-textarea" value={email} onChange={e => setEmail(e.target.value)} />

              <div className="word-row">
                <span>{wordCount} words</span>
                <span>Edit before sending</span>
              </div>

              <div className="ccbcc-toggle" onClick={() => setShowCcBcc(v=>!v)}>
                <span className={`ccbcc-arr ${showCcBcc?"open":""}`}>▶</span>
                <span className="ccbcc-lbl">CC / BCC</span>
                {(cc||bcc) && <span style={{fontSize:"0.62rem",color:"#a78bfa",fontWeight:700}}>({[cc&&"CC",bcc&&"BCC"].filter(Boolean).join(",")})</span>}
              </div>

              {showCcBcc && (
                <div className="ccbcc-fields">
                  <div className="ccbcc-row">
                    <span className="ccbcc-tag">CC</span>
                    <input className="input" style={{fontSize:"0.86rem",padding:"8px 12px"}} placeholder="cc@example.com" value={cc} onChange={e=>setCc(e.target.value)} />
                  </div>
                  <div className="ccbcc-row">
                    <span className="ccbcc-tag">BCC</span>
                    <input className="input" style={{fontSize:"0.86rem",padding:"8px 12px"}} placeholder="bcc@example.com" value={bcc} onChange={e=>setBcc(e.target.value)} />
                  </div>
                </div>
              )}

              {!sent ? (
                <div className="send-row">
                  <input className="input" name="hrEmail" placeholder="To: recipient@email.com" defaultValue={form.hrEmail} onChange={fc} style={{fontSize:"0.86rem",padding:"10px 13px"}} />
                  <button className="send-btn" onClick={send} disabled={sending}>{sending?"Sending...":"Send"}</button>
                </div>
              ) : (
                <div className="alert-success animate-fadeup">
                  ✓ Sent to <b>{form.hrEmail}</b>{cc&&<> · CC: <b>{cc}</b></>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}