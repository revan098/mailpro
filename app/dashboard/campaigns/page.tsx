"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"

type EmailLog = {
  id: string
  to_email: string
  mode: string
  subject: string | null
  status: string
  sent_at: string
}

const MODE_LABELS: Record<string, string> = {
  hr_outreach: "HR Outreach", client_approach: "Client Approach",
  reply_generator: "Reply Generator", follow_up: "Follow Up",
  linkedin: "LinkedIn Note", referral: "Referral Ask",
  thank_you: "Thank You", apology: "Apology", cold_dm: "Cold Pitch",
}

export default function CampaignsPage() {
  const supabase = createClient()
  const [logs,    setLogs]    = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [active,  setActive]  = useState<string | null>(null)

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("email_logs").select("*").eq("user_id", user.id).order("sent_at", { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  // Group logs by mode → treat each mode as a "campaign"
  const campaigns = Object.entries(
    logs.reduce((acc, log) => {
      if (!acc[log.mode]) acc[log.mode] = []
      acc[log.mode].push(log)
      return acc
    }, {} as Record<string, EmailLog[]>)
  ).map(([mode, items]) => ({
    mode,
    label:    MODE_LABELS[mode] || mode,
    total:    items.length,
    success:  items.filter(i => i.status === "sent").length,
    failed:   items.filter(i => i.status === "failed").length,
    lastSent: items[0]?.sent_at,
    items,
  })).sort((a,b) => b.total - a.total)

  return (
    <>
      <style>{`
        .campaigns{padding:26px 30px}
        .page-title{font-family:'Syne',sans-serif;font-size:1.7rem;font-weight:800;color:#fff;margin-bottom:4px}
        .page-title em{color:#FF6200;font-style:normal}
        .page-sub{font-size:0.8rem;color:#555;margin-bottom:24px}
        .camp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:24px}
        .camp-card{background:#111;border:2px solid #1e1e1e;border-radius:14px;padding:18px;cursor:pointer;transition:all 0.18s}
        .camp-card:hover{border-color:#FF6200;transform:translateY(-2px)}
        .camp-card.on{border-color:#FF6200;background:#131313}
        .camp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .camp-name{font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:800;color:#ddd}
        .camp-date{font-size:0.68rem;color:#444;font-weight:700}
        .camp-stats{display:flex;gap:10px;margin-bottom:12px}
        .camp-stat{background:#1a1a1a;border-radius:8px;padding:8px 12px;text-align:center;flex:1}
        .camp-stat-num{font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:#FF6200}
        .camp-stat-lbl{font-size:0.58rem;color:#555;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
        .camp-bar-wrap{width:100%;height:5px;background:#1e1e1e;border-radius:3px;overflow:hidden}
        .camp-bar{height:100%;background:#22c55e;border-radius:3px;transition:width 0.4s}
        .detail-section{background:#111;border:2px solid #1e1e1e;border-radius:14px;overflow:hidden;animation:rise 0.3s ease both}
        @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .detail-header{padding:16px 18px;border-bottom:1px solid #1e1e1e;display:flex;align-items:center;justify-content:space-between}
        .detail-title{font-family:'Syne',sans-serif;font-size:0.85rem;font-weight:800;color:#FF6200;letter-spacing:2px;text-transform:uppercase}
        .close-btn{background:#1a1a1a;border:1.5px solid #2a2a2a;color:#777;font-family:'Syne',sans-serif;font-size:0.72rem;font-weight:800;border-radius:7px;padding:6px 12px;cursor:pointer;transition:all 0.15s}
        .close-btn:hover{border-color:#FF6200;color:#FF6200}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:0.6rem;font-weight:800;color:#555;letter-spacing:2px;text-transform:uppercase;padding:10px 14px;border-bottom:1px solid #1a1a1a}
        td{padding:11px 14px;font-size:0.82rem;font-weight:600;color:#ccc;border-bottom:1px solid #161616}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#131313}
        .status-sent{background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid #22c55e;font-size:0.65rem;font-weight:800;padding:3px 9px;border-radius:20px}
        .status-failed{background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid #ef4444;font-size:0.65rem;font-weight:800;padding:3px 9px;border-radius:20px}
        .empty-state{text-align:center;padding:60px 20px;color:#333;font-size:0.85rem}
        .empty-state b{color:#FF6200}
      `}</style>

      <div className="campaigns">
        <div className="page-title">CAMPAIGN <em>HISTORY</em></div>
        <div className="page-sub">Your emails grouped by type — click any campaign to see all recipients</div>

        {loading ? (
          <div style={{color:"#555",padding:"40px",textAlign:"center"}}>Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">No campaigns yet.<br /><b>Send your first email</b> from the Compose tab.</div>
        ) : (
          <>
            <div className="camp-grid">
              {campaigns.map(c => (
                <div key={c.mode} className={`camp-card ${active === c.mode ? "on" : ""}`}
                  onClick={() => setActive(active === c.mode ? null : c.mode)}>
                  <div className="camp-header">
                    <div className="camp-name">{c.label}</div>
                    <div className="camp-date">
                      {c.lastSent ? new Date(c.lastSent).toLocaleDateString("en",{month:"short",day:"numeric"}) : ""}
                    </div>
                  </div>
                  <div className="camp-stats">
                    <div className="camp-stat">
                      <div className="camp-stat-num">{c.total}</div>
                      <div className="camp-stat-lbl">Sent</div>
                    </div>
                    <div className="camp-stat">
                      <div className="camp-stat-num">{c.success}</div>
                      <div className="camp-stat-lbl">Success</div>
                    </div>
                    <div className="camp-stat">
                      <div className="camp-stat-num">{c.failed}</div>
                      <div className="camp-stat-lbl">Failed</div>
                    </div>
                    <div className="camp-stat">
                      <div className="camp-stat-num">{c.total > 0 ? Math.round((c.success/c.total)*100) : 0}%</div>
                      <div className="camp-stat-lbl">Rate</div>
                    </div>
                  </div>
                  <div className="camp-bar-wrap">
                    <div className="camp-bar" style={{width:`${c.total > 0 ? (c.success/c.total)*100 : 0}%`}} />
                  </div>
                </div>
              ))}
            </div>

            {/* DETAIL VIEW */}
            {active && (() => {
              const camp = campaigns.find(c => c.mode === active)
              if (!camp) return null
              return (
                <div className="detail-section">
                  <div className="detail-header">
                    <div className="detail-title">{camp.label} — All Recipients</div>
                    <button className="close-btn" onClick={() => setActive(null)}>Close</button>
                  </div>
                  <table>
                    <thead><tr>
                      <th>Recipient</th><th>Subject</th><th>Status</th><th>Date</th>
                    </tr></thead>
                    <tbody>
                      {camp.items.map(log => (
                        <tr key={log.id}>
                          <td style={{color:"#888"}}>{log.to_email}</td>
                          <td style={{color:"#666",maxWidth:"240px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.subject || "—"}</td>
                          <td><span className={log.status === "sent" ? "status-sent" : "status-failed"}>{log.status}</span></td>
                          <td style={{color:"#555",fontSize:"0.78rem"}}>{new Date(log.sent_at).toLocaleDateString("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </>
  )
}