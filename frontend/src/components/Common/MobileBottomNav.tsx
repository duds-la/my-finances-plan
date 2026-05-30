import { Link } from "@tanstack/react-router"
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Target,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ArrowLeftRight, label: "Transações", path: "/transacoes" },
  { icon: TrendingUp, label: "Investir", path: "/investimentos" },
  { icon: Target, label: "Metas", path: "/metas" },
  { icon: Bot, label: "IA", path: "/analise" },
]

export function MobileBottomNav() {
  return (
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
                <div className={cn(
                  "flex size-8 items-center justify-center rounded-xl transition-all",
                  isActive ? "bg-primary/15" : ""
                )}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "")}>
                  {label}
                </span>
              </>
            )}
          </Link>
        ))}
      </div>
      {/* safe area para iPhones */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  )
}
