"use client"

import { useEffect } from "react"

import { supabase } from "../../lib/supabase"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

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
    await supabase.auth.signOut()
    router.push("/login")
  }
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push("/login")
      }
    }

    checkUser()
  }, [])

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

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border"></div>
              <span>Perfil</span>
            </div>
          </div>

          {/* CONTEÚDO DINÂMICO */}
          {children}

        </div>
      </div>
    </div>
  )
}