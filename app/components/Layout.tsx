"use client"

import { useEffect, useState } from "react"

import { supabase } from "../../lib/supabase"
import Link from "next/link"
import useSWR from "swr"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "../components/AuthContext"
import { AuthProvider } from "../components/AuthContext"
import Image from "next/image"

import {
  HomeIcon,
  ArrowsRightLeftIcon,
  CalendarIcon,
  ChartBarIcon,
  PowerIcon,
} from "@heroicons/react/24/outline"
export const metadata = {
  title: "Financeiro SaaS",
  description: "Controle financeiro simples",
}
export default function Layout({ children }: any) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const menu = [
    { href: "/", label: "Início", icon: HomeIcon },
    { href: "/transacoes", label: "Transações", icon: ArrowsRightLeftIcon },
    { href: "/compromissos", label: "Compromissos", icon: CalendarIcon },
    { href: "/insights", label: "Insights", icon: ChartBarIcon },
    { href: "/login", label: "Sair", icon: PowerIcon },
  ]
  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" })
    router.push("/login")
  }
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("foto")
      .eq("id", userId)
      .single()

    if (error) throw error

    return data
  }
  const { data: profile } = useSWR(
    user ? ["profile", user.id] : null,
    ([_, userId]) => fetchProfile(userId)
  )
  const fotoUrl = profile?.foto || null
  const [openMenu, setOpenMenu] = useState(false)
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading])


  useEffect(() => {
    const handleClickOutside = () => setOpenMenu(false)

    if (openMenu) {
      document.addEventListener("click", handleClickOutside)
    }

    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenu])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Carregando...
      </div>
    )
  }
  if (!user) {
    return null // 🔥 NÃO renderiza nada
  }

  return (
    <div className="h-screen p-4 bg-gray-100">
      <div className="grid grid-cols-12 gap-4 h-full">

        {/* MENU */}
        <div className="col-span-2 bg-white rounded-xl p-4 shadow">
          <h2 className="font-bold text-lg mb-4">MENU</h2>

          <div className="flex flex-col gap-2">
            {menu.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)

              const Icon = item.icon
              if (item.label === "Sair") {
                return (
                  <button
                    key={item.href}
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-2 rounded-lg transition font-medium text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              }
              return (
                <Link
                  prefetch
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 p-2 rounded-lg transition font-medium
                    ${isActive
                      ? "bg-blue-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="col-span-10 flex flex-col gap-4">

          {/* HEADER */}
          <div className="bg-white rounded-xl p-4 shadow flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">
                Bem vindo de volta
              </h1>
              <p className="text-sm text-gray-500">
                Controle financeiro
              </p>
            </div>

            <div className="flex items-center gap-4 relative">
              <div className="w-10 h-10 cursor-pointer" onClick={() => setOpenMenu(!openMenu)}>
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt="Foto do usuário"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 border" />
                )}

                {openMenu && (
                  <div className="absolute right-0 top-12 w-40 bg-white rounded-lg shadow-lg border z-50">
                    <Link
                      href="/perfil"
                      className="block rounded-lg px-4 py-2 text-sm hover:bg-blue-500 hover:text-white"
                      onClick={() => setOpenMenu(false)}
                    >
                      Perfil
                    </Link>

                    <button
                      onClick={() => {
                        setOpenMenu(false)
                        handleLogout()
                      }}
                      className="w-full rounded-lg text-left px-4 py-2 text-sm hover:bg-blue-500 hover:text-white"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CONTEÚDO DINÂMICO */}
          {children}

        </div>
      </div>
    </div>
  )
}