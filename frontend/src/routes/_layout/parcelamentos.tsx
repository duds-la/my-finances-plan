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
  id: number
  plan_id: number
  installment_number: number
  due_date: string
  value: number
  status: "pending" | "paid" | "overdue"
  transaction_id: number | null
}

interface InstallmentPlan {
  id: number
  user_id: number
  category_id: number
  category_name: string
  category_acronym: string
  description: string
  total_value: number
  installment_value: number
  total_installments: number
  paid_installments: number
  remaining_installments: number
  remaining_value: number
  progress_percentage: number
  first_due_date: string
  next_due_date: string | null
  status: "active" | "completed" | "cancelled"
  installments: Installment[]
}

interface Summary {
  total_plans: number
  active_plans: number
  total_committed_monthly: number
  total_remaining_value: number
  plans: InstallmentPlan[]
}

interface PlanCreate {
  category_id: number
  description: string
  total_value: number
  installment_value: number
  total_installments: number
  first_due_date: string
}

// ── Query keys ────────────────────────────────────────────────────────────────

const keys = {
  all: ["installments"] as const,
  summary: (m: number, y: number) => ["installments", "summary", m, y] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useSummary(month: number, year: number) {
  return useQuery<Summary>({
    queryKey: keys.summary(month, year),
    queryFn: () =>
      api.get(`${BASE}/installment/summary?month=${month}&year=${year}`).then(r => r.data),
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
    mutationFn: (id: number) =>
      api.patch(`${BASE}/installment/${id}`, { status: "cancelled" }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

function usePayInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, installmentId, txTypeId }: { planId: number; installmentId: number; txTypeId: number }) =>
      api.post(`${BASE}/installment/${planId}/installments/${installmentId}/pay`, {
        transaction_type_id: txTypeId,
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

function useUnpayInstallment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, installmentId }: { planId: number; installmentId: number }) =>
      api.post(`${BASE}/installment/${planId}/installments/${installmentId}/unpay`, {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL  = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const COLORS = ["#4ade80","#22d3ee","#a78bfa","#fbbf24","#f87171","#fb923c","#38bdf8","#f472b6","#34d399","#818cf8"]

// ID do tipo de transação "saída" — ajuste conforme o seed do seu banco
const TX_SAIDA_TYPE_ID = 2

// ── KPI ───────────────────────────────────────────────────────────────────────

function KpiBox({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color: accent }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Modal: Novo Plano ─────────────────────────────────────────────────────────

function NovoPlanModal({ onClose }: { onClose: () => void }) {
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreatePlan()

  const [form, setForm] = useState({
    category_id: "",
    description: "",
    total_installments: "",
    installment_value: "",
    first_due_date: "",
  })

  const totalValue = Number(form.total_installments || 0) * Number(form.installment_value || 0)
  const isValid =
    form.category_id !== "" &&
    form.description.trim() !== "" &&
    Number(form.total_installments) >= 1 &&
    Number(form.installment_value) > 0 &&
    form.first_due_date !== ""

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate(
      {
        category_id: Number(form.category_id),
        description: form.description.trim(),
        total_value: totalValue,
        installment_value: Number(form.installment_value),
        total_installments: Number(form.total_installments),
        first_due_date: form.first_due_date,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Novo Parcelamento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Registre uma compra parcelada</p>
            </div>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.description} ({c.acronym})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descrição</label>
              <Input
                placeholder="Ex: Geladeira Samsung"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="h-10 text-sm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nº parcelas</label>
                <Input
                  type="number" min="1" placeholder="3"
                  value={form.total_installments}
                  onChange={e => setForm(f => ({ ...f, total_installments: e.target.value }))}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor parcela (R$)</label>
                <Input
                  type="number" min="0" step="0.01" placeholder="60,00"
                  value={form.installment_value}
                  onChange={e => setForm(f => ({ ...f, installment_value: e.target.value }))}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {totalValue > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total da compra</span>
                <span className="font-semibold">{fmtBRL(totalValue)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data da 1ª parcela</label>
              <Input
                type="date"
                value={form.first_due_date}
                onChange={e => setForm(f => ({ ...f, first_due_date: e.target.value }))}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 h-10" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Criar parcelamento"}
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
  const deleteMut  = useDeletePlan()
  const cancelMut  = useCancelPlan()
  const payMut     = usePayInstallment()
  const unpayMut   = useUnpayInstallment()

  const isActive    = plan.status === "active"
  const isCompleted = plan.status === "completed"
  const isCancelled = plan.status === "cancelled"
  const pct         = Math.min(plan.progress_percentage, 100)
  const isBusy      = payMut.isPending || unpayMut.isPending

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
      isCompleted ? "border-emerald-500/30" :
      isCancelled ? "border-muted opacity-60" :
      "border-border hover:border-primary/30"
    )}>
      {/* Barra de cor */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ background: color }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
              style={{ background: `${color}20`, color }}
            >
              {plan.category_acronym.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{plan.description}</p>
              <p className="text-[11px] text-muted-foreground">{plan.category_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isCompleted && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-500">Quitado</span>
            )}
            {isCancelled && (
              <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-muted text-muted-foreground">Cancelado</span>
            )}
            {isActive && (
              <button
                onClick={() => { if (confirm(`Cancelar "${plan.description}"?`)) cancelMut.mutate(plan.id) }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                title="Cancelar plano"
              >
                <Ban size={13} />
              </button>
            )}
            {plan.paid_installments === 0 && (
              <button
                onClick={() => { if (confirm(`Remover "${plan.description}"?`)) deleteMut.mutate(plan.id) }}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Remover plano"
              >
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
            <div
              className={cn("h-full rounded-full transition-all", isCompleted ? "bg-emerald-500" : "")}
              style={{ width: `${pct}%`, backgroundColor: isCompleted ? undefined : color }}
            />
          </div>
        </div>

        {plan.next_due_date && isActive && (
          <p className="text-[11px] text-muted-foreground">
            Próximo vencimento: <span className="font-medium text-foreground">{fmtDate(plan.next_due_date)}</span>
          </p>
        )}

        {/* Toggle parcelas */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <span>Ver parcelas</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Lista de parcelas */}
        {expanded && (
          <div className="space-y-1.5 pt-1">
            {plan.installments.map(inst => {
              const isPaid = inst.status === "paid"
              return (
                <div
                  key={inst.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs border transition-colors",
                    isPaid
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isPaid
                      ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      : <Clock size={13} className="text-muted-foreground shrink-0" />
                    }
                    <span className="font-medium">
                      {inst.installment_number}ª — {fmtDate(inst.due_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-semibold", isPaid ? "text-emerald-500" : "")}>
                      {fmtBRL(inst.value)}
                    </span>
                    {isActive && (
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          isPaid
                            ? unpayMut.mutate({ planId: plan.id, installmentId: inst.id })
                            : payMut.mutate({ planId: plan.id, installmentId: inst.id, txTypeId: TX_SAIDA_TYPE_ID })
                        }
                        className={cn(
                          "rounded-md px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50",
                          isPaid
                            ? "bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                            : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
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
  const now   = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "cancelled">("all")

  const { data: summary, isLoading } = useSummary(month, year)

  const plans = (summary?.plans ?? []).filter(p =>
    filter === "all" ? true : p.status === filter
  )

  const filterLabels = { all: "Todos", active: "Ativos", completed: "Quitados", cancelled: "Cancelados" }

  return (
    <div className="space-y-5 p-4 pb-20 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Parcelamentos</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Compras a prazo — controle de parcelas e compromissos futuros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setModal(true)}>
            <Plus size={13} />
            Novo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiBox label="Planos Ativos" value={String(summary?.active_plans ?? 0)} accent="#a78bfa" sub="compras em andamento" />
        <KpiBox label={`Parcelas em ${MONTHS[month - 1]}`} value={fmtBRL(summary?.total_committed_monthly ?? 0)} accent="#f87171" sub="compromisso do mês" />
        <KpiBox label="Total Restante" value={fmtBRL(summary?.total_remaining_value ?? 0)} accent="#fbbf24" sub="soma de todas as dívidas" />
        <KpiBox label="Total de Planos" value={String(summary?.total_plans ?? 0)} accent="#22d3ee" sub="incluindo concluídos" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "completed", "cancelled"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <CreditCard size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhum parcelamento encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">Clique em "Novo" para registrar uma compra parcelada</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p, i) => (
            <PlanCard key={p.id} plan={p} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      )}

      {modal && <NovoPlanModal onClose={() => setModal(false)} />}
    </div>
  )
}
