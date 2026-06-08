// frontend/src/routes/_layout/metas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  Plus, CheckCircle2, Clock, Loader2,
  ChevronDown, ChevronUp, TrendingUp, History,
  Pencil, Trash2, MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal,
  useAddContribution, useGoalContributions,
  type FinancialGoal, type GoalContribution,
} from "@/hooks/api/useGoals"

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
  new Date(s + (s.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })

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
      { onSuccess: onClose },
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-4 top-auto z-[61] flex max-h-[90svh] flex-col rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto">
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-base font-semibold">Nova Meta Financeira</h2>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da meta *</label>
            <Input placeholder="Ex: Viagem para Europa" value={form.title} onChange={set("title")} className="h-10 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor alvo (R$) *</label>
            <Input type="number" step="0.01" placeholder="0,00" value={form.target_value} onChange={set("target_value")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor atual (R$)</label>
            <Input type="number" step="0.01" placeholder="0,00" value={form.current_value} onChange={set("current_value")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo</label>
            <Input type="date" value={form.deadline} onChange={set("deadline")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aporte sugerido (R$)</label>
            <Input type="number" step="0.01" placeholder="0,00" value={form.suggested_contribution} onChange={set("suggested_contribution")} className="h-10 text-sm" />
          </div>
        </div>
        <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-10" onClick={handleSubmit}
            disabled={!form.title.trim() || !form.target_value || createMut.isPending}>
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Criar Meta"}
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Modal: Editar Meta ────────────────────────────────────────────────────────

function EditarMetaModal({ goal, onClose }: { goal: FinancialGoal; onClose: () => void }) {
  const updateMut = useUpdateGoal()
  const [form, setForm] = useState({
    title: goal.title,
    target_value: String(goal.target_value),
    current_value: String(goal.current_value),
    deadline: goal.deadline ?? "",
    suggested_contribution: goal.suggested_contribution ? String(goal.suggested_contribution) : "",
    status: goal.status,
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = () => {
    const target = parseFloat(form.target_value.replace(",", "."))
    if (!form.title.trim() || !target) return
    updateMut.mutate(
      {
        id: goal.id,
        data: {
          title: form.title.trim(),
          target_value: target,
          current_value: form.current_value ? parseFloat(form.current_value.replace(",", ".")) : 0,
          deadline: form.deadline || undefined,
          suggested_contribution: form.suggested_contribution
            ? parseFloat(form.suggested_contribution.replace(",", "."))
            : undefined,
          status: form.status,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-4 top-auto z-[61] flex max-h-[90svh] flex-col rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto">
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-base font-semibold">Editar Meta</h2>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome da meta *</label>
            <Input placeholder="Ex: Viagem para Europa" value={form.title} onChange={set("title")} className="h-10 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor alvo (R$) *</label>
            <Input type="number" step="0.01" placeholder="0,00" value={form.target_value} onChange={set("target_value")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor atual (R$)</label>
            <Input type="number" step="0.01" placeholder="0,00" value={form.current_value} onChange={set("current_value")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo</label>
            <Input type="date" value={form.deadline} onChange={set("deadline")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aporte sugerido (R$)</label>
            <Input type="number" step="0.01" placeholder="0,00" value={form.suggested_contribution} onChange={set("suggested_contribution")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
            <select
              value={form.status}
              onChange={set("status")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
        <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-10" onClick={handleSubmit}
            disabled={!form.title.trim() || !form.target_value || updateMut.isPending}>
            {updateMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
          </Button>
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
  ].filter(v => v > 0)

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-4 top-auto z-[61] flex max-h-[90svh] flex-col rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-[400px] sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto">
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-base font-semibold">Registrar Aporte</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{goal.title}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Progresso atual */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progresso atual</span>
              <span className="font-medium">
                {fmtBRLFull(Number(goal.current_value))} / {fmtBRLFull(Number(goal.target_value))}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100))}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>

          {/* Valores rápidos */}
          {quickValues.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sugestões</label>
              <div className="flex flex-wrap gap-2">
                {quickValues.map(v => (
                  <button
                    key={v}
                    onClick={() => setValue(String(v))}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      String(v) === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}>
                    {fmtBRLFull(v)}
                    {suggested && v === suggested && <span className="ml-1 opacity-60">(sugerido)</span>}
                    {v === faltam && faltam > 0 && <span className="ml-1 opacity-60">(concluir)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Campo de valor */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor do aporte (R$)</label>
            <Input
              type="number" step="0.01" placeholder="0,00"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="h-10 text-sm"
              autoFocus
            />
          </div>

          {/* Preview do novo progresso */}
          {isValid && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Novo saldo</span>
                <span className="font-semibold" style={{ color }}>
                  {fmtBRLFull(Number(goal.current_value) + Number(value))}
                </span>
              </div>
              {Number(goal.current_value) + Number(value) >= Number(goal.target_value) && (
                <p className="text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 size={11} /> Meta concluída com este aporte!
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-10 gap-1.5" onClick={handleSubmit} disabled={!isValid || addMut.isPending}>
            {addMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <><TrendingUp size={14} /> Aportar</>}
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Histórico de aportes (expansível) ────────────────────────────────────────

function GoalHistory({ goalId, color }: { goalId: number; color: string }) {
  const { data: contributions = [], isLoading } = useGoalContributions(goalId)

  if (isLoading) {
    return (
      <div className="space-y-1.5 pt-1">
        {[1, 2].map(i => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}
      </div>
    )
  }

  if (contributions.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        Nenhum aporte registrado ainda.
      </p>
    )
  }

  const sorted = [...contributions].sort(
    (a, b) => new Date(b.contribution_date).getTime() - new Date(a.contribution_date).getTime()
  )

  return (
    <div className="space-y-1 pt-1 max-h-52 overflow-y-auto">
      {sorted.map((c: GoalContribution) => (
        <div key={c.id}
          className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground truncate">
              {fmtDate(c.contribution_date)}
            </span>
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

function MetaCard({ meta, color }: { meta: FinancialGoal; color: string }) {
  const deleteMut = useDeleteGoal()
  const [showHistory, setShowHistory] = useState(false)
  const [aportarOpen, setAportarOpen] = useState(false)
  const [editarOpen, setEditarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pct = Number(meta.target_value) > 0
    ? Math.min(100, Math.round((Number(meta.current_value) / Number(meta.target_value)) * 100))
    : 0

  const prazoDate = meta.deadline ? new Date(meta.deadline + "T00:00:00") : null
  const mesesRestantes = prazoDate
    ? Math.max(0, Math.round((prazoDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
    : null

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setMenuOpen(false)
      return
    }
    deleteMut.mutate(meta.id)
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ backgroundColor: color }}>
              {pct}%
            </div>
            <p className="text-sm font-semibold truncate">{meta.title}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {prazoDate && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mr-1">
                <Clock size={10} />
                {mesesRestantes === 0
                  ? "Este mês"
                  : `${mesesRestantes}m`}
              </div>
            )}

            {/* Menu de ações */}
            <div className="relative">
              <button
                onClick={() => { setMenuOpen(v => !v); setConfirmDelete(false) }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    <button
                      onClick={() => { setEditarOpen(true); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                    >
                      <Pencil size={12} /> Editar meta
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={12} /> Excluir meta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Confirmação de exclusão */}
        {confirmDelete && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 space-y-2">
            <p className="text-xs text-rose-500 font-medium">Confirmar exclusão de "{meta.title}"?</p>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-xs bg-rose-500 hover:bg-rose-600 text-white border-0"
                onClick={handleDelete}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? <Loader2 size={11} className="animate-spin" /> : "Excluir"}
              </Button>
            </div>
          </div>
        )}

        {/* Barra de progresso */}
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{fmtBRL(Number(meta.current_value))}</span>
            <span className="font-medium">{fmtBRL(Number(meta.target_value))}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            size="sm"
            className="flex-1 h-8 gap-1.5 text-xs"
            style={{ backgroundColor: color, color: "white", border: "none" }}
            onClick={() => setAportarOpen(true)}
          >
            <TrendingUp size={12} /> Aportar
          </Button>

          <button
            onClick={() => setShowHistory(v => !v)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors h-8",
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

      {aportarOpen && (
        <AportarModal goal={meta} color={color} onClose={() => setAportarOpen(false)} />
      )}
      {editarOpen && (
        <EditarMetaModal goal={meta} onClose={() => setEditarOpen(false)} />
      )}
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
          <p className="text-xs text-muted-foreground">
            {ativas.length} ativa{ativas.length !== 1 ? "s" : ""} · {concluidas.length} concluída{concluidas.length !== 1 ? "s" : ""}
          </p>
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
          {ativas.map((m, i) => (
            <MetaCard key={m.id} meta={m} color={COLORS[i % COLORS.length]} />
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