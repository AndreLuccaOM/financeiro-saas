"use client"

import { useState, useMemo } from "react"
import Layout from "../components/Layout"
import { useAuth } from "../components/AuthContext"
import useSWR from "swr"
import { supabase } from "../../lib/supabase"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts"

export default function Relatorios() {
  const { user } = useAuth()

  const [modal, setModal] = useState(false)
  const [relatorio, setRelatorio] = useState<string | null>(null)

  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")

  // 🔹 FETCH
  const fetchTransacoes = async (userId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(`*, categories(nome)`)
      .eq("user_id", userId)

    if (error) throw error
    return data || []
  }

  const { data: transacoes = [] } = useSWR(
    user ? ["transactions", user.id] : null,
    ([_, userId]) => fetchTransacoes(userId)
  )

  // 🔹 FILTRO
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      if (dataInicio && t.data < dataInicio) return false
      if (dataFim && t.data > dataFim) return false
      return true
    })
  }, [transacoes, dataInicio, dataFim])

  const formatarMoeda = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })

  // =========================
  // 📊 DADOS
  // =========================

  const resumo = useMemo(() => {
    let entradas = 0
    let saidas = 0

    transacoesFiltradas.forEach((t) => {
      if (t.tipo === "entrada") entradas += Number(t.valor)
      else saidas += Number(t.valor)
    })

    return {
      entradas,
      saidas,
      saldo: entradas - saidas
    }
  }, [transacoesFiltradas])

  const gastosCategoria = useMemo(() => {
    const mapa: any = {}

    transacoesFiltradas.forEach((t) => {
      if (t.tipo !== "saida") return

      const nome = t.categories?.nome || "Sem categoria"

      if (!mapa[nome]) mapa[nome] = 0
      mapa[nome] += Number(t.valor)
    })

    return Object.entries(mapa).map(([name, value]) => ({
      name,
      value
    }))
  }, [transacoesFiltradas])

  const porPagamento = useMemo(() => {
    const mapa: any = {}

    transacoesFiltradas.forEach((t) => {
      if (!mapa[t.pagamento]) mapa[t.pagamento] = 0
      mapa[t.pagamento] += Number(t.valor)
    })

    return Object.entries(mapa).map(([name, value]) => ({
      name,
      value
    }))
  }, [transacoesFiltradas])

  const topGastos = useMemo(() => {
    return transacoesFiltradas
      .filter((t) => t.tipo === "saida")
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
  }, [transacoesFiltradas])

  const evolucaoMensal = useMemo(() => {
    const mapa: any = {}

    transacoesFiltradas.forEach((t) => {
      const mes = t.data.slice(0, 7) // YYYY-MM

      if (!mapa[mes]) {
        mapa[mes] = { mes, entrada: 0, saida: 0 }
      }

      if (t.tipo === "entrada") {
        mapa[mes].entrada += Number(t.valor)
      } else {
        mapa[mes].saida += Number(t.valor)
      }
    })

    return Object.values(mapa)
  }, [transacoesFiltradas])

  const taxaEconomia = useMemo(() => {
    if (resumo.entradas === 0) return 0
    return (resumo.saldo / resumo.entradas) * 100
  }, [resumo])

  const COLORS = [
    "#3b82f6",
    "#22c55e",
    "#ef4444",
    "#f59e0b",
    "#8b5cf6"
  ]

  // =========================
  // 📋 LISTA
  // =========================

  const lista = [
    { id: "resumo", nome: "Resumo financeiro", desc: "Visão geral geral" },
    { id: "categoria", nome: "Gastos por categoria", desc: "Onde você gasta mais" },
    { id: "top", nome: "Top gastos", desc: "Maiores despesas" },
    { id: "pagamento", nome: "Forma de pagamento", desc: "Distribuição" },
    { id: "mensal", nome: "Evolução mensal", desc: "Entradas vs saídas por mês" },
    { id: "economia", nome: "Taxa de economia", desc: "Quanto você está guardando (%)" },
  ]
  const relatorioSelecionado = lista.find((l) => l.id === relatorio)

  return (
    <Layout>
      <div className="flex flex-col gap-4 flex-1 min-h-0">

        <div className="bg-white rounded-2xl p-4 shadow flex-1 flex flex-col min-h-0">

          {/* HEADER */}
          <h2 className="font-bold mb-2">Relatórios</h2>
          <p className="text-sm text-gray-500 mb-4">
            Analise seus dados financeiros de forma simples
          </p>

          {/* LISTA COM SCROLL */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex flex-col gap-4">
              {lista.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRelatorio(r.id)
                    setModal(true)
                  }}
                  className="text-left p-4 border rounded-xl hover:bg-gray-50 transition"
                >
                  <p className="font-semibold">{r.nome}</p>
                  <p className="text-sm text-gray-500">
                    {r.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-lg font-bold">
              {relatorioSelecionado?.nome}
            </h2>

            <p className="text-sm text-gray-500 mb-4">
              {relatorioSelecionado?.desc}
            </p>

            {/* FILTROS */}
            <div className="flex gap-2 mb-4">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="border p-2 rounded-lg w-full"
              />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="border p-2 rounded-lg w-full"
              />
            </div>

            {/* SEM DADOS */}
            {transacoesFiltradas.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhum dado encontrado para o período.
              </p>
            )}

            {/* RESUMO */}
            {relatorio === "resumo" && (
              <div className="flex flex-col gap-2">
                <p>Entradas: {formatarMoeda(resumo.entradas)}</p>
                <p>Saídas: {formatarMoeda(resumo.saidas)}</p>
                <p className="font-bold">
                  Saldo: {formatarMoeda(resumo.saldo)}
                </p>
              </div>
            )}

            {/* CATEGORIA */}
            {relatorio === "categoria" && gastosCategoria.length > 0 && (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={gastosCategoria}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                      >
                        {gastosCategoria.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatarMoeda(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {gastosCategoria.map((c: any) => (
                    <div key={c.name} className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span>{formatarMoeda(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* TOP GASTOS */}
            {relatorio === "top" && (
              <div className="flex flex-col gap-2">
                {topGastos.map((t) => (
                  <div key={t.id} className="flex justify-between text-sm">
                    <span>{t.descricao}</span>
                    <span>{formatarMoeda(t.valor)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PAGAMENTO */}
            {relatorio === "pagamento" && porPagamento.length > 0 && (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={porPagamento}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                      >
                        {porPagamento.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatarMoeda(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {porPagamento.map((p: any) => (
                    <div key={p.name} className="flex justify-between text-sm">
                      <span>{p.name}</span>
                      <span>{formatarMoeda(p.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {relatorio === "mensal" && evolucaoMensal.length > 0 && (
              <div className="h-[300px]">
                <ResponsiveContainer>
                  <BarChart data={evolucaoMensal}>
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => formatarMoeda(v)} />
                    <Legend />
                    <Bar dataKey="entrada" fill="#3b82f6"/>
                    <Bar dataKey="saida" fill="#94a3b8"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {relatorio === "economia" && (
              <div className="flex flex-col gap-2">
                <p>Entradas: {formatarMoeda(resumo.entradas)}</p>
                <p>Saldo: {formatarMoeda(resumo.saldo)}</p>

                <p className="font-bold text-lg">
                  Taxa de economia: {taxaEconomia.toFixed(1)}%
                </p>
              </div>
            )}

            {/* FECHAR */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </Layout>
  )
}