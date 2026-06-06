// frontend/src/routes/_layout/metas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Plus, CheckCircle2, Clock, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useGoals, useCreateGoal } from "@/hooks/api/useGoals"

export const Route = createFileRoute("/_layout/metas")({
  component: MetasPage,
  head: () => ({ meta: [{ title: "Metas — FinanceOS" }] }),
})

const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171"]
const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// ── Modal mobile-safe ─────────────────────────────────────────────────────────

function NovaMetaModal({ onClose }: { onClose: () => void }) {
  const createMut = useCreateGoal()
  const [form, setForm] = useState({
    title: "", target_value: "", current_value: "",
    deadline: "", suggested_contribution: "",
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = () => {
    const target = parseFloat(form.target_value.replace(",", "."))
    if (!form.title.trim() || !target) return
    createMut.mutate(
      {
        title: form.title.trim(),
        target_value: target,
        current_value: form.current_value ? parseFloat(form.current_value.replace(",", ".")) : 0,
        deadline: form.deadline || undefined,
        suggested_contribution: form.suggested_contribution
          ? parseFloat(form.suggested_contribution.replace(",", "."))
          : undefined,
      },
      { onSuccess: onClose }
    )
  }

  const isValid = form.title.trim() !== "" && form.target_value.trim() !== ""

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold">Nova Meta Financeira</h2>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da Meta *</label>
              <Input placeholder="Ex: Reserva de emergência" value={form.title} onChange={set("title")} className="h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Alvo (R$) *</label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.target_value} onChange={set("target_value")} className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Já tenho (R$)</label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.current_value} onChange={set("current_value")} className="h-10 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo</label>
              <Input type="date" value={form.deadline} onChange={set("deadline")} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aporte mensal sugerido (R$)</label>
              <Input type="number" step="0.01" placeholder="0,00" value={form.suggested_contribution} onChange={set("suggested_contribution")} className="h-10 text-sm" />
            </div>
          </div>
          <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 h-10" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Criar Meta"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MetasPage() {
  const { goals, ativas, concluidas, totalAlvo, totalAtual, progressoGeral, isLoading } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {modalOpen && <NovaMetaModal onClose={() => setModalOpen(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Metas Financeiras</h1>
          <p className="text-xs text-muted-foreground">{ativas.length} ativa{ativas.length !== 1 ? "s" : ""} · {concluidas.length} concluída{concluidas.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Nova Meta
        </Button>
      </div>

      {/* Progresso geral */}
      {ativas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Progresso Geral</h2>
            <span className="text-xs text-muted-foreground">{fmtBRL(totalAtual)} / {fmtBRL(totalAlvo)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-700"
              style={{ width: `${progressoGeral}%` }} />
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
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ativas.map((m, i) => {
            const cor = COLORS[i % COLORS.length]
            const pct = Number(m.target_value) > 0
              ? Math.min(100, Math.round((Number(m.current_value) / Number(m.target_value)) * 100))
              : 0
            const prazoDate = m.deadline ? new Date(m.deadline + "T00:00:00") : null
            const mesesRestantes = prazoDate
              ? Math.max(0, Math.round((prazoDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
              : null

            return (
              <div key={m.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      style={{ backgroundColor: cor }}>
                      {pct}%
                    </div>
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                  </div>
                  {prazoDate && (
                    <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
                      <Clock size={10} />
                      {mesesRestantes === 0 ? "Este mês" : `${mesesRestantes}m`}
                    </div>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: cor }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmtBRL(Number(m.current_value))}</span>
                  <span className="font-medium" style={{ color: cor }}>{fmtBRL(Number(m.target_value))}</span>
                </div>
                {m.suggested_contribution && (
                  <p className="text-[11px] text-muted-foreground">
                    Aporte sugerido: <span className="font-medium text-foreground">{fmtBRL(Number(m.suggested_contribution))}/mês</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Metas concluídas */}
      {concluidas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concluídas</h2>
          {concluidas.map(m => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 opacity-60">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{m.title}</p>
                <p className="text-xs text-muted-foreground">{fmtBRL(Number(m.target_value))}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}