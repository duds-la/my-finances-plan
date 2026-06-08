// frontend/src/routes/_layout/orcamento.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Plus, X, Loader2, Wallet, Trash2, Copy, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react"
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
  id: number; user_id: number; category_id: number; month: number; year: number
  limit_value: number; current_spent: number; consumed_percentage: number
  committed_value: number; effective_remaining: number
}
interface BudgetCreate { category_id: number; month: number; year: number; limit_value: number }
interface BudgetEnriched extends Budget {
  categoryName: string; categoryAcronym: string
  spentPct: number; committedPct: number; isOver: boolean
}
interface CopyResult { created: number; skipped: number; overwritten: number }

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171", "#fb923c", "#38bdf8", "#e879f9"]

// ── Query keys ────────────────────────────────────────────────────────────────

const budgetKeys = {
  all: ["budgets"] as const,
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

function useCopyBudgets() {
  const qc = useQueryClient()
  return useMutation<CopyResult, Error, {
    from_month: number; from_year: number
    to_month: number; to_year: number
    overwrite: boolean
  }>({
    mutationFn: (data) => api.post(`${BASE}/budget/copy`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all }),
  })
}

// ── Modal: Nova categoria de orçamento ────────────────────────────────────────

function NovaCategoriaModal({
  month, year, onClose,
}: { month: number; year: number; onClose: () => void }) {
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreateBudget()

  const [form, setForm] = useState({ category_id: "", limit_value: "" })
  const isValid = !!form.category_id && !!form.limit_value && Number(form.limit_value) > 0

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate(
      { category_id: Number(form.category_id), month, year, limit_value: Number(form.limit_value) },
      { onSuccess: onClose },
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border bg-card max-h-[90svh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Nova Categoria de Orçamento</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Limite (R$)</label>
            <Input
              type="number" step="0.01" placeholder="0,00"
              value={form.limit_value}
              onChange={e => setForm(f => ({ ...f, limit_value: e.target.value }))}
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-10" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Modal: Copiar orçamento ───────────────────────────────────────────────────

function CopiarOrcamentoModal({
  toMonth, toYear, onClose,
}: { toMonth: number; toYear: number; onClose: () => void }) {
  const copyMut = useCopyBudgets()

  // Começa sugerindo o mês anterior ao destino
  const prevMonth = toMonth === 1 ? 12 : toMonth - 1
  const prevYear  = toMonth === 1 ? toYear - 1 : toYear

  const [fromMonth, setFromMonth] = useState(prevMonth)
  const [fromYear,  setFromYear]  = useState(prevYear)
  const [overwrite, setOverwrite] = useState(false)
  const [result, setResult] = useState<CopyResult | null>(null)
  const [error, setError]   = useState<string | null>(null)

  // Preview: busca quantos orçamentos existem na origem
  const { data: sourceBudgets = [] } = useBudgets(fromMonth, fromYear)

  const navigateFrom = (dir: -1 | 1) => {
    let m = fromMonth + dir
    let y = fromYear
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    // Não deixa ir além do mês anterior ao destino
    if (y > toYear || (y === toYear && m >= toMonth)) return
    setFromMonth(m)
    setFromYear(y)
    setResult(null)
    setError(null)
  }

  const isSameMonthAsTo = fromMonth === toMonth && fromYear === toYear
  const canNavigateNext = !(
    (fromMonth === prevMonth && fromYear === prevYear)
  )

  const handleCopy = () => {
    setError(null)
    copyMut.mutate(
      { from_month: fromMonth, from_year: fromYear, to_month: toMonth, to_year: toYear, overwrite },
      {
        onSuccess: (data) => setResult(data),
        onError: (err: any) => {
          const msg = err?.response?.data?.detail ?? "Erro ao copiar orçamento."
          setError(msg)
        },
      }
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border bg-card max-h-[90svh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Copiar Orçamento</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Fluxo: origem → destino */}
          <div className="flex items-center gap-3">
            {/* Origem */}
            <div className="flex-1 rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center">Copiar de</p>
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => navigateFrom(-1)}
                  className="rounded-lg p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="text-center flex-1">
                  <p className="text-sm font-semibold">{MONTH_NAMES[fromMonth - 1]}</p>
                  <p className="text-xs text-muted-foreground">{fromYear}</p>
                </div>
                <button
                  onClick={() => navigateFrom(1)}
                  disabled={fromMonth === prevMonth && fromYear === prevYear}
                  className={cn(
                    "rounded-lg p-1 transition-colors",
                    (fromMonth === prevMonth && fromYear === prevYear)
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {sourceBudgets.length > 0
                  ? <span className="text-foreground font-medium">{sourceBudgets.length} categoria{sourceBudgets.length > 1 ? "s" : ""}</span>
                  : "Nenhum orçamento"}
              </p>
            </div>

            {/* Seta */}
            <div className="shrink-0 text-muted-foreground">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Destino */}
            <div className="flex-1 rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center">Para</p>
              <div className="text-center py-1">
                <p className="text-sm font-semibold">{MONTH_NAMES[toMonth - 1]}</p>
                <p className="text-xs text-muted-foreground">{toYear}</p>
              </div>
              <p className="text-center text-[10px] text-primary/70">mês atual</p>
            </div>
          </div>

          {/* Preview das categorias da origem */}
          {sourceBudgets.length > 0 && !result && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Categorias que serão copiadas:</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {sourceBudgets.map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-xs text-foreground">{b.category_id}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground">{fmtBRL(Number(b.limit_value))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opção de sobrescrever */}
          {!result && (
            <button
              onClick={() => setOverwrite(v => !v)}
              className="flex items-center gap-3 w-full rounded-xl border border-border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40"
            >
              <div className={cn(
                "size-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                overwrite ? "border-primary bg-primary" : "border-muted-foreground/40"
              )}>
                {overwrite && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <div>
                <p className="text-xs font-medium">Sobrescrever categorias existentes</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Atualiza o limite de categorias que já existem no mês destino
                </p>
              </div>
            </button>
          )}

          {/* Resultado da cópia */}
          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <p className="text-sm font-semibold">Orçamento copiado!</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Criados",      value: result.created,     color: "text-emerald-400" },
                  { label: "Pulados",      value: result.skipped,     color: "text-muted-foreground" },
                  { label: "Atualizados",  value: result.overwritten, color: "text-amber-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-card border border-border py-2">
                    <p className={cn("text-lg font-bold", color)}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button
              className="flex-1 h-10 gap-1.5"
              onClick={handleCopy}
              disabled={sourceBudgets.length === 0 || copyMut.isPending || isSameMonthAsTo}
            >
              {copyMut.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Copy size={14} />}
              Copiar
            </Button>
          )}
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
  const [modal, setModal]       = useState(false)
  const [copyModal, setCopyModal] = useState(false)

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
  const totalPct       = totalLimite > 0
    ? ((totalGasto + totalCommitted) / totalLimite) * 100
    : 0

  const pieData = enriched.map((b, i) => ({
    name: b.categoryName,
    value: Number(b.limit_value),
    color: COLORS[i % COLORS.length],
  }))

  const navigateMonth = (dir: -1 | 1) => {
    let m = month + dir
    let y = year
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    setMonth(m); setYear(y)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Orçamento</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando..." : `${enriched.length} categoria${enriched.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline"
            className="gap-1.5"
            onClick={() => setCopyModal(true)}
          >
            <Copy size={14} />
            <span className="hidden sm:inline">Copiar de...</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setModal(true)}>
            <Plus size={14} /> Nova
          </Button>
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
        <button onClick={() => navigateMonth(-1)}
          className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </p>
        <button onClick={() => navigateMonth(1)}
          className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Limite total",  value: fmtBRL(totalLimite), color: "text-foreground" },
          { label: "Gasto",         value: fmtBRL(totalGasto),  color: totalGasto > totalLimite ? "text-rose-500" : "text-rose-400" },
          { label: "Consumido",     value: `${totalPct.toFixed(0)}%`, color: totalPct >= 100 ? "text-rose-500" : totalPct >= 80 ? "text-amber-500" : "text-emerald-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn("mt-1 text-sm font-bold sm:text-base", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico pizza */}
      {enriched.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Distribuição do limite</p>
          <div className="flex gap-4 items-center">
            <div className="w-28 h-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={52} strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmtBRL(Number(v ?? 0))}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {pieData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <div className="size-2 rounded-full shrink-0" style={{ background: entry.color }} />
                  <span className="text-xs text-muted-foreground truncate flex-1">{entry.name}</span>
                  <span className="text-xs font-medium shrink-0">{fmtBRL(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de categorias */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : enriched.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <Wallet size={28} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma categoria definida</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Adicione categorias ou copie o orçamento de um mês anterior
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyModal(true)}>
              <Copy size={13} /> Copiar de...
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setModal(true)}>
              <Plus size={13} /> Nova categoria
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {enriched.map((b, i) => (
            <BudgetCard key={b.id} budget={b} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      )}

      {modal     && <NovaCategoriaModal month={month} year={year} onClose={() => setModal(false)} />}
      {copyModal && <CopiarOrcamentoModal toMonth={month} toYear={year} onClose={() => setCopyModal(false)} />}
    </div>
  )
}