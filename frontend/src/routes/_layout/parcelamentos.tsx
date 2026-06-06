// frontend/src/routes/_layout/parcelamentos.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  Plus, X, Loader2, CreditCard,
  CheckCircle2, Clock, ChevronDown, ChevronUp, Trash2, Ban,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, BASE } from "@/lib/api"
import { useTransactionCategories } from "@/hooks/api/useCategorias"

export const Route = createFileRoute("/_layout/parcelamentos")({
  component: ParcelamentosPage,
  head: () => ({ meta: [{ title: "Parcelamentos — FinanceOS" }] }),
})

// ── Types ─────────────────────────────────────────────────────────────────────

interface Installment {
  id: number; plan_id: number; installment_number: number
  due_date: string; value: number; status: "pending" | "paid" | "overdue"
  transaction_id: number | null
}
interface InstallmentPlan {
  id: number; user_id: number; category_id: number
  category_name: string; category_acronym: string; description: string
  total_value: number; installment_value: number; total_installments: number
  paid_installments: number; remaining_installments: number; remaining_value: number
  progress_percentage: number; first_due_date: string; next_due_date: string | null
  status: "active" | "completed" | "cancelled"; installments: Installment[]
}
interface Summary {
  total_plans: number; active_plans: number
  total_committed_monthly: number; total_remaining_value: number; plans: InstallmentPlan[]
}
interface PlanCreate {
  category_id: number; description: string; total_value: number
  installment_value: number; total_installments: number; first_due_date: string
}

const keys = {
  all: ["installments"] as const,
  summary: (m: number, y: number) => ["installments", "summary", m, y] as const,
}

