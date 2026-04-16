"use client"
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Login() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const router = useRouter()

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      alert("Erro ao logar")
    } else {
      router.push("/")
    }
  }

  const register = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (error) {
      alert("Erro ao cadastrar")
    } else {
      alert("Conta criada!")
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow w-80 flex flex-col gap-3">
        <h1 className="text-xl font-bold">Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="border p-2 rounded"
        />

        <button onClick={login} className="bg-blue-500 text-white p-2 rounded">
          Entrar
        </button>

        <button onClick={register} className="border p-2 rounded">
          Criar conta
        </button>
      </div>
    </div>
  )
}