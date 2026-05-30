import { createFileRoute } from "@tanstack/react-router"
import { Plus, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGoals } from "@/hooks/api/useGoals"

export const Route = createFileRoute("/_layout/metas")({
  component: MetasPage,
  head: () => ({ meta: [{ title: "Metas — FinanceOS" }] }),
})

const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171"]
const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function MetasPage() {
  const { goals, ativas, concluidas, totalAlvo, totalAtual, progressoGeral, isLoading } = useGoals()

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 pb-24 sm:space-y-5 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Metas Financeiras</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{ativas.length} ativas · {concluidas.length} concluída(s)</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus size={14} /> Nova Meta
        </Button>
      </div>

      {/* Progresso geral */}
      {ativas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Progresso Geral</h2>
            <span className="text-xs text-muted-foreground">{fmtBRL(totalAtual)} / {fmtBRL(totalAlvo)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-700"
              style={{ width: `${progressoGeral}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{progressoGeral}% concluído</span>
            <span>Faltam {fmtBRL(totalAlvo - totalAtual)}</span>
          </div>
        </div>
      )}

      {/* Metas ativas */}
      {ativas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">Você não tem metas ativas ainda.</p>
          <Button size="sm" variant="outline" className="gap-1.5"><Plus size={14} /> Criar primeira meta</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ativas.map((m, i) => {
            const cor = COLORS[i % COLORS.length]
            const pct = Number(m.target_value) > 0
              ? Math.min(100, Math.round((Number(m.current_value) / Number(m.target_value)) * 100))
              : 0
            const prazoDate = m.deadline ? new Date(m.deadline) : null
            const mesesRestantes = prazoDate
              ? Math.max(0, Math.round((prazoDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
              : null

            return (
              <div key={m.id} className="rounded-xl border border-border bg-card p-4 sm:p-5 transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{m.title}</p>
                    {mesesRestantes !== null && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {mesesRestantes} meses restantes
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold shrink-0" style={{ color: cor }}>{pct}%</span>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cor }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{fmtBRL(Number(m.current_value))} / {fmtBRL(Number(m.target_value))}</span>
                  {m.suggested_contribution && (
                    <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: `${cor}20`, color: cor }}>
                      +{fmtBRL(Number(m.suggested_contribution))}/mês
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Concluídas */}
      {concluidas.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídas</h2>
          <div className="space-y-2">
            {concluidas.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 opacity-70">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-through text-muted-foreground truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{fmtBRL(Number(m.target_value))}</p>
                </div>
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
