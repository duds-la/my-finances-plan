import { useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { createPortal } from "react-dom"
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Target,
  MoreHorizontal, X, Wallet, PieChart, Archive, SlidersHorizontal,
  Zap, Trophy, CreditCard, Bot, UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserContext } from "@/contexts/UserContext"

// ── Itens principais da nav (dono) ────────────────────────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",  path: "/" },
  { icon: ArrowLeftRight,  label: "Transações", path: "/transacoes" },
  { icon: TrendingUp,      label: "Investir",   path: "/investimentos" },
  { icon: Target,          label: "Metas",      path: "/metas" },
]

// ── Itens do painel "Mais" (dono) ─────────────────────────────────────────────

const moreItems = [
  { icon: Wallet,            label: "Orçamento",     path: "/orcamento",     color: "#4ade80" },
  { icon: Archive,           label: "Caixinhas",     path: "/caixinhas",     color: "#22d3ee" },
  { icon: CreditCard,        label: "Parcelamentos", path: "/parcelamentos", color: "#f87171" },
  { icon: PieChart,          label: "Portfólio",     path: "/portfolio",     color: "#a78bfa" },
  { icon: Zap,               label: "Simulações",    path: "/simulacoes",    color: "#fbbf24" },
  { icon: Trophy,            label: "Conquistas",    path: "/conquistas",    color: "#fb923c" },
  { icon: Bot,               label: "Score & IA",    path: "/analise",       color: "#38bdf8" },
  { icon: SlidersHorizontal, label: "Config.",       path: "/configuracoes", color: "#94a3b8" },
  { icon: UserCheck,         label: "Convidados",    path: "/convidados",    color: "#c084fc" },
]

// ── Itens para convidados ─────────────────────────────────────────────────────

const guestNavItems = [
  { icon: Target,     label: "Metas",         path: "/metas" },
  { icon: TrendingUp, label: "Investimentos", path: "/investimentos" },
]

// ── Painel "Mais" ─────────────────────────────────────────────────────────────

function MorePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-16 z-[9999] md:hidden px-3 pb-2" onClick={e => e.stopPropagation()}>
        <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mais opções</span>
            <button onClick={onClose} className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-0 p-2">
            {moreItems.map(({ icon: Icon, label, path, color }) => (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-muted-foreground transition-colors active:bg-muted"
                activeProps={{ className: "!text-foreground" }}
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <div className={cn("flex size-10 items-center justify-center rounded-xl transition-all", isActive ? "scale-105" : "")}
                      style={{ backgroundColor: `${color}20` }}>
                      <Icon size={18} style={{ color }} strokeWidth={isActive ? 2.5 : 1.75} />
                    </div>
                    <span className={cn("text-[10px] font-medium leading-tight text-center", isActive ? "text-foreground" : "")}>
                      {label}
                    </span>
                  </>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { isGuest } = useUserContext()   // ← lê do context global

  // Modo convidado: só 2 botões, sem "Mais"
  if (isGuest) {
    return (
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
        <div className="flex items-stretch h-16">
          {guestNavItems.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              activeProps={{ className: "!text-primary" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <div className={cn("flex size-8 items-center justify-center rounded-xl transition-all duration-200", isActive ? "bg-primary/15 scale-110" : "")}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className={cn("text-[10px] font-medium leading-none", isActive ? "text-primary" : "")}>{label}</span>
                </>
              )}
            </Link>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    )
  }

  // Modo normal: nav completa com "Mais"
  return (
    <>
      <MorePanel open={moreOpen} onClose={() => setMoreOpen(false)} />

      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
        <div className="flex items-stretch h-16">
          {navItems.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              activeProps={{ className: "!text-primary" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <div className={cn("flex size-8 items-center justify-center rounded-xl transition-all duration-200", isActive ? "bg-primary/15 scale-110" : "")}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className={cn("text-[10px] font-medium leading-none", isActive ? "text-primary" : "")}>{label}</span>
                </>
              )}
            </Link>
          ))}

          <button
            onClick={() => setMoreOpen(v => !v)}
            className={cn("flex flex-1 flex-col items-center justify-center gap-1 transition-colors", moreOpen ? "text-primary" : "text-muted-foreground")}
          >
            <div className={cn("flex size-8 items-center justify-center rounded-xl transition-all duration-200", moreOpen ? "bg-primary/15 scale-110" : "")}>
              {moreOpen ? <X size={18} strokeWidth={2.5} /> : <MoreHorizontal size={18} strokeWidth={1.75} />}
            </div>
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  )
}