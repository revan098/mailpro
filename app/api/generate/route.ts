import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Use customPrompt if provided, else fall back to default HR prompt
    const prompt = body.customPrompt || `Write a professional cold outreach email to HR.
Name: ${body.name}
Skills: ${body.skills}
Role: ${body.role}
Company: ${body.company}
Reason: ${body.reason}
Rules: Maximum 120 words, professional tone, clear subject line, sign off with name.`

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }]
    })

    const email = response.choices?.[0]?.message?.content || "No response generated"
    return Response.json({ email })

  } catch (error) {
    console.error("Groq error:", error)
    return Response.json({ error: "Failed to generate email" }, { status: 500 })
  }
}