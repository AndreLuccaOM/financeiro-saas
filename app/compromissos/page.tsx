"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Layout from "../components/Layout"
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid"

export default function Compromissos() {
  const [compromissos, setCompromissos] = useState<any[]>([])

  const [pagina, setPagina] = useState(0)
  const limite = 10

  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("pendente")
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")

  const [ordem, setOrdem] = useState("data_inicio")
  const [direcao, setDirecao] = useState("asc")

  const [temMais, setTemMais] = useState(true)
  const [editando, setEditando] = useState<any>(null)

  const [user, setUser] = useState<any>(null)

  const buscar = async () => {
    if (!user) return

    let query = supabase
      .from("commitments")
      .select("*")
      .eq("user_id", user?.id)
      .order(ordem, { ascending: direcao === "asc" })
      .range(pagina * limite, (pagina + 1) * limite - 1)

    if (filtroTipo) query = query.eq("tipo", filtroTipo)
    if (filtroStatus) query = query.eq("status", filtroStatus)

    if (buscaDebounced) {
      query = query.ilike("descricao", `%${buscaDebounced}%`)
    }

    const { data } = await query

    if (!data || data.length < limite) {
      setTemMais(false)
    } else {
      setTemMais(true)
    }

    setCompromissos(data || [])
  }

  const pagar = async (c: any) => {
    await supabase
      .from("commitments")
      .update({ status: "pago" })
      .eq("id", c.id)

    await supabase.from("transactions").insert([
      {
        tipo: c.tipo,
        valor: c.valor,
        pagamento: c.pagamento,
        data: c.data_inicio,
        descricao: c.descricao,
        user_id: user.id,
        categoria: c.categoria,
        commitments_id : c.id
      }
    ])

    buscar()
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

  useEffect(() => {
    buscar()
  }, [user, pagina, filtroTipo, filtroStatus, buscaDebounced, ordem, direcao])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscaDebounced(busca)
    }, 800)


    return () => clearTimeout(timeout)
  }, [busca])
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    getUser()
  }, [])

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
                        {c.descricao || "-"}
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

                        {c.status === "pendente" && (
                          <button
                            onClick={() => pagar(c)}
                            className="text-green-600 hover:underline"
                          >
                            Pagar
                          </button>
                        )}

                        <button
                          onClick={() => setEditando(c)}
                          className="text-blue-500 hover:underline"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => setEditando(c)}
                          className="text-red-500 hover:underline"
                        >
                          Remover
                        </button>

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
    </Layout>
  )
}