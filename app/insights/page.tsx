"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Layout from "../components/Layout"
import { useAuth } from "../components/AuthContext"

export default function Insights() {
  const [transacoes, setTransacoes] = useState<any[]>([])

  const buscar = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")

    setTransacoes(data || [])
  }

  useEffect(() => {
    buscar()
  }, [])
  const { user } = useAuth()
  const hoje = new Date()
  const mesAtual = hoje.getMonth()
  const anoAtual = hoje.getFullYear()
  const [analiseIA, setAnaliseIA] = useState("")
  const [loading, setLoading] = useState(false)

  const mesPassado = mesAtual === 0 ? 11 : mesAtual - 1
  const anoMesPassado = mesAtual === 0 ? anoAtual - 1 : anoAtual

  const filtrarMes = (mes: number, ano: number) => {
    return transacoes.filter((t) => {
      const d = new Date(t.data)
      return d.getMonth() === mes && d.getFullYear() === ano
    })
  }

  const calcular = (lista: any[]) => {
    const entradas = lista
      .filter((t) => t.tipo === "entrada")
      .reduce((acc, t) => acc + Number(t.valor), 0)

    const saidas = lista
      .filter((t) => t.tipo === "saida")
      .reduce((acc, t) => acc + Number(t.valor), 0)

    return {
      entradas,
      saidas,
      lucro: entradas - saidas
    }
  }

  const atual = calcular(filtrarMes(mesAtual, anoAtual))
  const passado = calcular(filtrarMes(mesPassado, anoMesPassado))

  const diferenca = atual.lucro - passado.lucro

  const alerta = () => {
    if (atual.lucro < 0) {
      return "⚠️ Você está no prejuízo este mês"
    }
    if (diferenca < 0) {
      return "📉 Seu lucro caiu em relação ao mês passado"
    }
    if (diferenca > 0) {
      return "📈 Seu lucro aumentou este mês"
    }
    return "Tudo está estável"
  }

  function Card({ titulo, valor }: any) {
    return (
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-sm text-gray-500">{titulo}</h2>
        <p className="text-xl font-bold">R$ {valor}</p>
      </div>
    )
  }

  const gerarInsightsIA = async () => {
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        transacoes,
        user_id: user.id
      })
    })

    const data = await res.json()

    if (data.erro) {
      alert(data.erro)
      return
    }

    setAnaliseIA(data.resposta)
  }
  return (
    <Layout>
      <div className="flex flex-col gap-4">

        <h1 className="text-2xl font-bold">
          Saúde Financeira
        </h1>

        {/* CARDS */}
        <div className="grid grid-cols-3 gap-4">
          <Card titulo="Lucro do mês" valor={atual.lucro} />
          <Card titulo="Mês passado" valor={passado.lucro} />
          <Card titulo="Diferença" valor={diferenca} />
        </div>

        {/* ALERTA */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
          <p className="font-semibold">
            {alerta()}
          </p>
        </div>

        {/* DETALHES */}
        <div className="bg-white rounded-xl p-4 shadow">
          <h2 className="font-bold mb-2">
            Detalhamento do mês atual
          </h2>

          <p>Entradas: R$ {atual.entradas}</p>
          <p>Saídas: R$ {atual.saidas}</p>
          <p>Lucro: R$ {atual.lucro}</p>
        </div>

      </div>

      <button
        onClick={gerarInsightsIA}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Gerando..." : "Gerar insights com IA"}
      </button>

      {analiseIA && (
        <div className="bg-blue-50 p-4 rounded mt-4">
          <p>{analiseIA}</p>
        </div>
      )}
    </Layout>
  )
}