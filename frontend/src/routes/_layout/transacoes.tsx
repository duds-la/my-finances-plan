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
    transaction_date: new Date().toISOString().slice(0, 16),
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <h2 className="text-base font-semibold">Nova Transação</h2>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 p-5">
            {/* Valor */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Valor (R$)
              </label>
              <Input
                placeholder="0,00"
                value={form.transaction_value}
                onChange={(e) => setForm((f) => ({ ...f, transaction_value: e.target.value }))}
                className="h-10 text-sm"
                type="number"
                step="0.01"
                min="0"
                autoFocus
              />
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data
              </label>
              <Input
                type="datetime-local"
                value={form.transaction_date}
                onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))}
                className="h-10 text-sm"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo
              </label>
              <select
                value={form.transaction_type_id}
                onChange={(e) => setForm((f) => ({ ...f, transaction_type_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um tipo...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Categoria
              </label>
              <select
                value={form.transaction_category_id}
                onChange={(e) => setForm((f) => ({ ...f, transaction_category_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione uma categoria...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.description} ({c.acronym})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 pb-5">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 h-10"
              onClick={handleSubmit}
              disabled={!isValid || createMut.isPending}
            >
              {createMut.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
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

  return (
    <div className="transition-colors hover:bg-muted/30">
      {/* Mobile */}
      <div className="flex items-center gap-3 px-4 py-3 sm:hidden">
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-base shrink-0">
          {tx.categoryIcon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{tx.categoryName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(tx.transaction_date).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}{" "}
            · {tx.typeName}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-sm font-semibold", valueClass)}>
            {isPositive ? "+" : ""}
            {fmtBRL(Number(tx.transaction_value))}
          </p>
          <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", colorClass)}>
            {tx.typeName}
          </span>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-4 px-4 py-3 text-sm">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-base">
          {tx.categoryIcon}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{tx.categoryName}</p>
        </div>
        <span className="text-xs text-muted-foreground">{tx.typeName}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(tx.transaction_date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", colorClass)}>
          <TypeIcon size={11} /> {tx.typeName}
        </span>
        <span className={cn("text-right font-semibold", valueClass)}>
          {isPositive ? "+" : ""}
          {fmtBRL(Number(tx.transaction_value))}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TransacoesPage() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Todas")
  const [modalOpen, setModalOpen] = useState(false)

  const { transactions, totalReceitas, totalDespesas, saldo, isLoading } = useTransactions()

  const filtered = transactions.filter((t) => {
    const matchSearch =
      t.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      t.typeName.toLowerCase().includes(search.toLowerCase())
    const matchTab =
      activeTab === "Todas" || t.typeName === tabTypeMap[activeTab]
    return matchSearch && matchTab
  })

  return (
    <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Transações</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isLoading ? "Carregando..." : `${filtered.length} lançamentos`}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          <span className="hidden sm:inline">Nova</span> Transação
        </Button>
      </div>

      {/* KPIs */}
      <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3">
        {[
          { label: "Entradas", value: fmtBRL(totalReceitas), color: "#4ade80" },
          { label: "Saídas", value: fmtBRL(Math.abs(totalDespesas)), color: "#f87171" },
          { label: "Saldo", value: fmtBRL(saldo), color: saldo >= 0 ? "#22d3ee" : "#f87171" },
        ].map((k) => (
          <div
            key={k.label}
            className="min-w-[140px] shrink-0 rounded-xl border border-border bg-card p-3 sm:min-w-0 sm:p-4"
          >
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-base font-semibold sm:text-xl" style={{ color: k.color }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeTab === tab
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
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

      {/* Lista */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-4 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span />
          <span>Categoria</span>
          <span className="text-right">Tipo</span>
          <span className="text-right">Data</span>
          <span className="text-right">Classificação</span>
          <span className="text-right">Valor</span>
        </div>

        <div className="divide-y divide-border">
          {isLoading && (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Carregando transações...
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma transação encontrada.
            </div>
          )}
          {!isLoading &&
            filtered.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && <NovaTransacaoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}