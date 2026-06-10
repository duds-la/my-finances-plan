import { Link } from "@tanstack/react-router"
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Target,
  Wallet, PieChart, Settings, Users, Zap, Trophy,
  Bot, SlidersHorizontal, CreditCard, Archive, UserCheck,
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupLabel,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { useUserContext } from "@/contexts/UserContext"
import { SidebarAppearance } from "@/components/Common/Appearance"
import { User } from "./User"

// ── Logo ──────────────────────────────────────────────────────────────────────

function FinanceLogo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Orbe com gradiente animado + glow */}
      <div className="relative flex size-9 shrink-0 items-center justify-center">
        <div
          className="absolute inset-0 rounded-xl opacity-60 blur-md"
          style={{ background: "linear-gradient(135deg, var(--finance-green), var(--finance-cyan))" }}
        />
        <div
          className="relative flex size-9 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground"
          style={{
            background: "linear-gradient(135deg, var(--finance-green), var(--finance-cyan), var(--finance-purple))",
            backgroundSize: "200% 200%",
            animation: "gradientShift 6s ease-in-out infinite",
          }}
        >
          F
        </div>
      </div>
      <div className="group-data-[collapsible=icon]:hidden">
        <p className="font-display text-sm font-bold leading-none tracking-tight">
          Finance<span className="text-primary">OS</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Controle Financeiro</p>
      </div>
    </div>
  )
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const coreItems = [
  { icon: LayoutDashboard,   title: "Dashboard",      path: "/" },
  { icon: ArrowLeftRight,    title: "Transações",     path: "/transacoes" },
  { icon: Wallet,            title: "Orçamento",      path: "/orcamento" },
  { icon: SlidersHorizontal, title: "Configurações",  path: "/configuracoes" },
  { icon: Archive,           title: "Caixinhas",      path: "/caixinhas" },
]
const investItems = [
  { icon: TrendingUp, title: "Investimentos", path: "/investimentos" },
  { icon: PieChart,   title: "Portfólio",     path: "/portfolio" },
]
const planItems = [
  { icon: Target,     title: "Metas",         path: "/metas" },
  { icon: Zap,        title: "Simulações",    path: "/simulacoes" },
  { icon: Trophy,     title: "Conquistas",    path: "/conquistas" },
  { icon: CreditCard, title: "Parcelamentos", path: "/parcelamentos" },
]
const intelItems = [
  { icon: Bot, title: "Score & IA", path: "/analise" },
]

// Apenas estes dois para convidados
const guestItems = [
  { icon: Target,     title: "Metas",         path: "/metas" },
  { icon: TrendingUp, title: "Investimentos", path: "/investimentos" },
]

// ── NavGroup ──────────────────────────────────────────────────────────────────

function NavGroup({ label, items }: {
  label: string
  items: { icon: React.ElementType; title: string; path: string }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              className="group/nav relative overflow-hidden transition-all duration-200 hover:translate-x-0.5"
            >
              <Link
                to={item.path}
                activeProps={{
                  className: [
                    "!text-sidebar-accent-foreground font-medium",
                    // fundo com gradiente sutil
                    "!bg-gradient-to-r !from-sidebar-accent !to-transparent",
                    // barra de luz à esquerda
                    "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                    "before:h-4 before:w-[3px] before:rounded-full before:bg-primary",
                    "before:shadow-[0_0_10px_var(--glow-primary)]",
                    "before:animate-scale-in",
                  ].join(" "),
                }}
              >
                <item.icon size={16} className="transition-transform duration-200 group-hover/nav:scale-110" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// ── Divisor com brilho ────────────────────────────────────────────────────────

function GlowSeparator() {
  return <div className="divider-glow mx-3 my-1 opacity-50" />
}

// ── Sidebar principal ─────────────────────────────────────────────────────────

export function AppSidebar() {
  const { user: authUser } = useAuth()
  const { isGuest } = useUserContext()   // ← lê do context global

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/60 [&>div]:bg-sidebar/70 [&>div]:backdrop-blur-2xl"
    >
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <FinanceLogo />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {isGuest ? (
          // ── Modo convidado: só Metas e Investimentos ──
          <NavGroup label="Compartilhado comigo" items={guestItems} />
        ) : (
          // ── Modo normal: navegação completa ──
          <>
            <NavGroup label="Principal"     items={coreItems} />
            <GlowSeparator />
            <NavGroup label="Investimentos" items={investItems} />
            <GlowSeparator />
            <NavGroup label="Planejamento"  items={planItems} />
            <GlowSeparator />
            <NavGroup label="Inteligência"  items={intelItems} />

            {/* Seção Convidados */}
            <GlowSeparator />
            <NavGroup
              label="Acesso"
              items={[{ icon: UserCheck, title: "Convidados", path: "/convidados" }]}
            />

            {authUser?.is_superuser && (
              <>
                <GlowSeparator />
                <NavGroup
                  label="Admin"
                  items={[{ icon: Users, title: "Usuários", path: "/admin" }]}
                />
              </>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border/40 pb-3 pt-2">
        {!isGuest && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configurações">
                <Link
                  to="/settings"
                  activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground" }}
                >
                  <Settings size={16} />
                  <span>Configurações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarAppearance />
        <User user={authUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar