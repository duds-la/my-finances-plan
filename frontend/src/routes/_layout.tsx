import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { MobileBottomNav } from "@/components/Common/MobileBottomNav"
import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"
import { UserContext, useCurrentUserQuery } from "@/contexts/UserContext"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
  },
})

// Rotas permitidas para convidados
const GUEST_ALLOWED_PATHS = ["/metas", "/investimentos"]

function Layout() {
  const { data: user, isLoading } = useCurrentUserQuery()
  const navigate = useNavigate()
  const isGuest = user?.is_guest ?? false

  // Redireciona convidado que tentar acessar rota proibida
  useEffect(() => {
    if (!isLoading && isGuest) {
      const currentPath = window.location.pathname
      const isAllowed = GUEST_ALLOWED_PATHS.some(p => currentPath.startsWith(p))
      if (!isAllowed) {
        navigate({ to: "/metas" })
      }
    }
  }, [isGuest, isLoading, navigate])

  const contextValue = {
    user: user ?? null,
    isGuest,
    isLoading,
  }

  return (
    <UserContext.Provider value={contextValue}>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset className="min-h-svh">
          <header className="sticky top-0 z-10 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
          </header>

          <main
            className={[
              "flex-1 p-4 md:p-8",
              "pb-24 md:pb-8",
            ].join(" ")}
          >
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>

          <div className="hidden md:block">
            <Footer />
          </div>
        </SidebarInset>

        <MobileBottomNav />
      </SidebarProvider>
    </UserContext.Provider>
  )
}

export default Layout