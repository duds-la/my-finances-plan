import { createFileRoute } from "@tanstack/react-router"
import { Trophy, Lock, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAchievements } from "@/hooks/api/useAchievements"
import type { AchievementEnriched } from "@/hooks/api/useAchievements"

export const Route = createFileRoute("/_layout/conquistas")({
  component: ConquistasPage,
  head: () => ({ meta: [{ title: "Conquistas — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  trophy: "🏆", star: "⭐", fire: "🔥", rocket: "🚀", gem: "💎",
  crown: "👑", shield: "🛡️", target: "🎯", chart: "📈", wallet: "💰",
  piggy: "🐷", lock: "🔒", key: "🔑", lightning: "⚡", heart: "❤️",
}

function getIcon(icon?: string) {
  if (!icon) return "🏅"
  return ICON_MAP[icon.toLowerCase()] ?? icon
}

function AchievementCard({ achievement }: { achievement: AchievementEnriched }) {
  const { unlocked, title, description, points, icon, unlocked_at } = achievement

  return (
    <div className={cn(
      "relative rounded-xl border p-4 transition-all",
      unlocked
        ? "border-border bg-card hover:shadow-md"
        : "border-border/50 bg-card/40 opacity-60"
    )}>
      {/* Ícone */}
      <div className={cn(
        "mb-3 flex size-10 items-center justify-center rounded-xl text-xl",
        unlocked ? "bg-amber-500/15" : "bg-muted"
      )}>
        {unlocked ? getIcon(icon) : <Lock size={16} className="text-muted-foreground" />}
      </div>

      {/* Conteúdo */}
      <p className={cn("text-sm font-semibold leading-tight", !unlocked && "text-muted-foreground")}>
        {title}
      </p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{description}</p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          unlocked ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground"
        )}>
          <Star size={10} />
          {points} pts
        </div>
        {unlocked && unlocked_at && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(unlocked_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      {/* Badge desbloqueado */}
      {unlocked && (
        <div className="absolute right-3 top-3 size-2 rounded-full bg-emerald-500" />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ConquistasPage() {
  const { desbloqueadas, bloqueadas, totalPontos, isLoading, achievements } = useAchievements()

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  const pct = achievements.length > 0
    ? Math.round((desbloqueadas.length / achievements.length) * 100)
    : 0

  return (
    <div className="space-y-5 p-4 pb-24 sm:p-6 sm:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Conquistas</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {desbloqueadas.length} de {achievements.length} desbloqueadas
        </p>
      </div>

      {/* Resumo */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            <span className="text-sm font-semibold">Progresso</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-500">
            <Star size={10} />
            {totalPontos} pontos
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{pct}% completo</span>
          <span>{bloqueadas.length} restante{bloqueadas.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Desbloqueadas */}
      {desbloqueadas.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Desbloqueadas · {desbloqueadas.length}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {desbloqueadas.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {/* Bloqueadas */}
      {bloqueadas.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bloqueadas · {bloqueadas.length}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {bloqueadas.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {achievements.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Trophy size={32} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma conquista cadastrada ainda.</p>
        </div>
      )}
    </div>
  )
}
