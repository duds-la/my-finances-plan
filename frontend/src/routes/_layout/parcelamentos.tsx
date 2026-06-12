// frontend/src/routes/_layout/parcelamentos.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  Plus, X, Loader2, CreditCard,
  CheckCircle2, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, Ban,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, BASE } from "@/lib/api"
import { useTransactionCategories } from "@/hooks/api/useCategorias"
import { CineCard } from "@/components/Common/CineCard"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/parcelamentos")({
  component: ParcelamentosPage,
  head: () => ({ meta: [{ title: "Parcelamentos — FinanceOS" }] }),
})
const TX_SAIDA_TYPE_ID = 7

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

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
]

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
      api.post(`${BASE}/installment/${planId}/installments/${instId}/pay`, {
        transaction_type_id: TX_SAIDA_TYPE_ID,
      }).then(r => r.data),
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

const fmtBRL  = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
const COLORS  = ["#34d399","#22d3ee","#a78bfa","#fbbf24","#fb7185","#fb923c","#38bdf8","#f472b6"]

const filterLabels = {
  all: "Todos",
  active: "Ativos",
  completed: "Quitados",
  cancelled: "Cancelados",
} as const

// ── Modal: Novo plano (vidro, mobile-safe) ────────────────────────────────────

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
      <div className="pointer-events-none fixed inset-0 z-[61] flex items-end justify-center sm:items-center">
        <div className="glass-card animate-fade-up pointer-events-auto flex max-h-[90svh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-w-sm sm:rounded-2xl">
          <div className="divider-glow shrink-0" />
          <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
            <h2 className="font-display text-sm font-semibold">Novo Parcelamento</h2>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categoria</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Descrição</label>
              <Input placeholder="Ex: Notebook, geladeira..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-10 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nº parcelas</label>
                <Input type="number" min="1" placeholder="12" value={form.total_installments}
                  onChange={e => setForm(f => ({ ...f, total_installments: e.target.value }))} className="font-numeric h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valor parcela</label>
                <Input type="number" min="0" step="0.01" placeholder="R$ 0,00" value={form.installment_value}
                  onChange={e => setForm(f => ({ ...f, installment_value: e.target.value }))} className="font-numeric h-10 text-sm" />
              </div>
            </div>

            {totalValue > 0 && (
              <div className="animate-scale-in flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total da compra</span>
                <span className="font-numeric font-semibold text-primary">{fmtBRL(totalValue)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">1ª parcela</label>
              <Input type="date" value={form.first_due_date}
                onChange={e => setForm(f => ({ ...f, first_due_date: e.target.value }))} className="h-10 text-sm" />
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-border/50 px-5 pb-5 pt-3">
            <Button variant="outline" className="h-10 flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="glow-primary h-10 flex-1" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
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
    <CineCard
      accent={isCompleted ? "#34d399" : color}
      className={cn(
        isCompleted ? "border-emerald-500/30" :
        isCancelled ? "border-muted opacity-60" : ""
      )}
    >
      <div className="space-y-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
              style={{ background: `${color}20`, color, boxShadow: `0 0 12px -4px ${color}` }}>
              {plan.category_acronym.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{plan.description}</p>
              <p className="text-[11px] text-muted-foreground">{plan.category_name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isCompleted && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 glow-primary">Quitado</span>}
            {isCancelled && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Cancelado</span>}
            {isActive && (
              <button onClick={() => { if (confirm(`Cancelar "${plan.description}"?`)) cancelMut.mutate(plan.id) }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-500">
                <Ban size={13} />
              </button>
            )}
            {plan.paid_installments === 0 && (
              <button onClick={() => { if (confirm(`Remover "${plan.description}"?`)) deleteMut.mutate(plan.id) }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Valores */}
        <div className="flex items-end justify-between text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Parcela</p>
            <p className="font-numeric font-semibold" style={{ color }}>{fmtBRL(plan.installment_value)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Restante</p>
            <p className="font-numeric font-semibold">{fmtBRL(plan.remaining_value)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="font-numeric font-medium text-muted-foreground">{fmtBRL(plan.total_value)}</p>
          </div>
        </div>

        {/* Progresso */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">{plan.paid_installments}/{plan.total_installments} pagas</span>
            <span className={cn("font-numeric font-medium", isCompleted ? "text-emerald-500" : "")}>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isCompleted
                  ? "linear-gradient(90deg, #34d39990, #34d399)"
                  : `linear-gradient(90deg, ${color}90, ${color})`,
                boxShadow: `0 0 8px ${isCompleted ? "#34d399" : color}`,
              }} />
          </div>
        </div>

        {plan.next_due_date && isActive && (
          <p className="text-[11px] text-muted-foreground">
            Próximo: <span className="font-medium text-foreground">{fmtDate(plan.next_due_date)}</span>
          </p>
        )}

        {/* Toggle parcelas */}
        <button onClick={() => setExpanded(e => !e)}
          className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted">
          <span>Ver parcelas</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Lista de parcelas */}
        {expanded && (
          <div className="stagger-children space-y-1.5 pt-1">
            {plan.installments.map(inst => {
              const isPaid = inst.status === "paid"
              return (
                <div key={inst.id} className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors",
                  isPaid ? "border-emerald-500/20 bg-emerald-500/5" : "border-transparent bg-muted/30"
                )}>
                  <div className="flex items-center gap-2">
                    {isPaid
                      ? <CheckCircle2 size={12} className="shrink-0 text-emerald-500" />
                      : <Clock size={12} className="shrink-0 text-muted-foreground" />}
                    <span className={cn(isPaid ? "text-muted-foreground line-through" : "")}>
                      {inst.installment_number}ª — {fmtDate(inst.due_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-numeric font-medium">{fmtBRL(inst.value)}</span>
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
    </CineCard>
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
  const allPlans = summary?.plans ?? []
  const plans = filter === "all" ? allPlans : allPlans.filter(p => p.status === filter)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Compras parceladas"
        title="Parcelamentos"
        subtitle={isLoading
          ? "Carregando..."
          : `${summary?.total_plans ?? 0} plano${(summary?.total_plans ?? 0) !== 1 ? "s" : ""} · ${summary?.active_plans ?? 0} ativo${(summary?.active_plans ?? 0) !== 1 ? "s" : ""}`}
        action={
          <Button size="sm" className="glow-primary gap-1.5" onClick={() => setModal(true)}>
            <Plus size={14} /> Novo
          </Button>
        }
      />

      {/* ── Seletor de mês ──────────────────────────────────────────────────── */}
      <div className="glass-card animate-fade-up delay-1 flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 opacity-0">
        <button onClick={prevMonth} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronLeft size={16} />
        </button>
        <span className="font-display text-sm font-semibold">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      {summary && (
        <div className="stagger-children grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { label: "Comprometido/mês", value: summary.total_committed_monthly, accent: "#fb7185" },
            { label: "Total restante",   value: summary.total_remaining_value,   accent: "#a78bfa" },
          ].map(({ label, value, accent }) => (
            <CineCard key={label} accent={accent} className="p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-numeric mt-1 text-sm font-bold sm:text-base" style={{ color: accent }}>
                <CountUp value={Number(value)} format={fmtBRL} />
              </p>
            </CineCard>
          ))}
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(filterLabels) as Array<keyof typeof filterLabels>).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
              filter === f
                ? "glow-primary bg-primary text-primary-foreground"
                : "glass-card text-muted-foreground hover:text-foreground"
            )}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* ── Cards ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-52 rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-card animate-fade-up rounded-xl border border-dashed border-border py-20 text-center">
          <CreditCard size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhum parcelamento encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">Clique em "Novo" para registrar uma compra parcelada</p>
        </div>
      ) : (
        <div className="stagger-children grid gap-4 sm:grid-cols-2">
          {plans.map((p, i) => <PlanCard key={p.id} plan={p} color={COLORS[i % COLORS.length]} />)}
        </div>
      )}

      {modal && <NovoPlanModal onClose={() => setModal(false)} />}
    </div>
  )
}