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
import { CineCard } from "@/components/Common/CineCard"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

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
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#fbbf24", "#fb7185", "#fb923c", "#38bdf8", "#e879f9"]

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

// ── Bottom sheet em vidro ─────────────────────────────────────────────────────

function GlassSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-card animate-fade-up fixed inset-x-0 bottom-0 z-[61] flex max-h-[90svh] flex-col rounded-t-2xl border-t">
        <div className="divider-glow shrink-0" />
        {children}
      </div>
    </>
  )
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
    <GlassSheet onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
        <h2 className="font-display text-sm font-semibold">Nova Categoria de Orçamento</h2>
        <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-muted">
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
            <option value="">Selecione uma categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Limite (R$)</label>
          <Input
            type="number" step="0.01" placeholder="0,00"
            value={form.limit_value}
            onChange={e => setForm(f => ({ ...f, limit_value: e.target.value }))}
            className="font-numeric h-10 text-sm"
          />
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border/50 px-5 pb-5 pt-3">
        <Button variant="outline" className="h-10 flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="glow-primary h-10 flex-1" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
          {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </GlassSheet>
  )
}

// ── Modal: Copiar orçamento ───────────────────────────────────────────────────

function CopiarOrcamentoModal({
  toMonth, toYear, onClose,
}: { toMonth: number; toYear: number; onClose: () => void }) {
  const copyMut = useCopyBudgets()
  const { data: categorias = [] } = useTransactionCategories()
  const catMap = Object.fromEntries(categorias.map(c => [c.id, c]))

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
    <GlassSheet onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
        <h2 className="font-display text-sm font-semibold">Copiar Orçamento</h2>
        <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-muted">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">

        {/* Fluxo: origem → destino */}
        <div className="flex items-center gap-3">
          {/* Origem */}
          <div className="flex-1 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Copiar de</p>
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => navigateFrom(-1)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="flex-1 text-center">
                <p className="font-display text-sm font-semibold">{MONTH_NAMES[fromMonth - 1]}</p>
                <p className="text-xs text-muted-foreground">{fromYear}</p>
              </div>
              <button
                onClick={() => navigateFrom(1)}
                disabled={fromMonth === prevMonth && fromYear === prevYear}
                className={cn(
                  "rounded-lg p-1 transition-colors",
                  (fromMonth === prevMonth && fromYear === prevYear)
                    ? "cursor-not-allowed text-muted-foreground/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {sourceBudgets.length > 0
                ? <span className="font-medium text-foreground">{sourceBudgets.length} categoria{sourceBudgets.length > 1 ? "s" : ""}</span>
                : "Nenhum orçamento"}
            </p>
          </div>

          {/* Seta */}
          <div className="shrink-0 text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Destino */}
          <div className="glow-primary flex-1 space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Para</p>
            <div className="py-1 text-center">
              <p className="font-display text-sm font-semibold">{MONTH_NAMES[toMonth - 1]}</p>
              <p className="text-xs text-muted-foreground">{toYear}</p>
            </div>
            <p className="text-center text-[10px] text-primary/70">mês atual</p>
          </div>
        </div>

        {/* Preview das categorias da origem */}
        {sourceBudgets.length > 0 && !result && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">Categorias que serão copiadas:</p>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {sourceBudgets.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 5px ${COLORS[i % COLORS.length]}` }}
                    />
                    <span className="text-xs text-foreground">
                      {catMap[b.category_id]?.description ?? `Categoria ${b.category_id}`}
                    </span>
                  </div>
                  <span className="font-numeric text-xs font-medium text-foreground">{fmtBRL(Number(b.limit_value))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opção de sobrescrever */}
        {!result && (
          <button
            onClick={() => setOverwrite(v => !v)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40"
          >
            <div className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
              overwrite ? "border-primary bg-primary" : "border-muted-foreground/40"
            )}>
              {overwrite && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div>
              <p className="text-xs font-medium">Sobrescrever categorias existentes</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Atualiza o limite de categorias que já existem no mês destino
              </p>
            </div>
          </button>
        )}

        {/* Resultado da cópia */}
        {result && (
          <div className="animate-scale-in space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
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
                <div key={label} className="rounded-lg border border-border bg-card py-2">
                  <p className={cn("font-numeric text-lg font-bold", color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border/50 px-5 pb-5 pt-3">
        <Button variant="outline" className="h-10 flex-1" onClick={onClose}>
          {result ? "Fechar" : "Cancelar"}
        </Button>
        {!result && (
          <Button
            className="glow-primary h-10 flex-1 gap-1.5"
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
    </GlassSheet>
  )
}

// ── Card de orçamento ─────────────────────────────────────────────────────────

function BudgetCard({ budget, color }: { budget: BudgetEnriched; color: string }) {
  const deleteMut    = useDeleteBudget()
  const spentPct     = Math.min(budget.spentPct, 100)
  const committedPct = Math.min(budget.committedPct, Math.max(0, 100 - spentPct))
  const isOver       = budget.isOver

  return (
    <CineCard
      accent={isOver ? "#fb7185" : color}
      className={cn("space-y-3 p-4", isOver && "border-rose-500/30")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            style={{ background: `${color}20`, color, boxShadow: `0 0 12px -4px ${color}` }}>
            {budget.categoryAcronym}
          </div>
          <p className="truncate text-sm font-medium">{budget.categoryName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("font-numeric text-sm font-semibold", isOver ? "text-rose-500" : "text-foreground")}>
            {fmtBRL(Number(budget.current_spent))} / {fmtBRL(Number(budget.limit_value))}
          </span>
          <button onClick={() => deleteMut.mutate(budget.id)}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Barra dupla */}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="flex h-full">
          <div className="h-full rounded-l-full transition-all duration-700"
            style={{
              width: `${spentPct}%`,
              background: isOver ? "#fb7185" : `linear-gradient(90deg, ${color}90, ${color})`,
              boxShadow: `0 0 8px ${isOver ? "#fb7185" : color}`,
            }} />
          {committedPct > 0 && (
            <div className="h-full transition-all duration-700"
              style={{
                width: `${committedPct}%`,
                backgroundColor: isOver ? "#fda4af" : `${color}70`,
                backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)`,
              }} />
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Gasto: <span className="font-numeric">{fmtBRL(Number(budget.current_spent))}</span></span>
          <span className={cn("font-numeric font-medium", isOver ? "text-rose-500" : budget.spentPct >= 80 ? "text-amber-500" : "text-emerald-500")}>
            {budget.spentPct.toFixed(0)}%
          </span>
        </div>
        {budget.committed_value > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-amber-500/80">Parcelas: <span className="font-numeric">{fmtBRL(budget.committed_value)}</span></span>
            <span className="font-numeric font-medium text-amber-500">{budget.committedPct.toFixed(0)}%</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Livre real: <span className={cn("font-numeric font-medium", isOver ? "text-rose-500" : "text-foreground")}>
            {fmtBRL(Math.max(0, budget.effective_remaining))}
          </span>
        </p>
      </div>
    </CineCard>
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
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Limites por categoria"
        title="Orçamento"
        subtitle={isLoading ? "Carregando..." : `${enriched.length} categoria${enriched.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyModal(true)}>
              <Copy size={14} />
              <span className="hidden sm:inline">Copiar de...</span>
            </Button>
            <Button size="sm" className="glow-primary gap-1.5" onClick={() => setModal(true)}>
              <Plus size={14} /> Nova
            </Button>
          </div>
        }
      />

      {/* ── Navegação de mês ────────────────────────────────────────────────── */}
      <div className="glass-card animate-fade-up delay-1 flex items-center justify-between rounded-xl px-4 py-2.5 opacity-0">
        <button onClick={() => navigateMonth(-1)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronLeft size={16} />
        </button>
        <p className="font-display text-sm font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </p>
        <button onClick={() => navigateMonth(1)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="stagger-children grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Limite total", value: totalLimite, fmt: fmtBRL, accent: "#a78bfa",
            cls: "text-foreground" },
          { label: "Gasto", value: totalGasto, fmt: fmtBRL, accent: "#fb7185",
            cls: totalGasto > totalLimite ? "text-rose-500" : "text-rose-400" },
          { label: "Consumido", value: totalPct, fmt: (v: number) => `${v.toFixed(0)}%`, accent: "#fbbf24",
            cls: totalPct >= 100 ? "text-rose-500" : totalPct >= 80 ? "text-amber-500" : "text-emerald-500" },
        ].map(({ label, value, fmt, accent, cls }) => (
          <CineCard key={label} accent={accent} className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={cn("font-numeric mt-1 text-sm font-bold sm:text-base", cls)}>
              {isLoading ? "—" : <CountUp value={value} format={fmt} />}
            </p>
          </CineCard>
        ))}
      </div>

      {/* ── Gráfico pizza ───────────────────────────────────────────────────── */}
      {enriched.length > 0 && (
        <CineCard accent="#22d3ee" className="animate-fade-up delay-2 p-4 opacity-0">
          <p className="font-display mb-3 text-sm font-semibold">Distribuição do limite</p>
          <div className="flex items-center gap-4">
            <div className="h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={52} strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmtBRL(Number(v ?? 0))}
                    contentStyle={{
                      background: "var(--popover)", border: "1px solid var(--border)",
                      borderRadius: 12, fontSize: 12, color: "var(--popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {pieData.map((entry, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2">
                  <div className="size-2 shrink-0 rounded-full"
                    style={{ background: entry.color, boxShadow: `0 0 5px ${entry.color}` }} />
                  <span className="flex-1 truncate text-xs text-muted-foreground">{entry.name}</span>
                  <span className="font-numeric shrink-0 text-xs font-medium">{fmtBRL(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </CineCard>
      )}

      {/* ── Lista de categorias ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : enriched.length === 0 ? (
        <div className="glass-card animate-fade-up space-y-3 rounded-xl border border-dashed border-border p-10 text-center">
          <Wallet size={28} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma categoria definida</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Adicione categorias ou copie o orçamento de um mês anterior
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyModal(true)}>
              <Copy size={13} /> Copiar de...
            </Button>
            <Button size="sm" className="glow-primary gap-1.5" onClick={() => setModal(true)}>
              <Plus size={13} /> Nova categoria
            </Button>
          </div>
        </div>
      ) : (
        <div className="stagger-children grid gap-3 sm:grid-cols-2">
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