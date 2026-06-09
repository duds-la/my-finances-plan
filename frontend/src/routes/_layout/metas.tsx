// frontend/src/routes/_layout/metas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  Plus, CheckCircle2, Clock, X, Loader2,
  ChevronDown, ChevronUp, TrendingUp, History,
  Eye, Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useGoals, useCreateGoal, useAddContribution,
  useGoalContributions,
  type FinancialGoal, type GoalContribution,
} from "@/hooks/api/useGoals"
import { useSharedGoals } from "@/hooks/api/useGuestAccess"
import { useCurrentUser } from "@/hooks/api/useCurrentUser"

export const Route = createFileRoute("/_layout/metas")({
  component: MetasPage,
  head: () => ({ meta: [{ title: "Metas — FinanceOS" }] }),
})

const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171"]
const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const fmtBRLFull = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

// ── Modal: Nova Meta ──────────────────────────────────────────────────────────

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

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-[61] w-full sm:max-w-md max-h-[90svh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Nova Meta</h2>
            <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <Input placeholder="Nome da meta (ex: Carro, Viagem...)" value={form.title} onChange={set("title")} className="h-9 text-sm" />
            <Input placeholder="Valor alvo (R$)" type="number" value={form.target_value} onChange={set("target_value")} className="h-9 text-sm" />
            <Input placeholder="Já tenho (R$) — opcional" type="number" value={form.current_value} onChange={set("current_value")} className="h-9 text-sm" />
            <Input placeholder="Prazo — opcional" type="date" value={form.deadline} onChange={set("deadline")} className="h-9 text-sm" />
            <Input placeholder="Aporte mensal sugerido (R$) — opcional" type="number" value={form.suggested_contribution} onChange={set("suggested_contribution")} className="h-9 text-sm" />
          </div>

          <div className="flex gap-2 shrink-0 px-5 py-4 border-t border-border">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Criar Meta"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Modal: Aportar ────────────────────────────────────────────────────────────

function AportarModal({ goal, color, onClose }: {
  goal: FinancialGoal; color: string; onClose: () => void
}) {
  const addMut = useAddContribution()
  const [value, setValue] = useState("")

  const faltam = Math.max(0, Number(goal.target_value) - Number(goal.current_value))
  const suggested = goal.suggested_contribution ? Number(goal.suggested_contribution) : null
  const isValid = !!value && Number(value) > 0

  const handleSubmit = () => {
    if (!isValid) return
    addMut.mutate(
      { goal_id: goal.id, value: Number(value) },
      { onSuccess: onClose }
    )
  }

  const quickValues = [
    ...(suggested ? [suggested] : []),
    ...(faltam > 0 && faltam !== suggested ? [faltam] : []),
  ].slice(0, 2)

  return (
    <div className="fixed inset-0 z-[62] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[63] w-full sm:max-w-sm max-h-[90svh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Registrar Aporte</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{goal.title}</p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <Input
            placeholder="Valor (R$)"
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="h-10 text-base"
            autoFocus
          />
          {quickValues.length > 0 && (
            <div className="flex gap-2">
              {quickValues.map(v => (
                <button
                  key={v}
                  onClick={() => setValue(String(v))}
                  className="flex-1 rounded-lg border border-border bg-muted/30 py-2 text-xs font-medium hover:bg-muted transition-colors"
                  style={{ color }}
                >
                  {fmtBRL(v)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={!isValid || addMut.isPending}
            style={{ backgroundColor: color, color: "#000" }}>
            {addMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Histórico de aportes ──────────────────────────────────────────────────────

function GoalHistory({ goalId, color }: { goalId: number; color: string }) {
  const { data: contributions = [], isLoading } = useGoalContributions(goalId)

  if (isLoading) return <div className="h-10 animate-pulse rounded-lg bg-muted" />
  if (!contributions.length) return <p className="text-xs text-muted-foreground text-center py-2">Nenhum aporte registrado</p>

  const sorted = [...contributions].sort(
    (a, b) => new Date(b.contribution_date).getTime() - new Date(a.contribution_date).getTime()
  )

  return (
    <div className="space-y-1 pt-1 max-h-52 overflow-y-auto">
      {sorted.map((c: GoalContribution) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground truncate">{fmtDate(c.contribution_date)}</span>
          </div>
          <span className="font-semibold shrink-0 ml-2" style={{ color }}>
            +{fmtBRLFull(Number(c.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Card de Meta ──────────────────────────────────────────────────────────────

function MetaCard({ meta, color, readOnly = false }: {
  meta: FinancialGoal; color: string; readOnly?: boolean
}) {
  const [showHistory, setShowHistory] = useState(false)
  const [aportarOpen, setAportarOpen] = useState(false)

  const pct = Number(meta.target_value) > 0
    ? Math.min(100, Math.round((Number(meta.current_value) / Number(meta.target_value)) * 100))
    : 0

  const prazoDate = meta.deadline ? new Date(meta.deadline + "T00:00:00") : null
  const mesesRestantes = prazoDate
    ? Math.max(0, Math.round((prazoDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
    : null

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {pct}%
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate">{meta.title}</p>
                {readOnly && (
                  <span className="flex items-center gap-0.5 rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-500 shrink-0">
                    <Share2 size={9} /> compartilhada
                  </span>
                )}
              </div>
            </div>
          </div>
          {prazoDate && (
            <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
              <Clock size={10} />
              {mesesRestantes === 0 ? "Este mês" : `${mesesRestantes}m`}
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>

        {/* Valores */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fmtBRL(Number(meta.current_value))}</span>
          <span className="font-medium" style={{ color }}>{fmtBRL(Number(meta.target_value))}</span>
        </div>

        {/* Aporte sugerido */}
        {meta.suggested_contribution && (
          <p className="text-[11px] text-muted-foreground">
            Aporte sugerido: <span className="font-medium text-foreground">{fmtBRL(Number(meta.suggested_contribution))}/mês</span>
          </p>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-1">
          {!readOnly && (
            <Button
              size="sm"
              className="flex-1 h-8 gap-1.5 text-xs"
              style={{ backgroundColor: color, color: "#000" }}
              onClick={() => setAportarOpen(true)}
            >
              <TrendingUp size={12} /> Aportar
            </Button>
          )}
          {readOnly && (
            <div className="flex flex-1 items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <Eye size={12} /> Somente visualização
            </div>
          )}
          <button
            onClick={() => setShowHistory(v => !v)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              showHistory
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <History size={12} />
            Histórico
            {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>

        {/* Histórico expansível */}
        {showHistory && <GoalHistory goalId={meta.id} color={color} />}
      </div>

      {aportarOpen && !readOnly && (
        <AportarModal goal={meta} color={color} onClose={() => setAportarOpen(false)} />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MetasPage() {
  const { data: userInfo } = useCurrentUser()
  const isGuest = userInfo?.is_guest ?? false

  // Dono usa os próprios hooks; convidado usa o hook de dados compartilhados
  const { goals: ownGoals = [], ativas: ownAtivas, concluidas: ownConcluidas,
    totalAlvo: ownAlvo, totalAtual: ownAtual, progressoGeral: ownProgress,
    isLoading: loadingOwn } = useGoals()

  const { data: sharedGoals = [], isLoading: loadingGuest } = useSharedGoals(isGuest)

  const [modalOpen, setModalOpen] = useState(false)

  const isLoading = isGuest ? loadingGuest : loadingOwn

  // Para convidados, todas as metas compartilhadas são tratadas como ativas
  const goals     = isGuest ? sharedGoals : ownGoals
  const ativas    = isGuest ? sharedGoals.filter(g => g.status === "em_andamento") : ownAtivas
  const concluidas = isGuest ? sharedGoals.filter(g => g.status === "concluida") : ownConcluidas

  const totalAlvo    = ativas.reduce((s, g) => s + Number(g.target_value), 0)
  const totalAtual   = ativas.reduce((s, g) => s + Number(g.current_value), 0)
  const progressoGeral = totalAlvo > 0 ? Math.round((totalAtual / totalAlvo) * 100) : 0

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
      {modalOpen && !isGuest && <NovaMetaModal onClose={() => setModalOpen(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {isGuest ? "Metas Compartilhadas" : "Metas Financeiras"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {ativas.length} ativa{ativas.length !== 1 ? "s" : ""}
            {!isGuest && ` · ${concluidas.length} concluída${concluidas.length !== 1 ? "s" : ""}`}
            {isGuest && " · somente visualização"}
          </p>
        </div>
        {!isGuest && (
          <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nova Meta
          </Button>
        )}
      </div>

      {/* Banner convidado */}
      {isGuest && (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <Share2 size={14} className="text-cyan-500 shrink-0" />
          <p className="text-xs text-cyan-600 dark:text-cyan-400">
            Você está visualizando metas compartilhadas com você. As ações de edição não estão disponíveis.
          </p>
        </div>
      )}

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
          <p className="text-sm text-muted-foreground">
            {isGuest ? "Nenhuma meta foi compartilhada com você ainda." : "Você não tem metas ativas ainda."}
          </p>
          {!isGuest && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Criar primeira meta
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ativas.map((m, i) => (
            <MetaCard key={m.id} meta={m} color={COLORS[i % COLORS.length]} readOnly={isGuest} />
          ))}
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
