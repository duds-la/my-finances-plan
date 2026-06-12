import { createFileRoute } from "@tanstack/react-router"
import { Trophy, Lock, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAchievements } from "@/hooks/api/useAchievements"
import type { AchievementEnriched } from "@/hooks/api/useAchievements"
import { CineCard } from "@/components/Common/CineCard"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

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

const GOLD = "#fbbf24"

function AchievementCard({ achievement }: { achievement: AchievementEnriched }) {
  const { unlocked, title, description, points, icon, unlocked_at } = achievement

  return (
    <CineCard
      accent={GOLD}
      interactive={unlocked}
      className={cn("p-4", !unlocked && "opacity-55 saturate-50")}
    >
      {/* Ícone */}
      <div className={cn(
        "mb-3 flex size-10 items-center justify-center rounded-xl text-xl",
        unlocked ? "bg-amber-500/15" : "bg-muted"
      )}
        style={unlocked ? { boxShadow: "0 0 16px -4px rgba(251,191,36,.6)" } : undefined}
      >
        {unlocked ? getIcon(icon) : <Lock size={16} className="text-muted-foreground" />}
      </div>

      {/* Conteúdo */}
      <p className={cn("text-sm font-semibold leading-tight", !unlocked && "text-muted-foreground")}>
        {title}
      </p>
      {description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className={cn(
          "font-numeric flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
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

      {/* Badge desbloqueado — ponto pulsante */}
      {unlocked && (
        <div className="status-dot absolute right-3 top-3 size-2 rounded-full bg-emerald-500" />
      )}
    </CineCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ConquistasPage() {
  const { desbloqueadas, bloqueadas, totalPontos, isLoading, achievements } = useAchievements()

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-20 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const pct = achievements.length > 0
    ? Math.round((desbloqueadas.length / achievements.length) * 100)
    : 0

  return (
    <div className="space-y-5 p-4 pb-24 sm:p-6 sm:pb-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Gamificação"
        title="Conquistas"
        subtitle={`${desbloqueadas.length} de ${achievements.length} desbloqueadas`}
      />

      {/* ── Resumo ──────────────────────────────────────────────────────────── */}
      <CineCard accent={GOLD} className="animate-fade-up delay-1 p-4 opacity-0 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15"
              style={{ boxShadow: "0 0 14px -4px rgba(251,191,36,.6)" }}>
              <Trophy size={14} className="text-amber-500" />
            </div>
            <span className="font-display text-sm font-semibold">Progresso</span>
          </div>
          <div className="font-numeric flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-500"
            style={{ boxShadow: "0 0 16px -6px rgba(251,191,36,.8)" }}>
            <Star size={10} />
            <CountUp value={totalPontos} format={v => `${v.toFixed(0)} pontos`} />
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #fbbf24, #fb923c)",
              boxShadow: "0 0 12px rgba(251,191,36,.7)",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span className="font-numeric">{pct}% completo</span>
          <span>{bloqueadas.length} restante{bloqueadas.length !== 1 ? "s" : ""}</span>
        </div>
      </CineCard>

      {/* ── Desbloqueadas ───────────────────────────────────────────────────── */}
      {desbloqueadas.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Desbloqueadas · {desbloqueadas.length}
            </h2>
            <div className="divider-glow h-px flex-1" />
          </div>
          <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3">
            {desbloqueadas.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {/* ── Bloqueadas ──────────────────────────────────────────────────────── */}
      {bloqueadas.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Bloqueadas · {bloqueadas.length}
            </h2>
            <div className="divider-glow h-px flex-1 opacity-40" />
          </div>
          <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3">
            {bloqueadas.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {/* ── Estado vazio ────────────────────────────────────────────────────── */}
      {achievements.length === 0 && (
        <div className="glass-card animate-fade-up flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Trophy size={32} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma conquista cadastrada ainda.</p>
        </div>
      )}
    </div>
  )
}