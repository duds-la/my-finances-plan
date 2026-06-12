import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, ReferenceLine,
} from "recharts"
import {
  Brain, TrendingUp, TrendingDown, Shield,
  DollarSign, BarChart2, RefreshCw, Loader2,
  CheckCircle2, XCircle, Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  useAnalyticsDashboard, useFinancialScores, analyticsKeys,
} from "@/hooks/api/useAnalytics"
import { api, BASE } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { CineCard } from "@/components/Common/CineCard"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/analise")({
  component: AnalisePage,
  head: () => ({ meta: [{ title: "Análise — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number, decimals = 1) => `${Number(v).toFixed(decimals)}%`

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
const COLORS = ["#34d399","#22d3ee","#a78bfa","#fbbf24","#fb7185","#fb923c","#38bdf8","#f472b6"]

function GlassTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-xl">
      {label !== undefined && <p className="mb-1 font-medium text-muted-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-numeric font-semibold" style={{ color: p.color || p.payload?.fill }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function scoreColor(s: number) {
  if (s >= 75) return "#34d399"
  if (s >= 50) return "#fbbf24"
  return "#fb7185"
}
function scoreLabel(s: number) {
  if (s >= 80) return "Excelente"
  if (s >= 65) return "Bom"
  if (s >= 45) return "Regular"
  return "Crítico"
}

// ── Anel de score (SVG com gradiente + glow) ──────────────────────────────────

function BigScoreRing({ score }: { score: number }) {
  const color = scoreColor(score)
  const sz = 132
  const r = (sz - 14) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(score, 100) / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
        <defs>
          <linearGradient id="anaScoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={score >= 50 ? "#22d3ee" : color} />
          </linearGradient>
        </defs>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="var(--muted)" strokeWidth={10} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none"
          stroke="url(#anaScoreGrad)" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)",
          }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-numeric text-4xl font-bold" style={{ color }}>
          <CountUp value={score} format={v => v.toFixed(0)} />
        </span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, badge, trend,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string
  color: string; badge?: string; trend?: number
}) {
  return (
    <CineCard accent={color} className="p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex size-8 items-center justify-center rounded-lg"
          style={{ background: `${color}18`, boxShadow: `0 0 14px -4px ${color}` }}>
          <Icon size={15} style={{ color }} />
        </div>
        {badge && (
          <span className="font-numeric rounded-full px-2 py-0.5 text-[10px] font-semibold"
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
      <p className="font-numeric mt-0.5 text-base font-bold" style={{ color }}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </CineCard>
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
          <div key={i} className="skeleton h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="glass-card m-4 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-12 text-center">
        <Brain size={40} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Cadastre transações para ver sua análise financeira.
        </p>
        <Button size="sm" className="glow-primary gap-1.5" onClick={handleCalculate} disabled={calculating}>
          {calculating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Calcular agora
        </Button>
      </div>
    )
  }

  const ind = dashboard.indicators

  // ── Dados para gráficos ───────────────────────────────────────────────────

  const meses6 = (dashboard.saldos_historico as number[]).map((saldo, i) => {
    let m = month - (5 - i)
    let y = year
    while (m <= 0) { m += 12; y-- }
    return { label: MONTH_NAMES[m - 1], saldo }
  })

  const catData = Object.entries(dashboard.cat_spending as Record<string, number>)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  const discrepanciaData = Object.entries(dashboard.cat_spending as Record<string, number>)
    .filter(([cat]) => (dashboard.cat_hist_media as Record<string, number>)[cat] !== undefined)
    .map(([cat, atual]) => ({
      name:  cat.length > 12 ? cat.slice(0, 12) + "…" : cat,
      atual: Math.round(atual),
      media: Math.round((dashboard.cat_hist_media as Record<string, number>)[cat] ?? 0),
    }))
    .sort((a, b) => b.atual - a.atual)

  const anomalias = (dashboard.anomalias ?? []) as Array<{
    category_id: number; expected_value: number; actual_value: number
    deviation_percentage: number
  }>

  const radarData = [
    { subject: "Equilíbrio", A: Math.round(Math.max(0, 100 - ind.expense_income_ratio * 100)) },
    { subject: "Poupança",   A: Math.round(Math.min(100, Math.max(0, ind.savings_rate * 2))) },
    { subject: "Tendência",  A: Math.round(Math.max(0, 100 - Math.abs(ind.burn_rate_trend))) },
    { subject: "Diversif.",  A: Math.round(Math.max(0, 100 - ind.category_concentration)) },
    { subject: "Invest.",    A: Math.round(Math.min(100, ind.investment_rate * 5)) },
    { subject: "Reserva",    A: Math.round(Math.min(100, ind.emergency_months * 16.7)) },
  ]

  const scoreHistory = [...scoresHist]
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .slice(-12)
    .map(s => ({
      label: `${MONTH_NAMES[s.month - 1]}/${String(s.year).slice(2)}`,
      score: Number(s.score),
    }))

  const proj30 = (dashboard.projecoes ?? []).find((p: any) => p.period_days === 30)
  const proj90 = (dashboard.projecoes ?? []).find((p: any) => p.period_days === 90)

  const scoreGeral = ind.score_geral

  return (
    <div className="space-y-5 p-4 pb-24 sm:p-6 sm:pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Inteligência"
        title="Análise Financeira"
        subtitle={`${MONTH_NAMES[month - 1]} ${year}`}
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCalculate} disabled={calculating}>
            {calculating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Recalcular
          </Button>
        }
      />

      {/* ── Score + Resumo + Radar ──────────────────────────────────────────── */}
      <div className="stagger-children grid gap-4 lg:grid-cols-3">

        {/* Score circular */}
        <CineCard accent={scoreColor(scoreGeral)} className="flex flex-col items-center justify-center gap-3 p-6">
          <BigScoreRing score={scoreGeral} />
          <div className="text-center">
            <p className="font-display text-sm font-semibold" style={{ color: scoreColor(scoreGeral) }}>
              {scoreLabel(scoreGeral)}
            </p>
            <p className="text-xs text-muted-foreground">Score de saúde financeira</p>
          </div>
        </CineCard>

        {/* Resumo do mês */}
        <CineCard accent="#22d3ee" className="p-4 sm:p-5">
          <p className="font-display mb-3 text-sm font-semibold">Resumo de {MONTH_NAMES[month - 1]}</p>
          <div className="space-y-2.5">
            {[
              { label: "Receitas",      value: dashboard.receitas,      color: "#34d399" },
              { label: "Despesas",      value: dashboard.despesas,      color: "#fb7185" },
              { label: "Investimentos", value: dashboard.investimentos, color: "#a78bfa" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-numeric font-semibold" style={{ color }}>{fmtBRL(Number(value))}</span>
              </div>
            ))}
            <div className="divider-glow my-1" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Saldo do mês</span>
              <span className={cn("font-numeric text-sm font-bold",
                Number(dashboard.saldo) >= 0 ? "text-emerald-500" : "text-rose-400")}>
                <CountUp value={Number(dashboard.saldo)} format={fmtBRL} />
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">R.E atual</span>
              <span className="font-numeric font-semibold text-cyan-400">
                {fmtBRL(Number(dashboard.re_valor ?? 0))}
                <span className="ml-1 text-muted-foreground">
                  ({Number(ind.emergency_months).toFixed(1)} meses)
                </span>
              </span>
            </div>
          </div>
        </CineCard>

        {/* Radar */}
        <CineCard accent="#34d399" className="p-4">
          <p className="font-display mb-1 text-sm font-semibold">Mapa de Saúde</p>
          <p className="mb-2 text-xs text-muted-foreground">6 dimensões · escala 0-100</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Radar dataKey="A" stroke="#34d399" fill="#34d399" fillOpacity={0.18} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </CineCard>
      </div>

      {/* ── 6 KPIs principais ──────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">6 Indicadores</h2>
          <div className="divider-glow h-px flex-1" />
        </div>
        <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3">

          <KpiCard
            icon={DollarSign}
            label="Comprometimento"
            value={fmtPct(ind.expense_income_ratio * 100)}
            sub={ind.expense_income_ratio < 0.7 ? "Saudável" : ind.expense_income_ratio < 0.9 ? "Atenção" : "Crítico"}
            color={ind.expense_income_ratio < 0.7 ? "#34d399" : ind.expense_income_ratio < 0.9 ? "#fbbf24" : "#fb7185"}
            badge={ind.expense_income_ratio < 0.7 ? "✓ OK" : "⚠"}
          />

          <KpiCard
            icon={Wallet}
            label="Taxa de Poupança"
            value={fmtPct(ind.savings_rate)}
            sub={ind.savings_rate >= 20 ? "Excelente" : ind.savings_rate >= 10 ? "Adequado" : "Insuficiente"}
            color={ind.savings_rate >= 20 ? "#34d399" : ind.savings_rate >= 10 ? "#fbbf24" : "#fb7185"}
          />

          <KpiCard
            icon={ind.burn_rate_trend > 0 ? TrendingUp : TrendingDown}
            label="Tendência de Gastos"
            value={`${ind.burn_rate_trend > 0 ? "+" : ""}${fmtPct(ind.burn_rate_trend)}`}
            sub="vs média 3 meses"
            trend={ind.burn_rate_trend}
            color={Math.abs(ind.burn_rate_trend) < 15 ? "#34d399" : Math.abs(ind.burn_rate_trend) < 30 ? "#fbbf24" : "#fb7185"}
          />

          <KpiCard
            icon={TrendingUp}
            label="Taxa de Investimento"
            value={fmtPct(ind.investment_rate)}
            sub={ind.investment_rate >= 20 ? "Excelente" : ind.investment_rate >= 10 ? "Bom" : "Melhorar"}
            color={ind.investment_rate >= 20 ? "#34d399" : ind.investment_rate >= 10 ? "#fbbf24" : "#fb7185"}
          />

          <KpiCard
            icon={Shield}
            label="Reserva de Emerg."
            value={`${Number(ind.emergency_months).toFixed(1)} meses`}
            sub={ind.emergency_months >= 6 ? "Seguro ✓" : ind.emergency_months >= 3 ? "Razoável" : "Insuficiente"}
            color={ind.emergency_months >= 6 ? "#34d399" : ind.emergency_months >= 3 ? "#fbbf24" : "#fb7185"}
            badge={fmtBRL(Number(dashboard.re_valor ?? 0))}
          />

          <KpiCard
            icon={BarChart2}
            label="Concentração"
            value={`${Number(ind.category_concentration).toFixed(0)} HHI`}
            sub={ind.category_concentration < 25 ? "Bem distribuído" : ind.category_concentration < 50 ? "Moderado" : "Concentrado"}
            color={ind.category_concentration < 25 ? "#34d399" : ind.category_concentration < 50 ? "#fbbf24" : "#fb7185"}
          />
        </div>
      </div>

      {/* ── Fluxo de caixa 6 meses ─────────────────────────────────────────── */}
      <CineCard accent="#22d3ee" className="animate-fade-up p-4 sm:p-5">
        <h2 className="font-display mb-1 text-sm font-semibold">Fluxo de Caixa — 6 Meses</h2>
        <p className="mb-4 text-xs text-muted-foreground">Saldo líquido por mês</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={meses6} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<GlassTooltip formatter={(v: any) => fmtBRL(Number(v ?? 0))} />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="saldo" name="Saldo" radius={[4, 4, 0, 0]}>
              {meses6.map((e, i) => <Cell key={i} fill={e.saldo >= 0 ? "#34d399" : "#fb7185"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CineCard>

      {/* ── Atual vs Média histórica ────────────────────────────────────────── */}
      {discrepanciaData.length > 0 && (
        <CineCard accent="#fbbf24" className="animate-fade-up p-4 sm:p-5">
          <h2 className="font-display mb-1 text-sm font-semibold">Gastos: Atual vs Média Histórica</h2>
          <p className="mb-4 text-xs text-muted-foreground">Comparação com média dos últimos 3 meses</p>
          <ResponsiveContainer width="100%" height={Math.max(160, discrepanciaData.length * 36)}>
            <BarChart data={discrepanciaData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={75} />
              <Tooltip content={<GlassTooltip formatter={(v: any) => fmtBRL(Number(v ?? 0))} />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Bar dataKey="media" name="Média hist." fill="var(--muted)" radius={[0, 3, 3, 0]} />
              <Bar dataKey="atual" name="Mês atual" radius={[0, 3, 3, 0]}>
                {discrepanciaData.map((e, i) => (
                  <Cell key={i} fill={e.atual > e.media * 1.3 ? "#fb7185" : e.atual > e.media * 1.1 ? "#fbbf24" : "#34d399"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CineCard>
      )}

      {/* ── Distribuição de gastos + Evolução score ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Distribuição por categoria */}
        <CineCard accent="#a78bfa" className="animate-fade-up p-4 sm:p-5">
          <h2 className="font-display mb-1 text-sm font-semibold">Distribuição de Gastos</h2>
          <p className="mb-3 text-xs text-muted-foreground">Por categoria — mês atual</p>
          {catData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={55} strokeWidth={0}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<GlassTooltip formatter={(v: any) => fmtBRL(Number(v ?? 0))} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {catData.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full"
                      style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 5px ${COLORS[i % COLORS.length]}` }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                    <span className="font-numeric ml-auto shrink-0 font-medium">{fmtBRL(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Sem gastos registrados.</p>
          )}
        </CineCard>

        {/* Evolução do score */}
        <CineCard accent="#22d3ee" className="animate-fade-up p-4 sm:p-5">
          <h2 className="font-display mb-1 text-sm font-semibold">Evolução do Score</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {scoreHistory.length > 1 ? "Histórico dos últimos meses" : "Clique em Recalcular para registrar"}
          </p>
          {scoreHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={scoreHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <ReferenceLine y={70} stroke="#34d399" strokeDasharray="4 4" strokeOpacity={0.4} />
                <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Tooltip content={<GlassTooltip />} />
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
        </CineCard>
      </div>

      {/* ── Anomalias ──────────────────────────────────────────────────────── */}
      <CineCard accent="#fb7185" className="animate-fade-up p-4 sm:p-5">
        <h2 className="font-display mb-1 text-sm font-semibold">Anomalias Detectadas</h2>
        <p className="mb-3 text-xs text-muted-foreground">Categorias com desvio &gt; 30% vs média histórica</p>
        {anomalias.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <p className="text-xs font-medium text-emerald-500">Nenhuma anomalia detectada este mês.</p>
          </div>
        ) : (
          <div className="stagger-children space-y-2">
            {anomalias.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-xs transition-colors hover:bg-muted/70">
                <div className="flex items-center gap-2">
                  {a.deviation_percentage > 0
                    ? <XCircle size={13} className="shrink-0 text-rose-400" />
                    : <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />}
                  <span className="font-medium">Categoria {a.category_id}</span>
                </div>
                <div className="text-right">
                  <p className={cn("font-numeric font-bold", a.deviation_percentage > 0 ? "text-rose-400" : "text-emerald-500")}>
                    {a.deviation_percentage > 0 ? "+" : ""}{Number(a.deviation_percentage).toFixed(1)}%
                  </p>
                  <p className="font-numeric text-[10px] text-muted-foreground">
                    {fmtBRL(a.actual_value)} vs {fmtBRL(a.expected_value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CineCard>

      {/* ── Projeções ──────────────────────────────────────────────────────── */}
      <CineCard accent="#a78bfa" className="animate-fade-up p-4 sm:p-5">
        <h2 className="font-display mb-1 text-sm font-semibold">Projeção de Saldo</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {proj30 ? "Baseado no ritmo atual de receitas e despesas" : "Clique em Recalcular para gerar projeção"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "30 dias",  proj: proj30, color: "#22d3ee" },
            { label: "90 dias",  proj: proj90, color: "#a78bfa" },
          ].map(({ label, proj, color }) => (
            <div key={label} className="rounded-lg border p-3.5"
              style={{ borderColor: `${color}30`, background: `${color}08` }}>
              <p className="mb-1 text-[11px] text-muted-foreground">Projeção {label}</p>
              {proj ? (
                <>
                  <p className="font-numeric text-base font-bold" style={{ color }}>
                    <CountUp value={Number(proj.projected_balance)} format={fmtBRL} />
                  </p>
                  <p className="font-numeric mt-0.5 text-[10px] text-muted-foreground">
                    Atual: {fmtBRL(Number(proj.current_balance))}
                  </p>
                  <p className={cn("font-numeric mt-0.5 text-[10px] font-medium",
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
      </CineCard>

    </div>
  )
}