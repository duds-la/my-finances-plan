import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Search, Plus, X, Loader2 } from "lucide-react"
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

export const Route = createFileRoute("/_layout/transacoes")({
  component: TransacoesPage,
  head: () => ({ meta: [{ title: "Transações — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

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

const tabs = ["Todas", "Entradas", "Saídas", "Investimentos"]
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

  const handleSubmit = () => {
    const value = parseFloat(form.transaction_value.replace(",", "."))
    if (!value || !form.transaction_type_id || !form.transaction_category_id) return
    const finalValue = isNegative() ? -Math.abs(value) : Math.abs(value)
    createMut.mutate(
      {
        transaction_value: finalValue,
        transaction_date: form.transaction_date
          ? new Date(form.transaction_date).toISOString()
          : undefined,
        transaction_type_id: Number(form.transaction_type_id),
        transaction_category_id: Number(form.transaction_category_id),
      },
      { onSuccess: onClose }
    )
  }

  const isValid =
    form.transaction_value.trim() !== "" &&
    form.transaction_type_id !== "" &&
    form.transaction_category_id !== ""

  return (
    <>
      {/* Backdrop — z-[60] fica acima da bottom nav (z-50) */}
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">

          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold">Nova Transação</h2>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body com scroll */}
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

          {/* Footer */}
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

// ── Linha de transação — usa os campos corretos do hook ───────────────────────

function TransactionRow({ tx }: { tx: TransactionEnriched }) {
  // O hook retorna typeName, categoryName, categoryIcon
  const TypeIcon = typeIcons[tx.typeName] ?? ArrowDownRight
  const isPositive = Number(tx.transaction_value) > 0
  const isInvest = tx.typeName === "Investimento"
  const valueClass = isPositive
    ? "text-emerald-500"
    : isInvest
    ? "text-violet-400"
    : "text-rose-400"
  const colorClass = typeColors[tx.typeName] ?? "text-muted-foreground bg-muted"

  // transaction_date vem como ISO completo do backend — sem manipulação extra
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
  const [activeTab, setActiveTab] = useState("Todas")
  const [search, setSearch] = useState("")

  // Hook retorna totalReceitas / totalDespesas (não totalEntradas/totalSaidas)
  const { transactions, isLoading, totalReceitas, totalDespesas } = useTransactions()

  const filtered = transactions.filter(tx => {
    const matchTab = activeTab === "Todas" ? true : tx.typeName === tabTypeMap[activeTab]
    const matchSearch = search
      ? tx.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
        tx.typeName?.toLowerCase().includes(search.toLowerCase())
      : true
    return matchTab && matchSearch
  })

  const balance = totalReceitas + totalDespesas // totalDespesas já é negativo

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
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Nova
        </Button>
      </div>

      {/* KPIs — usa totalReceitas/totalDespesas do hook */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Entradas",  value: fmtBRL(totalReceitas),    color: "text-emerald-500" },
          { label: "Saídas",    value: fmtBRL(Math.abs(totalDespesas)), color: "text-rose-400" },
          { label: "Saldo",     value: fmtBRL(Math.abs(balance)), color: balance >= 0 ? "text-emerald-500" : "text-rose-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn("mt-1 text-sm font-bold sm:text-base", color)}>{value}</p>
          </div>
        ))}
      </div>

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
              activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
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
            Nenhuma transação encontrada
          </div>
        ) : (
          filtered.map(tx => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>

      {modalOpen && <NovaTransacaoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}