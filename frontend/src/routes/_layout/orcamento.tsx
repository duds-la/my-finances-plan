// frontend/src/routes/_layout/orcamento.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Plus, X, Loader2, Wallet, Trash2 } from "lucide-react"
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

interface Budget {
  id: number; user_id: number; category_id: number; month: number; year: number
  limit_value: number; current_spent: number; consumed_percentage: number
  committed_value: number; effective_remaining: number
}
interface BudgetCreate { category_id: number; month: number; year: number; limit_value: number }
interface BudgetEnriched extends Budget {
  categoryName: string; categoryAcronym: string
  spentPct: number; committedPct: number; isOver: boolean
}

const budgetKeys = {
  all: ["budgets"] as const,
  filter: (m: number, y: number) => ["budgets", m, y] as const,
}

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

const fmtBRL = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const COLORS = ["#4ade80","#22d3ee","#a78bfa","#fbbf24","#f87171","#fb923c","#38bdf8","#f472b6"]

// ── Modal mobile-safe ─────────────────────────────────────────────────────────

function NovoBudgetModal({ month, year, onClose }: { month: number; year: number; onClose: () => void }) {
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreateBudget()
  const [form, setForm] = useState({ category_id: "", limit_value: "" })
  const isValid = form.category_id !== "" && form.limit_value.trim() !== ""

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate(
      { category_id: Number(form.category_id), month, year, limit_value: Number(form.limit_value.replace(",", ".")) },
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
            <div>
              <h2 className="text-base font-semibold">Novo Orçamento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{MONTHS[month - 1]} / {year}</p>
            </div>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
              <Input placeholder="0,00" value={form.limit_value} type="number" step="0.01" min="0"
                onChange={e => setForm(f => ({ ...f, limit_value: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && isValid && handleSubmit()}
                className="h-10 text-sm" />
            </div>
          </div>
          <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
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
  const deleteMut    = useDeleteBudget()
  const spentPct     = Math.min(budget.spentPct, 100)
  const committedPct = Math.min(budget.committedPct, Math.max(0, 100 - spentPct))
  const isOver       = budget.isOver

  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-3 transition-colors",
      isOver ? "border-rose-500/30" : "border-border")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            style={{ background: `${color}20`, color }}>
            {budget.categoryAcronym}
          </div>
          <p className="text-sm font-medium truncate">{budget.categoryName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-sm font-semibold", isOver ? "text-rose-500" : "text-foreground")}>
            {fmtBRL(Number(budget.current_spent))} / {fmtBRL(Number(budget.limit_value))}
          </span>
          <button onClick={() => deleteMut.mutate(budget.id)}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Barra dupla */}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="flex h-full">
          <div className="h-full rounded-l-full transition-all duration-500"
            style={{ width: `${spentPct}%`, backgroundColor: isOver ? "#f87171" : color }} />
          {committedPct > 0 && (
            <div className="h-full transition-all duration-500"
              style={{
                width: `${committedPct}%`,
                backgroundColor: isOver ? "#fca5a5" : `${color}70`,
                backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)`,
              }} />
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Gasto: {fmtBRL(Number(budget.current_spent))}</span>
          <span className={cn("font-medium", isOver ? "text-rose-500" : budget.spentPct >= 80 ? "text-amber-500" : "text-emerald-500")}>
            {budget.spentPct.toFixed(0)}%
          </span>
        </div>
        {budget.committed_value > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-amber-500/80">Parcelas: {fmtBRL(budget.committed_value)}</span>
            <span className="font-medium text-amber-500">{budget.committedPct.toFixed(0)}%</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Livre real: <span className={cn("font-medium", isOver ? "text-rose-500" : "text-foreground")}>
            {fmtBRL(Math.max(0, budget.effective_remaining))}
          </span>
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function OrcamentoPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [modal, setModal] = useState(false)

  const { data: budgets = [], isLoading } = useBudgets(month, year)
  const { data: categorias = [] }         = useTransactionCategories()
  const catMap = Object.fromEntries(categorias.map(c => [c.id, c]))

  const enriched: BudgetEnriched[] = budgets.map(b => {
    const cat          = catMap[b.category_id]
    const limit        = Number(b.limit_value)
    const spentPct     = limit > 0 ? (Number(b.current_spent)   / limit) * 100 : 0
    const committedPct = limit > 0 ? (Number(b.committed_value) / limit) * 100 : 0
    return {
      ...b,
      categoryName:    cat?.description ?? "—",
      categoryAcronym: cat?.acronym     ?? "?",
      spentPct, committedPct,
      isOver: Number(b.current_spent) + Number(b.committed_value) > limit,
    }
  })

  const totalLimite    = enriched.reduce((s, b) => s + Number(b.limit_value), 0)
  const totalGasto     = enriched.reduce((s, b) => s + Number(b.current_spent), 0)
  const totalCommitted = enriched.reduce((s, b) => s + Number(b.committed_value), 0)
  const totalPct       = totalLimite > 0 ? ((totalGasto + totalCommitted) / totalLimite) * 100 : 0
  const pieData        = enriched.map(b => ({ name: b.categoryName, value: Number(b.current_spent) })).filter(d => d.value > 0)

  // Navegação de mês
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Orçamento</h1>
          <p className="text-xs text-muted-foreground">{enriched.length} categoria{enriched.length !== 1 ? "s" : ""} configurada{enriched.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModal(true)}>
          <Plus size={14} /> Novo
        </Button>
      </div>

      {/* Seletor de mês — scroll horizontal em mobile */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <button onClick={prevMonth} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">‹</button>
        <span className="text-sm font-semibold">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">›</button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <Wallet size={28} className="text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Nenhum orçamento para {MONTHS[month - 1]}.</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModal(true)}>
            <Plus size={14} /> Criar orçamento
          </Button>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Limite",    value: fmtBRL(totalLimite),    color: "text-foreground" },
              { label: "Gasto",     value: fmtBRL(totalGasto),     color: "text-rose-400" },
              { label: "Uso total", value: `${totalPct.toFixed(0)}%`, color: totalPct >= 100 ? "text-rose-500" : totalPct >= 80 ? "text-amber-500" : "text-emerald-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={cn("mt-1 text-sm font-bold", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Gráfico pizza + lista */}
          {pieData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Gastos por Categoria</p>
              <div className="flex items-center gap-4">
                <div className="h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48} strokeWidth={0}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtBRL(Number(v ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-muted-foreground truncate flex-1">{d.name}</span>
                      <span className="text-xs font-medium shrink-0">{fmtBRL(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cards */}
          <div className="space-y-3">
            {enriched.map((b, i) => (
              <BudgetCard key={b.id} budget={b} color={COLORS[i % COLORS.length]} />
            ))}
          </div>
        </>
      )}

      {modal && <NovoBudgetModal month={month} year={year} onClose={() => setModal(false)} />}
    </div>
  )
}