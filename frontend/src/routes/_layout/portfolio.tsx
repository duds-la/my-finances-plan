import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useInvestments } from "@/hooks/api/useInvestments"

export const Route = createFileRoute("/_layout/portfolio")({
  component: PortfolioPage,
  head: () => ({ meta: [{ title: "Portfólio — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`

const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171", "#fb923c"]

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                     "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{fmtBRL(payload[0].value)}</p>
    </div>
  )
}

function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtBRL(p.value)}</p>
      ))}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, positive,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  positive?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex size-7 items-center justify-center rounded-md bg-muted">
          <Icon size={14} className="text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {sub !== undefined && (
          <p className={cn("text-xs mt-0.5 font-medium",
            positive === undefined ? "text-muted-foreground"
            : positive ? "text-emerald-500" : "text-rose-400")}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Portfolio Page ─────────────────────────────────────────────────────────────

function PortfolioPage() {
  const {
    investments,
    eventsByInv,
    composicaoPorTipo,
    totalInvestido,
    totalRendimentos,
    isLoading,
  } = useInvestments()

  const [activeSlice, setActiveSlice] = useState<number | null>(null)

  // Valor atual total
  const valorAtualTotal = investments.reduce((s, i) => s + i.currentValue, 0)
  const rentGlobal = totalInvestido > 0
    ? ((valorAtualTotal - totalInvestido) / totalInvestido) * 100
    : 0

  // Liquidez diária vs. não diária
  const liquidezData = useMemo(() => {
    const comLiquidez = investments
      .filter(i => i.isFixedIncome === false)
      .reduce((s, i) => s + i.currentValue, 0)
    const semLiquidez = investments
      .filter(i => i.isFixedIncome === true)
      .reduce((s, i) => s + i.currentValue, 0)
    return [
      { name: "Liquidez Diária", value: comLiquidez },
      { name: "Renda Fixa", value: semLiquidez },
    ].filter(d => d.value > 0)
  }, [investments])

  // Evolução mensal dos rendimentos (últimos 6 meses)
  const evolucaoData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const m = d.getMonth()
      const y = d.getFullYear()

      let rendimentos = 0
      let resgates = 0

      for (const [, events] of Object.entries(eventsByInv)) {
        for (const ev of events) {
          const evDate = new Date(ev.income_date)
          if (evDate.getMonth() === m && evDate.getFullYear() === y) {
            if (Number(ev.income_value) > 0) rendimentos += Number(ev.income_value)
            else resgates += Math.abs(Number(ev.income_value))
          }
        }
      }

      return { month: MONTH_NAMES[m], rendimentos, resgates }
    })
  }, [eventsByInv])

  // Próximos vencimentos
  const proximosVencimentos = useMemo(() => {
    const today = new Date()
    return investments
      .filter(i => i.maturity_date && i.status === "ativo")
      .map(i => {
        const mat = new Date(i.maturity_date!)
        const diff = Math.ceil((mat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return { ...i, diasRestantes: diff }
      })
      .filter(i => i.diasRestantes >= 0)
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 5)
  }, [investments])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando portfólio...
      </div>
    )
  }

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
        <BarChart2 size={32} className="text-muted-foreground" />
        <p className="text-sm font-medium">Nenhum investimento encontrado</p>
        <p className="text-xs text-muted-foreground">
          Adicione investimentos na aba <strong>Investimentos</strong> para ver seu portfólio.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 pb-24 sm:space-y-5 sm:p-6 sm:pb-6">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Portfólio</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Visão consolidada dos seus investimentos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Valor Atual"
          value={fmtBRL(valorAtualTotal)}
          icon={DollarSign}
        />
        <StatCard
          label="Total Investido"
          value={fmtBRL(totalInvestido)}
          icon={TrendingUp}
        />
        <StatCard
          label="Rendimentos"
          value={fmtBRL(totalRendimentos)}
          sub={totalRendimentos >= 0 ? `▲ ${fmtBRL(totalRendimentos)}` : `▼ ${fmtBRL(totalRendimentos)}`}
          icon={TrendingUp}
          positive={totalRendimentos >= 0}
        />
        <StatCard
          label="Rentabilidade"
          value={fmtPct(rentGlobal)}
          sub={rentGlobal >= 0 ? "acima do aplicado" : "abaixo do aplicado"}
          icon={BarChart2}
          positive={rentGlobal >= 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Composição por tipo */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-4">Composição por Tipo</p>
          {composicaoPorTipo.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados</p>
          ) : (
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={composicaoPorTipo}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    onMouseEnter={(_, idx) => setActiveSlice(idx)}
                    onMouseLeave={() => setActiveSlice(null)}
                  >
                    {composicaoPorTipo.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        opacity={activeSlice === null || activeSlice === i ? 1 : 0.4}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {composicaoPorTipo.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {item.name}
                    </span>
                    <span className="text-xs font-medium">{item.pct}%</span>
                    <span className="text-xs text-muted-foreground">{fmtBRL(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Liquidez */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-4">Liquidez</p>
          {liquidezData.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados</p>
          ) : (
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={liquidezData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    <Cell fill="#4ade80" stroke="transparent" />
                    <Cell fill="#22d3ee" stroke="transparent" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {liquidezData.map((item, i) => {
                  const color = i === 0 ? "#4ade80" : "#22d3ee"
                  const pct = valorAtualTotal > 0
                    ? Math.round((item.value / valorAtualTotal) * 100)
                    : 0
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
                      <span className="text-xs font-medium">{pct}%</span>
                      <span className="text-xs text-muted-foreground">{fmtBRL(item.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evolução de rendimentos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium mb-4">Rendimentos vs. Resgates (últimos 6 meses)</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={evolucaoData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={v => v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<AreaTooltip />} />
            <Area type="monotone" dataKey="rendimentos" name="Rendimentos"
              stroke="#4ade80" strokeWidth={2} fill="url(#gradRend)" />
            <Area type="monotone" dataKey="resgates" name="Resgates"
              stroke="#f87171" strokeWidth={2} fill="url(#gradResg)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Próximos vencimentos */}
      {proximosVencimentos.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={14} className="text-muted-foreground" />
            <p className="text-sm font-medium">Próximos Vencimentos</p>
          </div>
          <div className="space-y-2">
            {proximosVencimentos.map(inv => {
              const urgente = inv.diasRestantes <= 30
              return (
                <div key={inv.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors">
                  <div className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    urgente ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground"
                  )}>
                    {inv.typeAcronym}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{inv.typeName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(inv.maturity_date! + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{fmtBRL(inv.currentValue)}</p>
                    <p className={cn("text-[11px]", urgente ? "text-amber-500 font-medium" : "text-muted-foreground")}>
                      {inv.diasRestantes === 0 ? "Vence hoje" : `${inv.diasRestantes}d restantes`}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela de ativos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium mb-4">Todos os Ativos</p>
        <div className="space-y-2">
          {investments
            .filter(i => i.status === "ativo")
            .sort((a, b) => b.currentValue - a.currentValue)
            .map((inv, idx) => {
              const rent = Number(inv.invested_value) > 0
                ? ((inv.currentValue - Number(inv.invested_value)) / Number(inv.invested_value)) * 100
                : 0
              const isPos = rent >= 0
              return (
                <div key={inv.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-primary-foreground"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                    {inv.typeAcronym}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{inv.typeName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Aplicado em {new Date(inv.application_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{fmtBRL(inv.currentValue)}</p>
                    <p className={cn("text-[11px] font-medium flex items-center justify-end gap-0.5",
                      isPos ? "text-emerald-500" : "text-rose-400")}>
                      {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {fmtPct(rent)}
                    </p>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}