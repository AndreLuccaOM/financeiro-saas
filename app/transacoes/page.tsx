"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Layout from "../components/Layout"
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid"
import { useAuth } from "../components/AuthContext" // ajusta o path
import useSWR from "swr"
export default function Transacoes() {




  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split("-")
    return `${dia}/${mes}/${ano}`
  }
  const [pagina, setPagina] = useState(0)
  const limite = 10

  const [filtroTipo, setFiltroTipo] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [filtroPagamento, setFiltroPagamento] = useState("")
  const [busca, setBusca] = useState("")
  const [buscaDebounced, setBuscaDebounced] = useState("")
  const [ordem, setOrdem] = useState("data")
  const [direcao, setDirecao] = useState("desc")
  const [editando, setEditando] = useState<any>(null)
  const { user, loading } = useAuth()
  const formatarMoedaInput = (valor: string) => {
    const numero = Number(valor) / 100

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  }
  const handleValorEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    let somenteNumeros = e.target.value.replace(/\D/g, "")

    setEditando({
      ...editando,
      valor: somenteNumeros
    })
  }
  const fetchCategorias = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")

    if (error) throw error
    return data || []
  }
  const { data: categorias = [] } = useSWR(
    user ? "categories" : null,
    fetchCategorias
  )
  const categoriasFiltradas = categorias.filter(
    (c) => c.tipo === editando?.tipo
  )
  const renderSortIcon = (campo: string) => {
    if (ordem !== campo) return null

    return direcao === "asc" ? (
      <ChevronUpIcon className="w-4 h-4" />
    ) : (
      <ChevronDownIcon className="w-4 h-4" />
    )
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
  const salvarEdicao = async () => {
    await supabase
      .from("transactions")
      .update({
        valor: Number(editando.valor) / 100,
        descricao: editando.descricao,
        pagamento: editando.pagamento,
        tipo: editando.tipo,
        categoria: Number(editando.categoria) // 👈 FALTAVA ISSO
      })
      .eq("id", editando.id)

    setEditando(null)
    mutate()
  }

  const fetchTransacoes = async ({
    userId,
    pagina,
    filtroTipo,
    filtroPagamento,
    dataInicio,
    dataFim,
    buscaDebounced,
    ordem,
    direcao,
  }: any) => {
    
    let query = supabase
      .from("transactions")
      .select(`*, categories (nome)`)
      .eq("user_id", userId)
      
      .order(ordem, { ascending: direcao === "asc" })
      .range(pagina * 10, (pagina + 1) * 10 - 1)

    if (filtroTipo) query = query.eq("tipo", filtroTipo)
    if (filtroPagamento) query = query.eq("pagamento", filtroPagamento)
    if (dataInicio) query = query.gte("data", dataInicio)
    if (dataFim) query = query.lte("data", dataFim)
    if (buscaDebounced)
      query = query.ilike("descricao", `%${buscaDebounced}%`)

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  const { data: transacoes = [], isLoading, mutate } = useSWR(
    user
      ? [
        "transactions",
        user.id,
        pagina,
        filtroTipo,
        filtroPagamento,
        dataInicio,
        dataFim,
        buscaDebounced,
        ordem,
        direcao,
      ]
      : null,
    ([_, userId, pagina, filtroTipo, filtroPagamento, dataInicio, dataFim, buscaDebounced, ordem, direcao]) =>
      fetchTransacoes({
        userId: user.id,
        pagina,
        filtroTipo,
        filtroPagamento,
        dataInicio,
        dataFim,
        buscaDebounced,
        ordem,
        direcao,
      }),
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscaDebounced(busca)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [busca])

  const temMais = transacoes.length === limite

  return (
    <Layout>
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-bold mb-4">Transações</h2>

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
            value={filtroPagamento}
            onChange={(e) => {
              setFiltroPagamento(e.target.value)
              setPagina(0)
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
          >
            <option value="">Pagamento</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
            <option value="pix">Pix</option>
            <option value="boleto">Boleto</option>
          </select>

          <input
            type="date"
            value={dataInicio}
            placeholder="A Partir"
            onChange={(e) => setDataInicio(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm shadow-sm"
          />

          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm shadow-sm"
          />
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


          {(filtroTipo || filtroPagamento || dataInicio || dataFim || busca) && (
            <button
              onClick={() => {
                setFiltroTipo("")
                setFiltroPagamento("")
                setDataInicio("")
                setDataFim("")
                setBusca("")
                setPagina(0)
              }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 
               text-gray-600 hover:bg-gray-100 transition"
            >
              Limpar filtros
            </button>
          )}

        </div>
        <div className="border rounded-xl overflow-hidden">
          <div className="h-[calc(100vh-340px)] overflow-y-auto">

            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 sticky top-0">
                <tr className="text-left">
                  <th onClick={() => ordenar("data")} className="p-3 cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Data
                      {renderSortIcon("data")}
                    </div>
                  </th>

                  <th onClick={() => ordenar("descricao")} className="p-3 cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Descrição
                      {renderSortIcon("descricao")}
                    </div>
                  </th>

                  <th
                    onClick={() => ordenar("categoria")}
                    className="p-3 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Categoria
                      {renderSortIcon("categoria")}
                    </div>
                  </th>

                  <th onClick={() => ordenar("pagamento")} className="p-3 cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Pagamento
                      {renderSortIcon("pagamento")}
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
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {transacoes.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-3 text-gray-600">
                      {formatarData(t.data)}
                    </td>

                    <td className="p-3 font-medium">
                      {t.descricao || "-"}
                    </td>
                    <td className="p-3 font-medium">
                      {t.categories?.nome || "-"}
                    </td>

                    <td className="p-3">
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                        {t.pagamento}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.tipo === "entrada"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}>
                        {t.tipo}
                      </span>
                    </td>

                    <td className={`p-3 text-right font-semibold ${t.tipo === "entrada"
                      ? "text-green-600"
                      : "text-red-600"
                      }`}>
                      R$ {Number(t.valor).toFixed(2)}
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() =>
                          setEditando({
                            ...t,
                            valor: String(Number(t.valor) * 100),
                            categoria: t.categoria
                          })
                        }
                        className="text-blue-500 hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
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
      </div>{editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl">

            <h2 className="text-xl font-bold mb-4">
              Editar transação
            </h2>

            <div className="flex flex-col gap-3">

              <input
                type="text"
                value={
                  editando.valor
                    ? formatarMoedaInput(editando.valor)
                    : ""
                }
                onChange={handleValorEdit}
                className="border p-2 rounded-lg"
              />

              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={editando.descricao}
                onChange={(e) =>
                  setEditando({ ...editando, descricao: e.target.value })
                }
                className="border p-2 rounded-lg"
              />

              <select
                value={editando.tipo}
                onChange={(e) =>
                  setEditando({ ...editando, tipo: e.target.value })
                }
                className="border p-2 rounded-lg"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>

              <select
                value={editando.pagamento}
                onChange={(e) =>
                  setEditando({ ...editando, pagamento: e.target.value })
                }
                className="border p-2 rounded-lg"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="pix">Pix</option>
                <option value="boleto">Boleto</option>
              </select>

              <select
                value={editando.categoria || ""}
                onChange={(e) =>
                  setEditando({ ...editando, categoria: e.target.value })
                }
                className="border p-2 rounded-lg"
              >
                <option value="">Selecione uma categoria</option>

                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>

            </div>

            <div className="flex justify-between mt-6">

              {/* DELETE */}
              <button
                onClick={async () => {
                  const confirmar = confirm("Deseja excluir?")
                  if (!confirmar) return

                  await supabase
                    .from("transactions")
                    .delete()
                    .eq("id", editando.id)

                  setEditando(null)
                  mutate()
                }}
                className="text-red-500"
              >
                Excluir
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