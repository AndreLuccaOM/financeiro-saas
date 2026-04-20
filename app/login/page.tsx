"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"

export default function Login() {
  const router = useRouter()

  const [isRegister, setIsRegister] = useState(false)

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [confirmSenha, setConfirmSenha] = useState("")
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")

  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const validarSenha = (senha: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(senha)
  }

  const login = async () => {
    setLoading(true)
    setErrorMsg("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    setLoading(false)

    if (error) {
      setErrorMsg("Email ou senha inválidos")
    } else {
      router.push("/")
    }
  }

const register = async () => {
  setLoading(true)
  setErrorMsg("")
  setSuccessMsg("")

  if (!nome.trim()) {
    setErrorMsg("Informe seu nome")
    setLoading(false)
    return
  }

  if (!validarEmail(email)) {
    setErrorMsg("Email inválido")
    setLoading(false)
    return
  }

  if (!validarTelefone(telefone)) {
    setErrorMsg("Telefone inválido")
    setLoading(false)
    return
  }

  if (!validarSenha(senha)) {
    setErrorMsg("Senha fraca. Use maiúscula, minúscula, número e caractere especial.")
    setLoading(false)
    return
  }

  if (senha !== confirmSenha) {
    setErrorMsg("As senhas não coincidem")
    setLoading(false)
    return
  }

  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome,
        telefone,
      },
    },
  })

  if (error) {
    setErrorMsg("Erro ao cadastrar usuário")
    setLoading(false)
    return
  }

  setSuccessMsg(
    "Conta criada! Verifique seu email (ou spam) para confirmar sua conta."
  )

  setLoading(false)
}

  const getPasswordStrength = (senha: string) => {
    const checks = {
      minLength: senha.length >= 8,
      lowercase: /[a-z]/.test(senha),
      uppercase: /[A-Z]/.test(senha),
      number: /\d/.test(senha),
      special: /[@$!%*?&]/.test(senha),
    }

    const score = Object.values(checks).filter(Boolean).length

    return { checks, score }
  }
  const { checks, score } = getPasswordStrength(senha)
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
  const validarEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  const validarTelefone = (telefone: string) => {
    const numeros = telefone.replace(/\D/g, "")
    return numeros.length >= 10 && numeros.length <= 11
  }
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow w-96 flex flex-col gap-3">
        <h1 className="text-xl font-bold text-center">
          {isRegister ? "Criar conta" : "Login"}
        </h1>

        {errorMsg && (
          <span className="text-red-500 text-sm">{errorMsg}</span>
        )}

        {successMsg && (
          <span className="text-green-600 text-sm">{successMsg}</span>
        )}

        {isRegister && (
          <>
            <input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              className="border p-2 rounded"
            />

          </>
        )}

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
        />

        <div className="relative">
          <input
            type={showSenha ? "text" : "password"}
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="border p-2 rounded w-full"
          />

          <button
            type="button"
            onClick={() => setShowSenha(!showSenha)}
            className="absolute right-2 top-2"
          >
            {showSenha ? (
              <EyeSlashIcon className="w-5" />
            ) : (
              <EyeIcon className="w-5" />
            )}
          </button>
        </div>

        {isRegister && (
          <input
            type="password"
            placeholder="Confirmar senha"
            value={confirmSenha}
            onChange={(e) => setConfirmSenha(e.target.value)}
            className="border p-2 rounded"
          />
        )}

        {isRegister && (
          <div className="flex flex-col gap-1">
            <div className="h-2 w-full bg-gray-200 rounded">
              <div
                className={`h-2 rounded transition-all ${senha.length === 0
                  ? "w-0"
                  : score <= 2
                    ? "bg-red-500 w-1/4"
                    : score === 3
                      ? "bg-yellow-500 w-2/4"
                      : score === 4
                        ? "bg-blue-500 w-3/4"
                        : "bg-green-500 w-full"
                  }`}
              />
            </div>
          </div>
        )}

        {isRegister && (
          <span className="text-xs text-gray-500">
            A senha deve conter 8 caracteres, maiúscula, minúscula, número e caractere especial.
          </span>
        )}
        {isRegister && (
          <div className="text-xs flex flex-col gap-1 mt-1">
            <span className={checks.minLength ? "text-green-600" : "text-gray-400"}>
              • Mínimo 8 caracteres
            </span>
            <span className={checks.lowercase ? "text-green-600" : "text-gray-400"}>
              • Letra minúscula
            </span>
            <span className={checks.uppercase ? "text-green-600" : "text-gray-400"}>
              • Letra maiúscula
            </span>
            <span className={checks.number ? "text-green-600" : "text-gray-400"}>
              • Número
            </span>
            <span className={checks.special ? "text-green-600" : "text-gray-400"}>
              • Caractere especial
            </span>
          </div>
        )}
        <button
          onClick={isRegister ? register : login}
          disabled={loading}
          className="bg-blue-500 text-white p-2 rounded disabled:opacity-50"
        >
          {loading
            ? "Carregando..."
            : isRegister
              ? "Criar conta"
              : "Entrar"}
        </button>

        <button
          onClick={() => {
            setIsRegister(!isRegister)
            setErrorMsg("")
            setSuccessMsg("")
          }}
          className="text-sm text-blue-500"
        >
          {isRegister
            ? "Já tem conta? Fazer login"
            : "Não tem conta? Criar conta"}
        </button>
      </div>
    </div>
  )
}
