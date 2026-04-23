import { NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { transacoes, user_id } = await req.json()

  const month = new Date().toISOString().slice(0, 7)

  // 🔍 buscar uso
  let { data: uso } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("user_id", user_id)
    .eq("month", month)
    .single()

  const LIMITE = 10000 // tokens free

  if (uso && uso.tokens_used >= LIMITE) {
    return NextResponse.json({
      erro: "Limite de IA atingido"
    })
  }

  // 🧠 melhorar payload (IMPORTANTE)
  const resumo = {
    totalEntradas: transacoes
      .filter((t: any) => t.tipo === "entrada")
      .reduce((a: number, t: any) => a + Number(t.valor), 0),

    totalSaidas: transacoes
      .filter((t: any) => t.tipo === "saida")
      .reduce((a: number, t: any) => a + Number(t.valor), 0)
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Você é um analista financeiro." },
      {
        role: "user",
        content: `Analise esses dados e dê insights: ${JSON.stringify(resumo)}`
      }
    ]
  })

  const resposta = response.choices[0].message.content

  // 📊 pegar tokens usados
  const tokens = response.usage?.total_tokens || 0

  // 📝 salvar uso
  if (!uso) {
    await supabase.from("ai_usage").insert({
      user_id,
      month,
      tokens_used: tokens
    })
  } else {
    await supabase
      .from("ai_usage")
      .update({
        tokens_used: uso.tokens_used + tokens
      })
      .eq("id", uso.id)
  }

  return NextResponse.json({ resposta })
}