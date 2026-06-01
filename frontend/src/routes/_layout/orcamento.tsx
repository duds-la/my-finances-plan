import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Plus, X, Loader2, Wallet, Trash2, PieChart as PieChartIcon } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, BASE } from "@/lib/api"
import { useTransactionCategories } from "@/hooks/api/useCategorias"

export const Route = createFileRoute("/_layout/orcamento")({
  component: OrcamentoPage,
  head: () => ({ meta: [{ title: "Orçamento — FinanceOS" }] }),
})

// ── Types ─────────────────────────────────────────────────────────────────────

interface Budget {
  id: number
  user_id: number
  category_id: number
  month: number
  year: number
  limit_value: number
  current_spent: number
  consumed_percentage: number
}

interface BudgetCreate {
  category_id: number
  month: number
  year: number
  limit_value: number
}

interface BudgetEnriched extends Budget {
  categoryName: string
  categoryAcronym: string
  pct: number          // percentual real = current_spent / limit_value
  isOver: boolean
}

// ── Query keys ────────────────────────────────────────────────────────────────

const budgetKeys = {
  all:    ["budgets"] as const,
  filter: (m: number, y: number) => ["budgets", m, y] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useBudgets(month: number, year: number) {
  return useQuery<Budget[]>({
    queryKey: budgetKeys.filter(month, year),
    queryFn: () => api.get(`${BASE}/budget/filter?month=${month}&year=${year}`).then(r => r.data),
  })
}

function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BudgetCreate) => api.post(`${BASE}/budget/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all }),
  })
}

function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/budget/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all }),
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const COLORS = ["#4ade80","#22d3ee","#a78bfa","#fbbf24","#f87171","#fb923c","#38bdf8","#f472b6"]

// ── Modal: Novo Orçamento ─────────────────────────────────────────────────────

function NovoBudgetModal({ month, year, onClose }: { month: number; year: number; onClose: () => void }) {
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreateBudget()
  const [form, setForm] = useState({ category_id: "", limit_value: "" })

  const isValid = form.category_id !== "" && form.limit_value.trim() !== ""

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate({
      category_id: Number(form.category_id),
      month,
      year,
      limit_value: Number(form.limit_value.replace(",", ".")),
    }, { onSuccess: onClose })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Novo Orçamento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {MONTHS[month - 1]} / {year}
              </p>
            </div>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione uma categoria...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.description} ({c.acronym})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Limite Mensal (R$)</label>
              <Input placeholder="0,00" value={form.limit_value} type="number" step="0.01" min="0" autoFocus
                onChange={e => setForm(f => ({ ...f, limit_value: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && isValid && handleSubmit()}
                className="h-10 text-sm" />
            </div>
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 h-10" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Card de orçamento ─────────────────────────────────────────────────────────

function BudgetCard({ budget, color }: { budget: BudgetEnriched; color: string }) {
  const deleteMut = useDeleteBudget()
  const pct       = Math.min(budget.pct, 100)
  const isOver    = budget.isOver

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-3 transition-colors",
      isOver ? "border-rose-500/30" : "border-border hover:border-primary/30"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 items-center justify-center rounded-lg shrink-0 text-xs font-bold text-white"
            style={{ backgroundColor: color }}>
            {budget.categoryAcronym.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{budget.categoryName}</p>
            <p className="text-xs text-muted-foreground">
              Limite: {fmtBRL(Number(budget.limit_value))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isOver && (
            <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-rose-500/10 text-rose-500">
              Estourado
            </span>
          )}
          <button onClick={() => deleteMut.mutate(budget.id)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Gasto: {fmtBRL(Number(budget.current_spent))}</span>
          <span className={cn("font-medium", isOver ? "text-rose-500" : pct >= 80 ? "text-amber-500" : "text-emerald-500")}>
            {budget.pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isOver ? "bg-rose-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Restante: {fmtBRL(Math.max(0, Number(budget.limit_value) - Number(budget.current_spent)))}
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function OrcamentoPage() {
  const now     = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [modal, setModal] = useState(false)

  const { data: budgets = [], isLoading } = useBudgets(month, year)
  const { data: categorias = [] }         = useTransactionCategories()

  const catMap = Object.fromEntries(categorias.map(c => [c.id, c]))

  const enriched: BudgetEnriched[] = budgets.map(b => {
    const cat = catMap[b.category_id]
    const pct = Number(b.limit_value) > 0
      ? (Number(b.current_spent) / Number(b.limit_value)) * 100
      : 0
    return {
      ...b,
      categoryName:    cat?.description ?? "—",
      categoryAcronym: cat?.acronym     ?? "?",
      pct,
      isOver: pct > 100,
    }
  })

  const totalLimite = enriched.reduce((s, b) => s + Number(b.limit_value), 0)
  const totalGasto  = enriched.reduce((s, b) => s + Number(b.current_spent), 0)
  const totalPct    = totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0

  const pieData = enriched.map(b => ({ name: b.categoryName, value: Number(b.limit_value) }))

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <div className="space-y-4 p-4 pb-24 sm:space-y-5 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Orçamento</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Controle de limites por categoria
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModal(true)}>
          <Plus size={14} /> Novo Limite
        </Button>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center gap-2">
        <button onClick={prevMonth}
          className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors text-sm">
          ‹
        </button>
        <div className="flex-1 text-center text-sm font-medium">
          {MONTHS[month - 1]} {year}
        </div>
        <button onClick={nextMonth}
          className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors text-sm">
          ›
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Limite Total",  value: fmtBRL(totalLimite), color: "#4ade80" },
          { label: "Gasto Total",   value: fmtBRL(totalGasto),  color: totalPct > 100 ? "#f87171" : totalPct > 80 ? "#fbbf24" : "#22d3ee" },
          { label: "Utilização",    value: `${totalPct.toFixed(0)}%`, color: totalPct > 100 ? "#f87171" : totalPct > 80 ? "#fbbf24" : "#a78bfa" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-sm font-semibold mt-0.5 sm:text-base" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : enriched.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Wallet size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Nenhum orçamento para {MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Limite" para definir um orçamento</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          {/* Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 content-start">
            {enriched.map((b, i) => (
              <BudgetCard key={b.id} budget={b} color={COLORS[i % COLORS.length]} />
            ))}
          </div>

          {/* Gráfico de pizza */}
          <div className="rounded-xl border border-border bg-card p-4 h-fit">
            <p className="text-sm font-medium mb-3">Distribuição</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {enriched.map((b, i) => (
                <div key={b.id} className="flex items-center gap-2 text-xs">
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground truncate flex-1">{b.categoryName}</span>
                  <span className="font-medium">
                    {totalLimite > 0 ? Math.round((Number(b.limit_value) / totalLimite) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal && <NovoBudgetModal month={month} year={year} onClose={() => setModal(false)} />}
    </div>
  )
}