import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/transacoes")({
  component: TransacoesPage,
  head: () => ({ meta: [{ title: "Transações — FinanceOS" }] }),
})

const mockTransacoes = [
  { id: 1, icon: "🏢", name: "Salário", category: "Receita", type: "Entrada", date: "2026-05-01", value: 8500, confirmed: true },
  { id: 2, icon: "🏠", name: "Aluguel", category: "Moradia", type: "Saída", date: "2026-05-05", value: -1400, confirmed: true },
  { id: 3, icon: "🛒", name: "Mercado Extra", category: "Alimentação", type: "Saída", date: "2026-05-10", value: -380, confirmed: true },
  { id: 4, icon: "📈", name: "Tesouro Direto", category: "Investimento", type: "Investimento", date: "2026-05-12", value: -2000, confirmed: true },
  { id: 5, icon: "⛽", name: "Gasolina", category: "Transporte", type: "Saída", date: "2026-05-15", value: -220, confirmed: true },
  { id: 6, icon: "🎭", name: "Cinema", category: "Lazer", type: "Saída", date: "2026-05-18", value: -65, confirmed: false },
  { id: 7, icon: "💡", name: "Conta de Luz", category: "Moradia", type: "Saída", date: "2026-05-20", value: -185, confirmed: true },
  { id: 8, icon: "🍔", name: "Restaurante", category: "Alimentação", type: "Saída", date: "2026-05-22", value: -95, confirmed: true },
  { id: 9, icon: "📱", name: "Plano Celular", category: "Outros", type: "Saída", date: "2026-05-23", value: -55, confirmed: true },
  { id: 10, icon: "💰", name: "Rendimento CDB", category: "Receita", type: "Entrada", date: "2026-05-25", value: 320, confirmed: true },
]

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

function TransacoesPage() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Todas")

  const typeMap: Record<string, string> = {
    "Entradas": "Entrada",
    "Saídas": "Saída",
    "Investimentos": "Investimento",
  }

  const filtered = mockTransacoes.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
    const matchType = activeTab === "Todas" || t.type === typeMap[activeTab]
    return matchSearch && matchType
  })

  const totalEntradas = mockTransacoes.filter(t => t.value > 0).reduce((s, t) => s + t.value, 0)
  const totalSaidas = mockTransacoes.filter(t => t.value < 0).reduce((s, t) => s + t.value, 0)
  const saldo = totalEntradas + totalSaidas

  return (
    <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Transações</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">{filtered.length} lançamentos</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus size={14} />
          <span className="hidden sm:inline">Nova</span> Transação
        </Button>
      </div>

      {/* KPI strip — horizontal scroll no mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3">
        {[
          { label: "Entradas", value: fmtBRL(totalEntradas), color: "#4ade80" },
          { label: "Saídas", value: fmtBRL(Math.abs(totalSaidas)), color: "#f87171" },
          { label: "Saldo", value: fmtBRL(saldo), color: saldo >= 0 ? "#22d3ee" : "#f87171" },
        ].map((k) => (
          <div key={k.label} className="min-w-[140px] shrink-0 rounded-xl border border-border bg-card p-3 sm:min-w-0 sm:p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-base font-semibold sm:text-xl" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs de tipo */}
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
                : "text-muted-foreground hover:text-foreground",
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
          placeholder="Buscar transação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Lista — cards no mobile, tabela no desktop */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header só no desktop */}
        <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-4 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span />
          <span>Descrição</span>
          <span className="text-right">Categoria</span>
          <span className="text-right">Data</span>
          <span className="text-right">Tipo</span>
          <span className="text-right">Valor</span>
        </div>

        <div className="divide-y divide-border">
          {filtered.map((tx) => {
            const TypeIcon = typeIcons[tx.type] ?? ArrowDownRight
            return (
              <div key={tx.id} className="transition-colors hover:bg-muted/30">
                {/* Mobile layout */}
                <div className="flex items-center gap-3 px-4 py-3 sm:hidden">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-base shrink-0">
                    {tx.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {tx.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-semibold",
                      tx.value > 0 ? "text-emerald-500" : tx.type === "Investimento" ? "text-violet-400" : "text-rose-400")}>
                      {tx.value > 0 ? "+" : ""}{fmtBRL(tx.value)}
                    </p>
                    <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", typeColors[tx.type])}>
                      {tx.type}
                    </span>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-4 px-4 py-3 text-sm">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-base">{tx.icon}</div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tx.name}</p>
                    {!tx.confirmed && <span className="text-[10px] text-amber-500">Pendente</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{tx.category}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                  <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", typeColors[tx.type])}>
                    <TypeIcon size={11} /> {tx.type}
                  </span>
                  <span className={cn("text-right font-semibold",
                    tx.value > 0 ? "text-emerald-500" : tx.type === "Investimento" ? "text-violet-400" : "text-rose-400")}>
                    {tx.value > 0 ? "+" : ""}{fmtBRL(tx.value)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
