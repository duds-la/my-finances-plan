import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { MobileBottomNav } from "@/components/Common/MobileBottomNav"
import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
  },
})

function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-h-svh">
        {/* Header só aparece no desktop — no mobile a bottom nav assume a navegação */}
        <header className="sticky top-0 z-10 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
        </header>

        <main
          className={[
            "flex-1 p-4 md:p-8",
            // Espaço extra embaixo no mobile para não ficar atrás da bottom nav
            "pb-24 md:pb-8",
          ].join(" ")}
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>

        {/* Footer só no desktop */}
        <div className="hidden md:block">
          <Footer />
        </div>
      </SidebarInset>

      <MobileBottomNav />
    </SidebarProvider>
  )
}

export default Layout