function useSummary(month: number, year: number) {
  return useQuery<Summary>({
    queryKey: keys.summary(month, year),
    queryFn: () => api.get(`${BASE}/installment/summary?month=${month}&year=${year}`).then(r => r.data),
  })
}
function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PlanCreate) => api.post(`${BASE}/installment/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/installment/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
function useCancelPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.patch(`${BASE}/installment/${id}`, { status: "cancelled" }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
function usePayInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, instId }: { planId: number; instId: number }) =>
      api.post(`${BASE}/installment/${planId}/installments/${instId}/pay`, {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}
function useUnpayInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, instId }: { planId: number; instId: number }) =>
      api.post(`${BASE}/installment/${planId}/installments/${instId}/unpay`, {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

const fmtBRL  = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
const COLORS  = ["#4ade80","#22d3ee","#a78bfa","#fbbf24","#f87171","#fb923c","#38bdf8","#f472b6"]

// ── Modal mobile-safe ─────────────────────────────────────────────────────────

function NovoPlanModal({ onClose }: { onClose: () => void }) {
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreatePlan()
  const [form, setForm] = useState({
    category_id: "", description: "", total_installments: "",
    installment_value: "", first_due_date: "",
  })
  const totalValue = Number(form.total_installments || 0) * Number(form.installment_value || 0)
  const isValid =
    form.category_id !== "" && form.description.trim() !== "" &&
    Number(form.total_installments) >= 1 && Number(form.installment_value) > 0 &&
    form.first_due_date !== ""

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate(
      {
        category_id: Number(form.category_id), description: form.description.trim(),
        total_value: totalValue, installment_value: Number(form.installment_value),
        total_installments: Number(form.total_installments), first_due_date: form.first_due_date,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-sm flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold">Novo Parcelamento</h2>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.description} ({c.acronym})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descrição</label>
              <Input placeholder="Ex: Notebook Dell" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nº parcelas</label>
                <Input type="number" min="1" placeholder="12" value={form.total_installments}
                  onChange={e => setForm(f => ({ ...f, total_installments: e.target.value }))} className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor parcela</label>
                <Input type="number" min="0" step="0.01" placeholder="R$ 0,00" value={form.installment_value}
                  onChange={e => setForm(f => ({ ...f, installment_value: e.target.value }))} className="h-10 text-sm" />
              </div>
            </div>
            {totalValue > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total da compra</span>
                <span className="font-semibold">{fmtBRL(totalValue)}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">1ª parcela</label>
              <Input type="date" value={form.first_due_date}
                onChange={e => setForm(f => ({ ...f, first_due_date: e.target.value }))} className="h-10 text-sm" />
            </div>
          </div>
          <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 h-10" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Criar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Card de Plano ─────────────────────────────────────────────────────────────

function PlanCard({ plan, color }: { plan: InstallmentPlan; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const deleteMut = useDeletePlan()
  const cancelMut = useCancelPlan()
  const payMut    = usePayInstallment()
  const unpayMut  = useUnpayInstallment()

  const isActive    = plan.status === "active"
  const isCompleted = plan.status === "completed"
  const isCancelled = plan.status === "cancelled"
  const pct = Math.min(plan.progress_percentage, 100)

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
      isCompleted ? "border-emerald-500/30" :
      isCancelled ? "border-muted opacity-60" : "border-border hover:border-primary/30"
    )}>
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ background: color }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
              style={{ background: `${color}20`, color }}>
              {plan.category_acronym.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{plan.description}</p>
              <p className="text-[11px] text-muted-foreground">{plan.category_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isCompleted && <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-500">Quitado</span>}
            {isCancelled && <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-muted text-muted-foreground">Cancelado</span>}
            {isActive && (
              <button onClick={() => { if (confirm(`Cancelar "${plan.description}"?`)) cancelMut.mutate(plan.id) }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors">
                <Ban size={13} />
              </button>
            )}
            {plan.paid_installments === 0 && (
              <button onClick={() => { if (confirm(`Remover "${plan.description}"?`)) deleteMut.mutate(plan.id) }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Valores */}
        <div className="flex items-end justify-between text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Parcela</p>
            <p className="font-semibold" style={{ color }}>{fmtBRL(plan.installment_value)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Restante</p>
            <p className="font-semibold">{fmtBRL(plan.remaining_value)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="font-medium text-muted-foreground">{fmtBRL(plan.total_value)}</p>
          </div>
        </div>

        {/* Progresso */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">{plan.paid_installments}/{plan.total_installments} pagas</span>
            <span className={cn("font-medium", isCompleted ? "text-emerald-500" : "")}>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", isCompleted ? "bg-emerald-500" : "")}
              style={{ width: `${pct}%`, backgroundColor: isCompleted ? undefined : color }} />
          </div>
        </div>

        {plan.next_due_date && isActive && (
          <p className="text-[11px] text-muted-foreground">
            Próximo: <span className="font-medium text-foreground">{fmtDate(plan.next_due_date)}</span>
          </p>
        )}

        {/* Toggle parcelas */}
        <button onClick={() => setExpanded(e => !e)}
          className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors">
          <span>Ver parcelas</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Lista de parcelas */}
        {expanded && (
          <div className="space-y-1.5 pt-1">
            {plan.installments.map(inst => {
              const isPaid = inst.status === "paid"
              return (
                <div key={inst.id} className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs border transition-colors",
                  isPaid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-transparent"
                )}>
                  <div className="flex items-center gap-2">
                    {isPaid
                      ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      : <Clock size={12} className="text-muted-foreground shrink-0" />}
                    <span className={cn(isPaid ? "line-through text-muted-foreground" : "")}>
                      {inst.installment_number}ª — {fmtDate(inst.due_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{fmtBRL(inst.value)}</span>
                    {isActive && (
                      <button
                        onClick={() => isPaid
                          ? unpayMut.mutate({ planId: plan.id, instId: inst.id })
                          : payMut.mutate({ planId: plan.id, instId: inst.id })}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                          isPaid
                            ? "text-muted-foreground hover:bg-muted"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        {isPaid ? "Desfazer" : "Pagar"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ParcelamentosPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "cancelled">("all")

  const { data: summary, isLoading } = useSummary(month, year)
  const plans = (summary?.plans ?? []).filter(p => filter === "all" || p.status === filter)

  const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const filterLabels = { all: "Todos", active: "Ativos", completed: "Quitados", cancelled: "Cancelados" }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Parcelamentos</h1>
          <p className="text-xs text-muted-foreground">
            {summary?.active_plans ?? 0} ativo{(summary?.active_plans ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModal(true)}>
          <Plus size={14} /> Novo
        </Button>
      </div>

      {/* Seletor de mês */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <button onClick={prevMonth} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">‹</button>
        <span className="text-sm font-semibold">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">›</button>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { label: "Comprometido/mês", value: fmtBRL(summary.total_committed_monthly), accent: "#f87171" },
            { label: "Total restante",   value: fmtBRL(summary.total_remaining_value),    accent: "#a78bfa" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-sm font-bold" style={{ color: accent }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros — overflow-x-auto para não quebrar em mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(filterLabels) as Array<keyof typeof filterLabels>).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3].map(i => <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <CreditCard size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhum parcelamento encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">Clique em "Novo" para registrar uma compra parcelada</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((p, i) => <PlanCard key={p.id} plan={p} color={COLORS[i % COLORS.length]} />)}
        </div>
      )}

      {modal && <NovoPlanModal onClose={() => setModal(false)} />}
    </div>
  )
}