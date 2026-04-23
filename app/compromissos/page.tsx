"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Layout from "../components/Layout"
import { useAuth } from "../components/AuthContext"
import useSWR from "swr"
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid"

export default function Compromissos() {


  const [pagina, setPagina] = useState(0)
  const limite = 10

  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("pendente")
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")

  const [ordem, setOrdem] = useState("data_inicio")
  const [direcao, setDirecao] = useState("asc")



  const [editando, setEditando] = useState<any>(null)
  const { user, loading } = useAuth()

  const fetchCompromissos = async ({
    userId,
    pagina,
    filtroTipo,
    filtroStatus,
    buscaDebounced,
    ordem,
    direcao,
  }: any) => {
    let query = supabase
      .from("commitments")
      .select("*")
      .eq("user_id", userId)
      .order(ordem, { ascending: direcao === "asc" })
      .range(pagina * 10, (pagina + 1) * 10 - 1)

    if (filtroTipo) query = query.eq("tipo", filtroTipo)
    if (filtroStatus) query = query.eq("status", filtroStatus)
    if (buscaDebounced) {
      query = query.ilike("descricao", `%${buscaDebounced}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  const pagar = async (c: any) => {
    // 1. marcar como pago
    await supabase
      .from("commitments")
      .update({ status: "pago" })
      .eq("id", c.id)

    // 2. criar transação
    await supabase.from("transactions").insert([
      {
        tipo: c.tipo,
        valor: c.valor,
        pagamento: c.pagamento,
        data: c.data_inicio,
        descricao: c.descricao,
        user_id: user.id,
        categoria: c.categoria,
        commitments_id: c.id
      }
    ])

    // 🔥 3. SE FOR RECORRENTE → cria próximo
    if (c.recorrente) {
      const [ano, mes, dia] = c.data_inicio.split("-").map(Number)

      const proximaData = new Date(ano, mes, dia) // +1 mês automático

      await supabase.from("commitments").insert([
        {
          tipo: c.tipo,
          valor: c.valor,
          pagamento: c.pagamento,
          descricao: c.descricao,
          data_inicio: proximaData.toISOString().slice(0, 10),
          parcela_atual: null,
          parcelas: null,
          recorrente: true,
          status: "pendente",
          categoria: c.categoria,
          user_id: user.id,
          grupo_id: c.grupo_id || crypto.randomUUID()
        }
      ])
    }

    mutate()
  }

  const ordenar = (campo: string) => {
    setPagina(0)
    if (ordem === campo) {
      setDirecao(direcao === "asc" ? "desc" : "asc")
    } else {
      setOrdem(campo)
      setDirecao("asc")
    }
  }

  const renderSortIcon = (campo: string) => {
    if (ordem !== campo) return null

    return direcao === "asc" ? (
      <ChevronUpIcon className="w-4 h-4" />
    ) : (
      <ChevronDownIcon className="w-4 h-4" />
    )
  }

  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
  }

  const { data: compromissos = [], isLoading, mutate } = useSWR(
    user
      ? [
        "commitments",
        user.id,
        pagina,
        filtroTipo,
        filtroStatus,
        buscaDebounced,
        ordem,
        direcao,
      ]
      : null,
    ([_, userId, pagina, filtroTipo, filtroStatus, buscaDebounced, ordem, direcao]) =>
      fetchCompromissos({
        userId,
        pagina,
        filtroTipo,
        filtroStatus,
        buscaDebounced,
        ordem,
        direcao,
      }),
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )
  const remover = async (c: any) => {
    await supabase
      .from("commitments")
      .delete()
      .eq("id", c.id)

    mutate()
  }

  const removerComOpcao = async () => {
    if (!editando) return

    let query = supabase.from("commitments").delete()

    if (modoEdicao === "um") {
      query = query.eq("id", editando.id)
    } else {
      query = query.eq("grupo_id", editando.grupo_id)
    }

    await query

    setEditando(null)
    mutate()
  }

  const cancelarPagamento = async (c: any) => {
    // 1. voltar status
    await supabase
      .from("commitments")
      .update({ status: "pendente" })
      .eq("id", c.id)

    // 2. deletar transação vinculada
    await supabase
      .from("transactions")
      .delete()
      .eq("commitments_id", c.id)

    mutate()
  }
  const temMais = compromissos.length === limite
  const [modoEdicao, setModoEdicao] = useState<"um" | "todos">("um")
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    data_inicio: ""
  })

  const salvarEdicao = async () => {
    if (!editando) return

    let updateData: any = {
      descricao: form.descricao,
      valor: Number(form.valor) / 100
    }

    // 🔥 só permite alterar data se for UM
    if (modoEdicao === "um") {
      updateData.data_inicio = form.data_inicio
    }

    let query = supabase
      .from("commitments")
      .update(updateData)
      .eq("status", "pendente")

    if (modoEdicao === "um") {
      query = query.eq("id", editando.id)
    } else {
      query = query.eq("grupo_id", editando.grupo_id)
    }

    await query

    setEditando(null)
    mutate()
  }
  const formatarMoedaInput = (valor: string) => {
    const numero = Number(valor) / 100

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  }
  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscaDebounced(busca)
    }, 800)


    return () => clearTimeout(timeout)
  }, [busca])

  return (
    <Layout>
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-bold mb-4">Compromissos</h2>

        {/* FILTROS */}
        <div className="flex flex-wrap gap-3 mb-6">

          <select
            value={filtroTipo}
            onChange={(e) => {
              setFiltroTipo(e.target.value)
              setPagina(0)
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
          >
            <option value="">Tipo</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value)
              setPagina(0)
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
          >
            <option value="">Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>

          <input
            type="text"
            placeholder="Buscar descrição..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(0)
            }}
            className="border rounded-lg px-3 py-2 text-sm shadow-sm"
          />

          {(filtroTipo || filtroStatus || busca) && (
            <button
              onClick={() => {
                setFiltroTipo("")
                setFiltroStatus("")
                setBusca("")
                setPagina(0)
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* TABELA */}
        <div className="border rounded-xl overflow-hidden">
          <div className="h-[calc(100vh-340px)] overflow-y-auto">

            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 sticky top-0">
                <tr className="text-left">

                  <th onClick={() => ordenar("data_inicio")} className="p-3 cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Vencimento
                      {renderSortIcon("data_inicio")}
                    </div>
                  </th>

                  <th onClick={() => ordenar("descricao")} className="p-3 cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Descrição
                      {renderSortIcon("descricao")}
                    </div>
                  </th>

                  <th onClick={() => ordenar("tipo")} className="p-3 cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Tipo
                      {renderSortIcon("tipo")}
                    </div>
                  </th>

                  <th onClick={() => ordenar("valor")} className="p-3 text-right cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-end gap-1">
                      Valor
                      {renderSortIcon("valor")}
                    </div>
                  </th>

                  <th onClick={() => ordenar("status")} className="p-3 cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Status
                      {renderSortIcon("status")}
                    </div>
                  </th>

                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {compromissos.map((c) => {
                  const hojeStr = (() => {
                    const d = new Date()
                    const ano = d.getFullYear()
                    const mes = String(d.getMonth() + 1).padStart(2, "0")
                    const dia = String(d.getDate()).padStart(2, "0")
                    return `${ano}-${mes}-${dia}`
                  })()

                  const vencido =
                    c.data_inicio < hojeStr && c.status === "pendente"
                  return (

                    <tr
                      key={c.id}
                      className={`border-t transition ${vencido ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                        }`}
                    >

                      <td className="p-3 text-gray-600">
                        {formatarData(c.data_inicio)}
                      </td>

                      <td className="p-3 font-medium">
                        {c.descricao || ""}

                        {c.parcelas > 1 && (
                          <span className="text-gray-500 text-xs ml-1">
                            ({String(c.parcela_atual).padStart(2, "0")}/{String(c.parcelas).padStart(2, "0")})
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.tipo === "entrada"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                          }`}>
                          {c.tipo}
                        </span>
                      </td>

                      <td className="p-3 text-right font-semibold">
                        R$ {Number(c.valor).toFixed(2)}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === "pendente"
                          ? vencido
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                          }`}>
                          {vencido ? "vencido" : c.status}
                        </span>
                      </td>

                      <td className="p-3 flex gap-2">

                        {/* PENDENTE */}
                        {c.status === "pendente" && (
                          <>
                            <button
                              onClick={() => pagar(c)}
                              className="text-green-600 hover:underline"
                            >
                              Pagar
                            </button>

                            <button
                              onClick={() => {
                                setEditando(c)
                                setModoEdicao("um")
                                setForm({
                                  descricao: c.descricao || "",
                                  valor: String(Math.round(Number(c.valor) * 100)),
                                  data_inicio: c.data_inicio
                                })
                              }}
                              className="text-blue-500 hover:underline"
                            >
                              Editar
                            </button>


                          </>
                        )}

                        {/* PAGO */}
                        {c.status === "pago" && (
                          <button
                            onClick={() => cancelarPagamento(c)}
                            className="text-yellow-600 hover:underline"
                          >
                            Cancelar
                          </button>
                        )}

                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>

          </div>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex justify-between items-center mt-6">

          <button
            onClick={() => setPagina((p) => Math.max(p - 1, 0))}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
          >
            ← Anterior
          </button>

          <span className="text-sm text-gray-500">
            Página {pagina + 1}
          </span>

          <button
            onClick={() => setPagina((p) => p + 1)}
            disabled={!temMais}
            className={`px-4 py-2 rounded-lg border transition ${!temMais
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-gray-100"
              }`}
          >
            Próxima →
          </button>

        </div>
      </div>
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl">

            <h2 className="text-lg font-bold mb-4">
              Editar compromisso
            </h2>

            {/* OPÇÃO UM OU TODOS */}
            <div className="flex gap-4 mb-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={modoEdicao === "um"}
                  onChange={() => setModoEdicao("um")}
                />
                Apenas este
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={modoEdicao === "todos"}
                  onChange={() => setModoEdicao("todos")}
                />
                Todos relacionados
              </label>
            </div>

            {/* FORM */}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Descrição"
                value={form.descricao}
                onChange={(e) =>
                  setForm({ ...form, descricao: e.target.value })
                }
                className="border p-2 rounded-lg"
              />

              <input
                type="text"
                placeholder="Valor"
                value={form.valor ? formatarMoedaInput(form.valor) : ""}
                onChange={(e) => {
                  let somenteNumeros = e.target.value.replace(/\D/g, "")

                  setForm({
                    ...form,
                    valor: somenteNumeros
                  })
                }}
                className="border p-2 rounded-lg"
              />

              <input
                type="date"
                value={form.data_inicio}
                disabled={modoEdicao === "todos"} // 🔥
                onChange={(e) =>
                  setForm({ ...form, data_inicio: e.target.value })
                }
                className="border p-2 rounded-lg disabled:bg-gray-100"
              />
            </div>

            {/* AÇÕES */}
            <div className="flex justify-between mt-6">

              <button
                onClick={removerComOpcao}
                className="text-red-600 hover:underline"
              >
                Remover
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditando(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvarEdicao}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </Layout>
  )
}