"use client"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "../lib/supabase"
import Layout from "./components/Layout"
import useSWR from "swr"
import { useAuth } from "./components/AuthContext"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

import {
  PieChart,
  Pie,
  Cell
} from "recharts"

export default function Home() {
  const [valor, setValor] = useState("")
  const [tipo, setTipo] = useState("entrada")
  const [pagamento, setPagamento] = useState("dinheiro")
  const [data, setData] = useState("")
  const [descricao, setDescricao] = useState("")
  const [abrirModal, setAbrirModal] = useState(false)
  const [categoriaId, setCategoriaId] = useState("")


  const { user, loading } = useAuth()

  const [fixo, setFixo] = useState(false)
  const [parcelas, setParcelas] = useState("")

  const formatarDataISO = (date: Date) => {
    const ano = date.getFullYear()
    const mes = String(date.getMonth() + 1).padStart(2, "0")
    const dia = String(date.getDate()).padStart(2, "0")

    return `${ano}-${mes}-${dia}`
  }
  const getHoje = () => {
    const date = new Date()
    const ano = date.getFullYear()
    const mes = String(date.getMonth() + 1).padStart(2, "0")
    const dia = String(date.getDate()).padStart(2, "0")

    return `${ano}-${mes}-${dia}`
  }

  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
  }


  const fetchTransacoes = async (userId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(`*, categories (nome)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  }

  const fetchCategorias = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")

    if (error) throw error
    return data || []
  }

  const { data: transacoes = [], mutate: mutateTransacoes } = useSWR(
    user ? ["transactions-home", user.id] : null,
    ([_, userId]) => fetchTransacoes(userId)
  )

  const { data: categorias = [] } = useSWR(
    user ? "categories" : null,
    fetchCategorias
  )

  const formatarMoedaBRL = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor)
  }

  const categoriasFiltradas = useMemo(() => {
    return categorias.filter((c) => c.tipo === tipo)
  }, [categorias, tipo])
  const salvar = async () => {
    const dataFinal = data || getHoje()

    // 🔹 Se for compromisso fixo
    if (fixo) {
      const totalParcelas = parcelas ? Number(parcelas) : 1
      const lista = []

      for (let i = 0; i < totalParcelas; i++) {
        const [ano, mes, dia] = dataFinal.split("-").map(Number)
        const novaData = new Date(ano, mes - 1 + i, dia)

        lista.push({
          tipo,
          valor: Number(valor),
          pagamento,
          descricao,
          data_inicio: formatarDataISO(novaData),
          parcela_atual: i + 1,
          parcelas: totalParcelas,
          recorrente: !parcelas,
          status: "pendente",
          categoria: Number(categoriaId),
          user_id: user.id // ✅ agora certo
        })
      }

      const { error } = await supabase
        .from("commitments")
        .insert(lista)

      if (error) {
        console.error(error)
        alert("Erro ao salvar compromisso")
        return
      }
    } else {
      // 🔹 Se for transação normal (como já era)
      const { error } = await supabase.from("transactions").insert([
        {
          tipo,
          valor: Number(valor),
          pagamento,
          data: dataFinal,
          descricao,
          categoria: Number(categoriaId),
          user_id: user.id // ✅ agora certo
        }
      ])

      if (error) {
        alert("Erro ao salvar")
        return
      }
    }

    // 🔹 Reset geral (mantém tudo funcionando)
    setValor("")
    setData("")
    setDescricao("")
    setParcelas("")
    setCategoriaId("")
    setFixo(false)
    setAbrirModal(false)

    mutateTransacoes()
  }

  const saldo = transacoes.reduce((acc, t) => {
    return t.tipo === "entrada"
      ? acc + Number(t.valor)
      : acc - Number(t.valor)
  }, 0)

  const calcularEntradas = () => {
    return transacoes
      .filter((t) => t.tipo === "entrada")
      .reduce((acc, t) => acc + Number(t.valor), 0)
  }

  const calcularSaidas = () => {
    return transacoes
      .filter((t) => t.tipo === "saida")
      .reduce((acc, t) => acc + Number(t.valor), 0)
  }

  const mesAtual = new Date().getMonth()
  const anoAtual = new Date().getFullYear()

  const transacoesMes = transacoes.filter((t) => {
    const [ano, mes] = t.data.split("-")
    return Number(mes) - 1 === mesAtual && Number(ano) === anoAtual
  })

  const entradasMes = transacoesMes
    .filter((t) => t.tipo === "entrada")
    .reduce((acc, t) => acc + Number(t.valor), 0)

  const saídasMes = transacoesMes
    .filter((t) => t.tipo === "saida")
    .reduce((acc, t) => acc + Number(t.valor), 0)

  const lucroMes = entradasMes - saídasMes
  function Card({ titulo, valor }: any) {
    return (
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-sm text-gray-500">{titulo}</h2>
        <p className="text-xl font-bold">{formatarMoedaBRL(valor)}</p>
      </div>
    )
  }
  const gerarDadosGrafico = () => {
    const hoje = getHoje()
    const anoAtual = Number(hoje.slice(0, 4))
    const anoPassado = anoAtual - 1

    const meses = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ]

    const dados = meses.map((mes, index) => {
      let atual = 0
      let passado = 0

      transacoes.forEach((t) => {
        if (t.tipo !== "entrada") return

        // 🔥 pega direto da string
        const [anoT, mesT] = t.data.split("-")

        const mesNumero = Number(mesT) - 1
        const anoNumero = Number(anoT)

        if (mesNumero === index) {
          if (anoNumero === anoAtual) atual += Number(t.valor)
          if (anoNumero === anoPassado) passado += Number(t.valor)
        }
      })

      return { mes, atual, passado }
    })

    return dados
  }
  const formatarMoeda = (valor: any) => {
    if (valor >= 1_000_000) {
      return `R$ ${(valor / 1_000_000).toFixed(1)}M`
    }

    if (valor >= 1_000) {
      return `R$ ${(valor / 1_000).toFixed(1)} m`
    }

    return `R$ ${valor}`
  }



  const gerarDadosPizza = () => {
    const mapa: any = {}

    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    transacoes.forEach((t) => {
      if (t.tipo !== "saida") return

      // pega ano e mês da transação
      const [ano, mes] = t.data.split("-")

      const mesNumero = Number(mes) - 1
      const anoNumero = Number(ano)

      // 🔥 FILTRO DO MÊS
      if (mesNumero !== mesAtual || anoNumero !== anoAtual) return

      const nomeCategoria = t.categories?.nome || "Sem categoria"

      if (!mapa[nomeCategoria]) {
        mapa[nomeCategoria] = 0
      }

      mapa[nomeCategoria] += Number(t.valor)
    })

    return Object.keys(mapa).map((key) => ({
      name: key,
      value: mapa[key]
    }))
  }

  const COLORS = [
    "#3b82f6",
    "#22c55e",
    "#ef4444",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899"
  ]

  return (

    <Layout>
      <div className="grid grid-cols-12 gap-4 h-full">

        {/* CONTEÚDO */}
        <div className="col-span-12 flex flex-col gap-4">

          {/* CARDS */}
          <div className="grid grid-cols-5 gap-5">
            <Card titulo="Saldo atual" valor={saldo} />
            <Card titulo="Entradas do mês" valor={entradasMes} />
            <Card titulo="Saídas do mês" valor={saídasMes} />
            <Card titulo="Lucro do mês" valor={lucroMes} />
            <button
              onClick={() => setAbrirModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition font-bold"
            >
              Adicionar
            </button>
          </div>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 gap-4 flex-1">
            <div className="col-span-2 bg-white rounded-xl p-4 shadow overflow-hidden">

              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gerarDadosGrafico()}
                >
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => formatarMoeda(v)} width={90} />
                  <Tooltip formatter={(value) => formatarMoeda(value)} />
                  <Legend />

                  <Bar dataKey="passado" fill="#94a3b8" name="Ano passado" />
                  <Bar dataKey="atual" fill="#3b82f6" name="Ano atual" />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* TABELA */}
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">
                Última movimentação
              </h2>

              <a href="/transacoes" className="text-sm text-blue-500 hover:underline">
                Ver todas →
              </a>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr className="text-left">
                    <th className="p-3">Data</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Pagamento</th>
                    <th className="p-3">Categoria</th>
                  </tr>
                </thead>

                <tbody>
                  {transacoes.slice(0, 1).map((t) => (
                    <tr
                      key={t.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="p-3">{formatarData(t.data)}</td>

                      <td className={`p-3 font-semibold ${t.tipo === "entrada"
                        ? "text-green-600"
                        : "text-red-600"
                        }`}>
                        R$ {t.valor.toFixed(2)}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.tipo === "entrada"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                          }`}>
                          {t.tipo}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                          {t.pagamento}
                        </span>
                      </td>

                      <td className="p-3">
                        {t.categories?.nome || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {abrirModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl">

            <h2 className="text-xl font-bold mb-4">
              Nova movimentação
            </h2>

            <div className="flex flex-col gap-3">

              <input
                type="number"
                placeholder="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="border p-2 rounded-lg"
              />

              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="border p-2 rounded-lg"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>

              <select
                value={pagamento}
                onChange={(e) => setPagamento(e.target.value)}
                className="border p-2 rounded-lg"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
              </select>

              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="border p-2 rounded-lg"
              >
                <option value="">Selecione uma categoria</option>

                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="border p-2 rounded-lg"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fixo}
                  onChange={(e) => setFixo(e.target.checked)}
                />
                É um compromisso fixo?
              </label>

              {fixo && (
                <input
                  type="number"
                  placeholder="Quantos meses? (opcional)"
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  className="border p-2 rounded-lg"
                />
              )}
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="border p-2 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAbrirModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>

              <button
                onClick={salvar}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}