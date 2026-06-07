// frontend/src/routes/_layout/transacoes.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Search, Plus, X, Loader2, ChevronLeft, ChevronRight, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  useTransactions,
  useCreateTransaction,
  type TransactionEnriched,
} from "@/hooks/api/useTransactions"
import {
  useTransactionTypes,
  useTransactionCategories,
} from "@/hooks/api/useCategorias"
import { SpendingHeatmap } from "@/components/SpendingHeatmap"

export const Route = createFileRoute("/_layout/transacoes")({
  component: TransacoesPage,
  head: () => ({ meta: [{ title: "Transações — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const typeColors: Record<string, string> = {
  Entrada: "text-emerald-500 bg-emerald-500/10",
  Saída: "text-rose-400 bg-rose-400/10",
  Investimento: "text-violet-400 bg-violet-400/10",
}

const typeIcons: Record<string, React.ElementType> = {
  Entrada: ArrowUpRight,
  Saída: ArrowDownRight,
  Investimento: TrendingUp,
}

// "Mês atual" é a primeira aba e o padrão ao abrir a página
const tabs = ["Mês atual", "Todas", "Entradas", "Saídas", "Investimentos"]
const tabTypeMap: Record<string, string> = {
  Entradas: "Entrada",
  Saídas: "Saída",
  Investimentos: "Investimento",
}

// ── Modal de nova transação ───────────────────────────────────────────────────

function NovaTransacaoModal({ onClose }: { onClose: () => void }) {
  const { data: tipos = [] } = useTransactionTypes()
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreateTransaction()

  const [form, setForm] = useState({
    transaction_value: "",
    transaction_date: new Date().toISOString().slice(0, 10),
    transaction_type_id: "",
    transaction_category_id: "",
  })

  const isNegative = () => {
    const tipo = tipos.find((t) => t.id === Number(form.transaction_type_id))
    if (!tipo) return false
    const desc = tipo.description.toLowerCase()
    return desc.includes("saída") || desc.includes("saida") || desc.includes("despesa")
  }

  const isValid =
    !!form.transaction_value &&
    !!form.transaction_type_id &&
    !!form.transaction_category_id

  const handleSubmit = () => {
    const value = parseFloat(form.transaction_value.replace(",", "."))
    if (!value || !form.transaction_type_id || !form.transaction_category_id) return
    const finalValue = isNegative() ? -Math.abs(value) : Math.abs(value)
    createMut.mutate(
      {
        transaction_value: finalValue,
        transaction_date: form.transaction_date
          ? `${form.transaction_date}T00:00:00`
          : undefined,
        transaction_type_id: Number(form.transaction_type_id),
        transaction_category_id: Number(form.transaction_category_id),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border bg-card max-h-[90svh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Nova Transação</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor (R$)</label>
            <Input
              type="number" step="0.01" placeholder="0,00"
              value={form.transaction_value}
              onChange={(e) => setForm(f => ({ ...f, transaction_value: e.target.value }))}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data</label>
            <Input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm(f => ({ ...f, transaction_date: e.target.value }))}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
            <select
              value={form.transaction_type_id}
              onChange={(e) => setForm(f => ({ ...f, transaction_type_id: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione um tipo</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
            <select
              value={form.transaction_category_id}
              onChange={(e) => setForm(f => ({ ...f, transaction_category_id: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
            </select>
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

// ── Linha de transação ────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: TransactionEnriched }) {
  const TypeIcon = typeIcons[tx.typeName] ?? ArrowDownRight
  const isPositive = Number(tx.transaction_value) > 0
  const isInvest = tx.typeName === "Investimento"
  const valueClass = isPositive
    ? "text-emerald-500"
    : isInvest
    ? "text-violet-400"
    : "text-rose-400"
  const colorClass = typeColors[tx.typeName] ?? "text-muted-foreground bg-muted"

  const dateStr = new Date(tx.transaction_date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-base shrink-0">
        {tx.categoryIcon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{tx.categoryName}</p>
        <p className="text-xs text-muted-foreground">
          {dateStr} · {tx.typeName}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-semibold", valueClass)}>
          {isPositive ? "+" : ""}{fmtBRL(Number(tx.transaction_value))}
        </p>
        <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", colorClass)}>
          <TypeIcon className="inline-block mr-0.5" size={9} />{tx.typeName}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TransacoesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("Mês atual")  // padrão ao abrir
  const [search, setSearch] = useState("")
  const [showHeatmap, setShowHeatmap] = useState(false)

  const now = new Date()
  const [heatmapMonth, setHeatmapMonth] = useState(now.getMonth())
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear())

  const { transactions, isLoading, totalReceitas, totalDespesas } = useTransactions()

  // Navegação do heatmap
  const prevHeatmapMonth = () => {
    if (heatmapMonth === 0) { setHeatmapMonth(11); setHeatmapYear(y => y - 1) }
    else setHeatmapMonth(m => m - 1)
  }
  const nextHeatmapMonth = () => {
    const isCurrent = heatmapMonth === now.getMonth() && heatmapYear === now.getFullYear()
    if (isCurrent) return
    if (heatmapMonth === 11) { setHeatmapMonth(0); setHeatmapYear(y => y + 1) }
    else setHeatmapMonth(m => m + 1)
  }
  const isHeatmapCurrentMonth = heatmapMonth === now.getMonth() && heatmapYear === now.getFullYear()

  const isMesAtual = activeTab === "Mês atual"
  const currentMonth = now.getMonth()
  const currentYear  = now.getFullYear()

  const filtered = transactions.filter(tx => {
    // Aba "Mês atual": filtra pelo mês corrente
    if (isMesAtual) {
      const d = new Date(tx.transaction_date)
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false
    }
    // Abas de tipo (Entradas, Saídas, Investimentos)
    const matchTab = (isMesAtual || activeTab === "Todas")
      ? true
      : tx.typeName === tabTypeMap[activeTab]
    // Busca
    const matchSearch = search
      ? tx.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
        tx.typeName?.toLowerCase().includes(search.toLowerCase())
      : true
    return matchTab && matchSearch
  })

  // KPIs calculados sobre as transações visíveis para refletir o filtro de mês
  const kpiReceitas = filtered
    .filter(t => Number(t.transaction_value) > 0)
    .reduce((s, t) => s + Number(t.transaction_value), 0)
  const kpiDespesas = filtered
    .filter(t => Number(t.transaction_value) < 0)
    .reduce((s, t) => s + Number(t.transaction_value), 0)
  const balance = kpiReceitas + kpiDespesas

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Transações</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando..." : `${filtered.length} registro${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={showHeatmap ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => setShowHeatmap(v => !v)}
          >
            <Flame size={14} />
            <span className="hidden sm:inline">Heatmap</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Nova
          </Button>
        </div>
      </div>

      {/* KPIs — refletem o filtro ativo */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Entradas", value: fmtBRL(kpiReceitas),         color: "text-emerald-500" },
          { label: "Saídas",   value: fmtBRL(Math.abs(kpiDespesas)), color: "text-rose-400" },
          { label: "Saldo",    value: fmtBRL(Math.abs(balance)),    color: balance >= 0 ? "text-emerald-500" : "text-rose-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn("mt-1 text-sm font-bold sm:text-base", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Heatmap (expansível) */}
      {showHeatmap && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={prevHeatmapMonth}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold">
              {MONTH_NAMES[heatmapMonth]} {heatmapYear}
            </p>
            <button
              onClick={nextHeatmapMonth}
              disabled={isHeatmapCurrentMonth}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                isHeatmapCurrentMonth
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <SpendingHeatmap
            transactions={transactions}
            month={heatmapMonth}
            year={heatmapYear}
          />
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por categoria ou tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {isLoading ? (
          <div className="space-y-px p-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {isMesAtual ? "Nenhuma transação este mês" : "Nenhuma transação encontrada"}
          </div>
        ) : (
          filtered.map(tx => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>

      {modalOpen && <NovaTransacaoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}