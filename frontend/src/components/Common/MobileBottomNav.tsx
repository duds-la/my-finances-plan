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
  { icon: Wallet,            label: "Orçamento",     path: "/orcamento",     color: "#34d399" },
  { icon: Archive,           label: "Caixinhas",     path: "/caixinhas",     color: "#22d3ee" },
  { icon: CreditCard,        label: "Parcelamentos", path: "/parcelamentos", color: "#fb7185" },
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

// ── Item do dock ──────────────────────────────────────────────────────────────

function DockItem({
  icon: Icon, label, path,
}: { icon: React.ElementType; label: string; path: string }) {
  return (
    <Link
      to={path}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-muted-foreground transition-colors"
      activeProps={{ className: "!text-primary" }}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <div
            className={cn(
              "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300",
              isActive
                ? "bg-primary/15 shadow-[0_0_16px_-2px_var(--glow-primary)] scale-105"
                : "scale-100",
            )}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
          </div>
          <span className={cn("text-[10px] font-medium leading-none", isActive && "text-primary")}>
            {label}
          </span>
        </>
      )}
    </Link>
  )
}

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
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm md:hidden animate-scale-in"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 z-[9999] px-3 md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="glass-card animate-fade-up overflow-hidden rounded-2xl shadow-2xl">
          {/* Borda superior iluminada */}
          <div className="divider-glow" />

          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Mais opções
            </span>
            <button
              onClick={onClose}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
            >
              <X size={14} />
            </button>
          </div>

          <div className="stagger-children grid grid-cols-4 gap-0 p-2">
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
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl transition-all duration-200",
                        isActive && "scale-110",
                      )}
                      style={{
                        backgroundColor: `${color}1f`,
                        boxShadow: isActive ? `0 0 18px -4px ${color}` : undefined,
                      }}
                    >
                      <Icon size={18} style={{ color }} strokeWidth={isActive ? 2.5 : 1.75} />
                    </div>
                    <span className={cn(
                      "text-center text-[10px] font-medium leading-tight",
                      isActive && "text-foreground",
                    )}>
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

// ── Bottom Nav (dock flutuante) ───────────────────────────────────────────────

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { isGuest } = useUserContext()   // ← lê do context global

  // Modo convidado: só 2 botões, sem "Mais"
  if (isGuest) {
    return (
      <nav
        className="fixed inset-x-3 z-50 md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="glass-card flex items-stretch rounded-2xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)]">
          {guestNavItems.map((item) => (
            <DockItem key={item.path} {...item} />
          ))}
        </div>
      </nav>
    )
  }

  // Modo normal: dock completa com "Mais"
  return (
    <>
      <MorePanel open={moreOpen} onClose={() => setMoreOpen(false)} />

      <nav
        className="fixed inset-x-3 z-50 md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="glass-card flex items-stretch rounded-2xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)]">
          {navItems.map((item) => (
            <DockItem key={item.path} {...item} />
          ))}

          <button
            onClick={() => setMoreOpen(v => !v)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
              moreOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300",
                moreOpen && "bg-primary/15 shadow-[0_0_16px_-2px_var(--glow-primary)] scale-105",
              )}
            >
              {moreOpen ? <X size={18} strokeWidth={2.5} /> : <MoreHorizontal size={18} strokeWidth={1.75} />}
            </div>
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </div>
      </nav>
    </>
  )
}