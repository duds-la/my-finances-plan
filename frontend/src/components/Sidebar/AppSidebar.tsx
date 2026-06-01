import { Link } from "@tanstack/react-router"
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Target,
  Wallet,
  PieChart,
  Settings,
  Users,
  Zap,
  Trophy,
  Bot,
  SlidersHorizontal,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { SidebarAppearance } from "@/components/Common/Appearance"
import { User } from "./User"

// Logo component
function FinanceLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-400 text-sm font-bold text-primary-foreground shadow-sm">
        F
      </div>
      {!collapsed && (
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight">FinanceOS</p>
          <p className="text-[10px] text-muted-foreground">Controle Financeiro</p>
        </div>
      )}
    </div>
  )
}

const coreItems = [
  { icon: LayoutDashboard, title: "Dashboard", path: "/" },
  { icon: ArrowLeftRight, title: "Transações", path: "/transacoes" },
  { icon: Wallet, title: "Orçamento", path: "/orcamento" },
  { icon: SlidersHorizontal, title: "Configurações", path: "/configuracoes" },
]

const investItems = [
  { icon: TrendingUp, title: "Investimentos", path: "/investimentos" },
  { icon: PieChart, title: "Portfólio", path: "/portfolio" },
]

const planItems = [
  { icon: Target, title: "Metas", path: "/metas" },
  { icon: Zap, title: "Simulações", path: "/simulacoes" },
  { icon: Trophy, title: "Conquistas", path: "/conquistas" },
]

const intelItems = [
  { icon: Bot, title: "Score & IA", path: "/analise" },
]

function NavGroup({ label, items }: { label: string; items: typeof coreItems }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <Link to={item.path} activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground font-medium" }}>
                <item.icon size={16} />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <FinanceLogo />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <NavGroup label="Principal" items={coreItems} />
        <SidebarSeparator className="my-1" />
        <NavGroup label="Investimentos" items={investItems} />
        <SidebarSeparator className="my-1" />
        <NavGroup label="Planejamento" items={planItems} />
        <SidebarSeparator className="my-1" />
        <NavGroup label="Inteligência" items={intelItems} />

        {currentUser?.is_superuser && (
          <>
            <SidebarSeparator className="my-1" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Admin
              </SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Usuários">
                    <Link to="/admin" activeProps={{ className: "!bg-sidebar-accent" }}>
                      <Users size={16} />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configurações">
              <Link to="/settings" activeProps={{ className: "!bg-sidebar-accent" }}>
                <Settings size={16} />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
