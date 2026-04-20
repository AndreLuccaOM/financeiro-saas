"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Layout from "../components/Layout"
import { useAuth } from "../components/AuthContext"
import useSWR from "swr"

export default function Perfil() {
  const { user } = useAuth()

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error) throw error
    return data
  }

  const { data: profile, mutate } = useSWR(
    user ? ["profile-full", user.id] : null,
    ([_, userId]) => fetchProfile(userId)
  )

  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [editandoSenha, setEditandoSenha] = useState(false)

  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [foto, setFoto] = useState("")

  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")

  // ✅ sincroniza dados
  useEffect(() => {
    if (profile) {
      setNome(profile.nome || "")
      setTelefone(profile.telefone || "")
      setFoto(profile.foto || "")
    }
  }, [profile])

  const salvarPerfil = async () => {
    await supabase
      .from("profiles")
      .update({ nome, telefone, foto })
      .eq("id", user.id)

    setEditandoPerfil(false)
    mutate()
  }

  const salvarSenha = async () => {
    if (senha !== confirmarSenha) {
      alert("Senhas não conferem")
      return
    }

    await supabase.auth.updateUser({
      password: senha,
    })

    setSenha("")
    setConfirmarSenha("")
    setEditandoSenha(false)

    alert("Senha atualizada")
  }

  const deletarConta = async () => {
    if (!confirm("Tem certeza? Isso não pode ser desfeito.")) return

    await supabase.from("transactions").delete().eq("user_id", user.id)
    await supabase.from("commitments").delete().eq("user_id", user.id)
    await supabase.from("profiles").delete().eq("id", user.id)

    alert("Conta removida (auth ainda precisa backend)")
  }
  
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, "")

    if (numeros.length <= 10) {
      // (12) 3456-7890
      return numeros
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .slice(0, 14)
    } else {
      // (12) 91234-5678
      return numeros
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .slice(0, 15)
    }
  }
  if (!profile) return null

  return (
    <Layout>
      <div className="h-full flex flex-col gap-4">

        {/* HEADER */}
        <div className="bg-white p-6 rounded-xl shadow flex justify-between items-center">
          <div className="flex items-center gap-4">
            {foto ? (
              <img src={foto} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full" />
            )}

            <div>
              <h2 className="text-2xl font-bold">
                {profile.nome || "Sem nome"}
              </h2>
              <p className="text-gray-500">{user.email}</p>
              <p className="text-sm text-gray-400">
                Membro desde{" "}
                {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditandoPerfil(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Editar perfil
            </button>

            <button
              onClick={() => setEditandoSenha(true)}
              className="border px-4 py-2 rounded-lg"
            >
              Alterar senha
            </button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="grid grid-cols-2 gap-4 flex-1">

          {/* ESQUERDA - ocupa o espaço restante */}
          <div className="flex flex-col gap-4 flex-grow">

            {/* DADOS */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold mb-4">Dados pessoais</h3>

              <p><strong>Nome:</strong> {profile.nome || "-"}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p>
                <strong>Telefone:</strong>{" "}
                {profile.telefone ? formatarTelefone(profile.telefone) : "-"}
              </p>
              <p><strong>ID:</strong> {user.id.slice(0, 3)}{user.id.slice(-3)}</p>
            </div>

            {/* PREFERÊNCIAS - ocupa o espaço restante */}
            <div className="bg-white p-6 rounded-xl shadow flex-grow">
              <h3 className="font-bold mb-4">Preferências</h3>

              <label className="flex justify-between items-center">
                Receber emails
                <input
                  type="checkbox"
                  checked={profile.email_notifications ?? true}
                  onChange={async (e) => {
                    await supabase
                      .from("profiles")
                      .update({
                        email_notifications: e.target.checked,
                      })
                      .eq("id", user.id)

                    mutate()
                  }}
                />
              </label>
            </div>

          </div>

          {/* DIREITA */}
          <div className="bg-white p-6 rounded-xl shadow flex flex-col justify-between">
            <div>
              <h3 className="font-bold mb-4">Plano</h3>
              <p>{profile.plan || "Free"}</p>

              <button className="mt-3 border px-4 py-2 rounded-lg opacity-50">
                Upgrade (em breve)
              </button>
            </div>

            <button
              onClick={deletarConta}
              className="text-red-500 mt-6"
            >
              Deletar conta
            </button>
          </div>

        </div>

        {/* MODAL PERFIL */}
        {editandoPerfil && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">

              <h2 className="font-bold mb-4">Editar perfil</h2>

              <div className="mb-3">
                <label className="block font-semibold">Nome</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome"
                  className="border p-2 w-full"
                />
              </div>

              <div className="mb-3">
                <label className="block font-semibold">Telefone</label>
                <input
                  value={formatarTelefone(telefone)}
                  onChange={(e) => {
                    const numeros = e.target.value.replace(/\D/g, "")
                    setTelefone(numeros)
                  }}
                  placeholder="Telefone"
                  className="border p-2 w-full"
                />
              </div>

              <div className="mb-3">
                <label className="block font-semibold">Foto (URL)</label>
                <input
                  value={foto}
                  onChange={(e) => setFoto(e.target.value)}
                  placeholder="URL da foto"
                  className="border p-2 w-full"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEditandoPerfil(false)}>
                  Cancelar
                </button>

                <button
                  onClick={salvarPerfil}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Salvar
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL SENHA */}
        {editandoSenha && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">

              <h2 className="font-bold mb-4">Alterar senha</h2>

              <input
                type="password"
                placeholder="Nova senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="border p-2 w-full mb-3"
              />

              <input
                type="password"
                placeholder="Confirmar senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="border p-2 w-full"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEditandoSenha(false)}>
                  Cancelar
                </button>

                <button
                  onClick={salvarSenha}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Salvar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}