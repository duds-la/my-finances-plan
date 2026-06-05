import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, ReferenceLine,
} from "recharts"
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Shield, Target,
  Activity, DollarSign, BarChart2, RefreshCw, Loader2,
  CheckCircle2, XCircle, Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  useAnalyticsDashboard, useFinancialScores, analyticsKeys,
} from "@/hooks/api/useAnalytics"
import { api, BASE } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"

export const Route = createFileRoute("/_layout/analise")({
  component: AnalisePage,
  head: () => ({ meta: [{ title: "Análise — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number, decimals = 1) => `${Number(v).toFixed(decimals)}%`

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const COLORS = ["#4ade80","#22d3ee","#a78bfa","#fbbf24","#f87171","#fb923c","#38bdf8","#f472b6"]

const tooltipStyle = {
  contentStyle: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 11,
  },
  labelStyle: { color: "var(--muted-foreground)" },
}

function scoreColor(s: number) {
  if (s >= 75) return "#4ade80"
  if (s >= 50) return "#fbbf24"
  return "#f87171"
}
function scoreLabel(s: number) {
  if (s >= 80) return "Excelente"
  if (s >= 65) return "Bom"
  if (s >= 45) return "Regular"
  return "Crítico"
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, badge, trend,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string
  color: string; badge?: string; trend?: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
        {badge && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${color}18`, color }}>{badge}</span>
        )}
        {trend !== undefined && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-medium",
            trend > 0 ? "text-rose-400" : "text-emerald-500")}>
            {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold" style={{ color }}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AnalisePage() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: dashboard, isLoading: loadDash } = useAnalyticsDashboard(year, month)
  const { data: scoresHist = [], isLoading: loadScores } = useFinancialScores()
  const [calculating, setCalculating] = useState(false)
  const qc = useQueryClient()

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      await api.post(`${BASE}/analytics/calculate`)
      qc.invalidateQueries({ queryKey: analyticsKeys.scores })
      qc.invalidateQueries({ queryKey: analyticsKeys.anomalies })
      qc.invalidateQueries({ queryKey: analyticsKeys.projections })
      qc.invalidateQueries({ queryKey: analyticsKeys.dashboard(year, month) })
    } finally {
      setCalculating(false)
    }
  }

  const isLoading = loadDash || loadScores

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <Brain size={40} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Cadastre transações para ver sua análise financeira.
        </p>
        <Button size="sm" onClick={handleCalculate} disabled={calculating} className="gap-1.5">
          {calculating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Calcular agora
        </Button>
      </div>
    )
  }

  const ind = dashboard.indicators

  // ── Dados para gráficos ───────────────────────────────────────────────────

  // Fluxo de caixa 6 meses
  const meses6 = (dashboard.saldos_historico as number[]).map((saldo, i) => {
    let m = month - (5 - i)
    let y = year
    while (m <= 0) { m += 12; y-- }
    return { label: MONTH_NAMES[m - 1], saldo }
  })

  // Categorias de gasto
  const catData = Object.entries(dashboard.cat_spending as Record<string, number>)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  // Atual vs média histórica
  const discrepanciaData = Object.entries(dashboard.cat_spending as Record<string, number>)
    .filter(([cat]) => (dashboard.cat_hist_media as Record<string, number>)[cat] !== undefined)
    .map(([cat, atual]) => ({
      name:  cat.length > 12 ? cat.slice(0, 12) + "…" : cat,
      atual: Math.round(atual),
      media: Math.round((dashboard.cat_hist_media as Record<string, number>)[cat] ?? 0),
    }))
    .sort((a, b) => b.atual - a.atual)

  // Anomalias
  const anomalias = (dashboard.anomalias ?? []) as Array<{
    category_id: number; expected_value: number; actual_value: number
    deviation_percentage: number
  }>

  // Radar
  const radarData = [
    { subject: "Equilíbrio", A: Math.round(Math.max(0, 100 - ind.expense_income_ratio * 100)) },
    { subject: "Poupança",   A: Math.round(Math.min(100, Math.max(0, ind.savings_rate * 2))) },
    { subject: "Tendência",  A: Math.round(Math.max(0, 100 - Math.abs(ind.burn_rate_trend))) },
    { subject: "Diversif.",  A: Math.round(Math.max(0, 100 - ind.category_concentration)) },
    { subject: "Invest.",    A: Math.round(Math.min(100, ind.investment_rate * 5)) },
    { subject: "Reserva",    A: Math.round(Math.min(100, ind.emergency_months * 16.7)) },
  ]

  // Histórico score
  const scoreHistory = [...scoresHist]
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .slice(-12)
    .map(s => ({
      label: `${MONTH_NAMES[s.month - 1]}/${String(s.year).slice(2)}`,
      score: Number(s.score),
    }))

  // Projeções
  const proj30 = (dashboard.projecoes ?? []).find((p: any) => p.period_days === 30)
  const proj90 = (dashboard.projecoes ?? []).find((p: any) => p.period_days === 90)

  const scoreGeral = ind.score_geral

  return (
    <div className="space-y-5 p-4 pb-24 sm:p-6 sm:pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Análise Financeira</h1>
          <p className="text-xs text-muted-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCalculate} disabled={calculating}>
          {calculating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Recalcular
        </Button>
      </div>

      {/* ── Score + Resumo + Radar ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Score circular */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6">
          <div className="relative flex size-32 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${scoreColor(scoreGeral)} ${scoreGeral}%, var(--muted) 0%)` }}>
            <div className="flex size-28 flex-col items-center justify-center rounded-full bg-card">
              <span className="text-4xl font-bold" style={{ color: scoreColor(scoreGeral) }}>
                {Math.round(scoreGeral)}
              </span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: scoreColor(scoreGeral) }}>
              {scoreLabel(scoreGeral)}
            </p>
            <p className="text-xs text-muted-foreground">Score de saúde financeira</p>
          </div>
        </div>

        {/* Resumo do mês */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="mb-3 text-sm font-semibold">Resumo de {MONTH_NAMES[month - 1]}</p>
          <div className="space-y-2.5">
            {[
              { label: "Receitas",      value: dashboard.receitas,      color: "#4ade80" },
              { label: "Despesas",      value: dashboard.despesas,      color: "#f87171" },
              { label: "Investimentos", value: dashboard.investimentos,  color: "#a78bfa" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold" style={{ color }}>{fmtBRL(Number(value))}</span>
              </div>
            ))}
            <div className="border-t border-border my-1" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Saldo do mês</span>
              <span className={cn("font-bold text-sm",
                Number(dashboard.saldo) >= 0 ? "text-emerald-500" : "text-rose-400")}>
                {fmtBRL(Number(dashboard.saldo))}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">R.E atual</span>
              <span className="font-semibold text-cyan-400">
                {fmtBRL(Number(dashboard.re_valor ?? 0))}
                <span className="text-muted-foreground ml-1">
                  ({Number(ind.emergency_months).toFixed(1)} meses)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Radar */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-1 text-sm font-semibold">Mapa de Saúde</p>
          <p className="mb-2 text-xs text-muted-foreground">6 dimensões · escala 0-100</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Radar dataKey="A" stroke="#4ade80" fill="#4ade80" fillOpacity={0.18} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 6 KPIs principais ──────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          6 Indicadores
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

          <KpiCard
            icon={DollarSign}
            label="Comprometimento"
            value={fmtPct(ind.expense_income_ratio * 100)}
            sub={ind.expense_income_ratio < 0.7 ? "Saudável" : ind.expense_income_ratio < 0.9 ? "Atenção" : "Crítico"}
            color={ind.expense_income_ratio < 0.7 ? "#4ade80" : ind.expense_income_ratio < 0.9 ? "#fbbf24" : "#f87171"}
            badge={ind.expense_income_ratio < 0.7 ? "✓ OK" : "⚠"}
          />

          <KpiCard
            icon={Wallet}
            label="Taxa de Poupança"
            value={fmtPct(ind.savings_rate)}
            sub={ind.savings_rate >= 20 ? "Excelente" : ind.savings_rate >= 10 ? "Adequado" : "Insuficiente"}
            color={ind.savings_rate >= 20 ? "#4ade80" : ind.savings_rate >= 10 ? "#fbbf24" : "#f87171"}
          />

          <KpiCard
            icon={ind.burn_rate_trend > 0 ? TrendingUp : TrendingDown}
            label="Tendência de Gastos"
            value={`${ind.burn_rate_trend > 0 ? "+" : ""}${fmtPct(ind.burn_rate_trend)}`}
            sub="vs média 3 meses"
            trend={ind.burn_rate_trend}
            color={Math.abs(ind.burn_rate_trend) < 15 ? "#4ade80" : Math.abs(ind.burn_rate_trend) < 30 ? "#fbbf24" : "#f87171"}
          />

          <KpiCard
            icon={TrendingUp}
            label="Taxa de Investimento"
            value={fmtPct(ind.investment_rate)}
            sub={ind.investment_rate >= 20 ? "Excelente" : ind.investment_rate >= 10 ? "Bom" : "Melhorar"}
            color={ind.investment_rate >= 20 ? "#4ade80" : ind.investment_rate >= 10 ? "#fbbf24" : "#f87171"}
          />

          <KpiCard
            icon={Shield}
            label="Reserva de Emerg."
            value={`${Number(ind.emergency_months).toFixed(1)} meses`}
            sub={ind.emergency_months >= 6 ? "Seguro ✓" : ind.emergency_months >= 3 ? "Razoável" : "Insuficiente"}
            color={ind.emergency_months >= 6 ? "#4ade80" : ind.emergency_months >= 3 ? "#fbbf24" : "#f87171"}
            badge={fmtBRL(Number(dashboard.re_valor ?? 0))}
          />

          <KpiCard
            icon={BarChart2}
            label="Concentração"
            value={`${Number(ind.category_concentration).toFixed(0)} HHI`}
            sub={ind.category_concentration < 25 ? "Bem distribuído" : ind.category_concentration < 50 ? "Moderado" : "Concentrado"}
            color={ind.category_concentration < 25 ? "#4ade80" : ind.category_concentration < 50 ? "#fbbf24" : "#f87171"}
          />
        </div>
      </div>

      {/* ── Fluxo de caixa 6 meses ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-semibold">Fluxo de Caixa — 6 Meses</h2>
        <p className="mb-4 text-xs text-muted-foreground">Saldo líquido por mês</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={meses6} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="saldo" name="Saldo" radius={[4, 4, 0, 0]}>
              {meses6.map((e, i) => <Cell key={i} fill={e.saldo >= 0 ? "#4ade80" : "#f87171"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Atual vs Média histórica ────────────────────────────────────────── */}
      {discrepanciaData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-semibold">Gastos: Atual vs Média Histórica</h2>
          <p className="mb-4 text-xs text-muted-foreground">Comparação com média dos últimos 3 meses</p>
          <ResponsiveContainer width="100%" height={Math.max(160, discrepanciaData.length * 36)}>
            <BarChart data={discrepanciaData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={75} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="media" name="Média hist." fill="var(--muted)" radius={[0, 3, 3, 0]} />
              <Bar dataKey="atual" name="Mês atual" radius={[0, 3, 3, 0]}>
                {discrepanciaData.map((e, i) => (
                  <Cell key={i} fill={e.atual > e.media * 1.3 ? "#f87171" : e.atual > e.media * 1.1 ? "#fbbf24" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Distribuição de gastos + Evolução score ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Distribuição por categoria */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-semibold">Distribuição de Gastos</h2>
          <p className="mb-3 text-xs text-muted-foreground">Por categoria — mês atual</p>
          {catData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={55} strokeWidth={0}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {catData.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate text-muted-foreground flex-1">{c.name}</span>
                    <span className="ml-auto shrink-0 font-medium">{fmtBRL(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Sem gastos registrados.</p>
          )}
        </div>

        {/* Evolução do score */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-semibold">Evolução do Score</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {scoreHistory.length > 1 ? "Histórico dos últimos meses" : "Clique em Recalcular para registrar"}
          </p>
          {scoreHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={scoreHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <ReferenceLine y={70} stroke="#4ade80" strokeDasharray="4 4" strokeOpacity={0.4} />
                <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="score" name="Score" stroke="#22d3ee" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#22d3ee", stroke: "var(--card)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[150px] flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-center">
              <Brain size={20} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                Score ainda não registrado.<br />Clique em "Recalcular".
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Anomalias ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-semibold">Anomalias Detectadas</h2>
        <p className="mb-3 text-xs text-muted-foreground">Categorias com desvio &gt; 30% vs média histórica</p>
        {anomalias.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-3">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-500 font-medium">Nenhuma anomalia detectada este mês.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {anomalias.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  {a.deviation_percentage > 0
                    ? <XCircle size={13} className="text-rose-400 shrink-0" />
                    : <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                  <span className="font-medium">Categoria {a.category_id}</span>
                </div>
                <div className="text-right">
                  <p className={cn("font-bold", a.deviation_percentage > 0 ? "text-rose-400" : "text-emerald-500")}>
                    {a.deviation_percentage > 0 ? "+" : ""}{Number(a.deviation_percentage).toFixed(1)}%
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {fmtBRL(a.actual_value)} vs {fmtBRL(a.expected_value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Projeções ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-semibold">Projeção de Saldo</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {proj30 ? "Baseado no ritmo atual de receitas e despesas" : "Clique em Recalcular para gerar projeção"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "30 dias",  proj: proj30, color: "#22d3ee" },
            { label: "90 dias",  proj: proj90, color: "#a78bfa" },
          ].map(({ label, proj, color }) => (
            <div key={label} className="rounded-lg border border-border p-3.5">
              <p className="text-[11px] text-muted-foreground mb-1">Projeção {label}</p>
              {proj ? (
                <>
                  <p className="text-base font-bold" style={{ color }}>
                    {fmtBRL(Number(proj.projected_balance))}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Atual: {fmtBRL(Number(proj.current_balance))}
                  </p>
                  <p className={cn("text-[10px] font-medium mt-0.5",
                    Number(proj.projected_balance) >= Number(proj.current_balance)
                      ? "text-emerald-500" : "text-rose-400")}>
                    {Number(proj.projected_balance) >= Number(proj.current_balance) ? "▲" : "▼"}
                    {" "}{fmtBRL(Math.abs(Number(proj.projected_balance) - Number(proj.current_balance)))}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">—</p>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}