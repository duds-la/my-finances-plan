import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useInvestments } from "@/hooks/api/useInvestments"
import { CineCard } from "@/components/Common/CineCard"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/portfolio")({
  component: PortfolioPage,
  head: () => ({ meta: [{ title: "Portfólio — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`

const COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#fbbf24", "#fb7185", "#fb923c"]

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                     "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// ── Custom Tooltips (vidro) ───────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">{payload[0].name}</p>
      <p className="font-numeric text-muted-foreground">{fmtBRL(payload[0].value)}</p>
    </div>
  )
}

function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-numeric" style={{ color: p.color }}>{p.name}: {fmtBRL(p.value)}</p>
      ))}
    </div>
  )
}

// ── Stat Card (CineCard + CountUp) ────────────────────────────────────────────

function StatCard({
  label, value, format, sub, icon: Icon, accent, positive,
}: {
  label: string
  value: number
  format: (v: number) => string
  sub?: string
  icon: React.ElementType
  accent: string
  positive?: boolean
}) {
  return (
    <CineCard accent={accent} className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div
          className="flex size-7 items-center justify-center rounded-lg"
          style={{ background: `${accent}1f`, boxShadow: `0 0 14px -4px ${accent}` }}
        >
          <Icon size={13} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight sm:text-xl">
          <CountUp value={value} format={format} />
        </p>
        {sub !== undefined && (
          <p className={cn("mt-0.5 text-xs font-medium",
            positive === undefined ? "text-muted-foreground"
            : positive ? "text-emerald-500" : "text-rose-400")}>
            {sub}
          </p>
        )}
      </div>
    </CineCard>
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
      <div className="space-y-4 p-4 sm:p-6">
        <div className="skeleton h-10 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)}
        </div>
        <div className="skeleton h-56" />
      </div>
    )
  }

  if (investments.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Consolidado"
        title="Portfólio"
        subtitle="Visão consolidada dos seus investimentos"
      />

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Valor Atual"
          value={valorAtualTotal}
          format={fmtBRL}
          icon={DollarSign}
          accent="#34d399"
        />
        <StatCard
          label="Total Investido"
          value={totalInvestido}
          format={fmtBRL}
          icon={TrendingUp}
          accent="#22d3ee"
        />
        <StatCard
          label="Rendimentos"
          value={totalRendimentos}
          format={fmtBRL}
          sub={totalRendimentos >= 0 ? `▲ ${fmtBRL(totalRendimentos)}` : `▼ ${fmtBRL(totalRendimentos)}`}
          icon={TrendingUp}
          accent={totalRendimentos >= 0 ? "#34d399" : "#fb7185"}
          positive={totalRendimentos >= 0}
        />
        <StatCard
          label="Rentabilidade"
          value={rentGlobal}
          format={fmtPct}
          sub={rentGlobal >= 0 ? "acima do aplicado" : "abaixo do aplicado"}
          icon={BarChart2}
          accent="#a78bfa"
          positive={rentGlobal >= 0}
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Composição por tipo */}
        <CineCard accent="#22d3ee" className="animate-fade-up delay-2 p-4">
          <p className="font-display mb-4 text-sm font-medium">Composição por Tipo</p>
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
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}` }}
                    />
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="font-numeric text-xs font-medium">{item.pct}%</span>
                    <span className="font-numeric text-xs text-muted-foreground">{fmtBRL(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CineCard>

        {/* Liquidez */}
        <CineCard accent="#34d399" className="animate-fade-up delay-3 p-4">
          <p className="font-display mb-4 text-sm font-medium">Liquidez</p>
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
                    <Cell fill="#34d399" stroke="transparent" />
                    <Cell fill="#22d3ee" stroke="transparent" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {liquidezData.map((item, i) => {
                  const color = i === 0 ? "#34d399" : "#22d3ee"
                  const pct = valorAtualTotal > 0
                    ? Math.round((item.value / valorAtualTotal) * 100)
                    : 0
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                      <span className="flex-1 truncate text-xs text-muted-foreground">{item.name}</span>
                      <span className="font-numeric text-xs font-medium">{pct}%</span>
                      <span className="font-numeric text-xs text-muted-foreground">{fmtBRL(item.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CineCard>
      </div>

      {/* ── Evolução de rendimentos ─────────────────────────────────────────── */}
      <CineCard accent="#34d399" className="animate-fade-up delay-4 p-4">
        <p className="font-display mb-4 text-sm font-medium">Rendimentos vs. Resgates (últimos 6 meses)</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={evolucaoData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false}
              tickFormatter={v => v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<AreaTooltip />} />
            <Area type="monotone" dataKey="rendimentos" name="Rendimentos"
              stroke="#34d399" strokeWidth={2} fill="url(#gradRend)" />
            <Area type="monotone" dataKey="resgates" name="Resgates"
              stroke="#fb7185" strokeWidth={2} fill="url(#gradResg)" />
          </AreaChart>
        </ResponsiveContainer>
      </CineCard>

      {/* ── Próximos vencimentos ────────────────────────────────────────────── */}
      {proximosVencimentos.length > 0 && (
        <CineCard accent="#fbbf24" className="animate-fade-up delay-5 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-amber-400" />
            <p className="font-display text-sm font-medium">Próximos Vencimentos</p>
          </div>
          <div className="stagger-children space-y-2">
            {proximosVencimentos.map(inv => {
              const urgente = inv.diasRestantes <= 30
              return (
                <div key={inv.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5 transition-colors hover:bg-muted/70">
                  <div className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    urgente
                      ? "bg-amber-500/15 text-amber-500 shadow-[0_0_12px_-2px_rgba(251,191,36,0.5)]"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {inv.typeAcronym}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{inv.typeName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(inv.maturity_date! + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-numeric text-xs font-semibold">{fmtBRL(inv.currentValue)}</p>
                    <p className={cn("text-[11px]", urgente ? "font-medium text-amber-500" : "text-muted-foreground")}>
                      {inv.diasRestantes === 0 ? "Vence hoje" : `${inv.diasRestantes}d restantes`}
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                </div>
              )
            })}
          </div>
        </CineCard>
      )}

      {/* ── Tabela de ativos ────────────────────────────────────────────────── */}
      <CineCard accent="#a78bfa" className="animate-fade-up delay-6 p-4">
        <p className="font-display mb-4 text-sm font-medium">Todos os Ativos</p>
        <div className="stagger-children space-y-2">
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
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-primary-foreground"
                    style={{ backgroundColor: COLORS[idx % COLORS.length], boxShadow: `0 0 10px -2px ${COLORS[idx % COLORS.length]}` }}>
                    {inv.typeAcronym}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{inv.typeName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Aplicado em {new Date(inv.application_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-numeric text-xs font-semibold">{fmtBRL(inv.currentValue)}</p>
                    <p className={cn("font-numeric flex items-center justify-end gap-0.5 text-[11px] font-medium",
                      isPos ? "text-emerald-500" : "text-rose-400")}>
                      {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {fmtPct(rent)}
                    </p>
                  </div>
                </div>
              )
            })}
        </div>
      </CineCard>
    </div>
  )
}