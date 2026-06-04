import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, ReferenceLine,
} from "recharts"
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Shield, Target,
  Zap, Activity, DollarSign, BarChart2, RefreshCw, Loader2,
  CheckCircle2, XCircle, Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTransactions } from "@/hooks/api/useTransactions"
import { useInvestments } from "@/hooks/api/useInvestments"
import { useGoals } from "@/hooks/api/useGoals"
import { useFinancialScores, useAnomalies, useBalanceProjection } from "@/hooks/api/useAnalytics"
import { api, BASE } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { analyticsKeys } from "@/hooks/api/useAnalytics"

export const Route = createFileRoute("/_layout/analise")({
  component: AnalisePage,
  head: () => ({ meta: [{ title: "Score & IA — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

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

// ── Hook composto de análise (calcula no frontend) ────────────────────────────

function useAnalytics() {
  const { transactions, isLoading: loadTx } = useTransactions()
  const { investments, totalInvestido, isLoading: loadInv } = useInvestments()
  const { ativas: metasAtivas, isLoading: loadGoals } = useGoals()
  const { data: scoresHistorico = [], isLoading: loadScores } = useFinancialScores()
  const { data: anomalies = [], isLoading: loadAnomalies } = useAnomalies()
  const { data: projections = [], isLoading: loadProj } = useBalanceProjection()

  const isLoading = loadTx || loadInv || loadGoals || loadScores || loadAnomalies || loadProj

  const computed = useMemo(() => {
    if (!transactions.length) return null

    const now    = new Date()
    const curMes = now.getMonth()
    const curAno = now.getFullYear()

    // Agrupa transações por mês
    const byMonth: Record<string, { receitas: number; despesas: number; investimentos: number }> = {}

    for (const tx of transactions) {
      const d    = new Date(tx.transaction_date)
      const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (!byMonth[key]) byMonth[key] = { receitas: 0, despesas: 0, investimentos: 0 }
      const val  = Number(tx.transaction_value)
      if (val > 0)       byMonth[key].receitas      += val
      else if (val < -1000 && tx.typeName?.toLowerCase().includes("invest"))
                          byMonth[key].investimentos += Math.abs(val)
      else               byMonth[key].despesas       += Math.abs(val)
    }

    // Mês corrente
    const curKey      = `${curAno}-${String(curMes + 1).padStart(2, "0")}`
    const cur         = byMonth[curKey] ?? { receitas: 0, despesas: 0, investimentos: 0 }
    const saldoMes    = cur.receitas - cur.despesas - cur.investimentos

    // Últimos 6 meses em ordem
    const meses6: Array<{ label: string; receitas: number; despesas: number; investimentos: number; saldo: number }> = []
    for (let i = 5; i >= 0; i--) {
      let m = curMes - i
      let y = curAno
      while (m < 0) { m += 12; y-- }
      const k   = `${y}-${String(m + 1).padStart(2, "0")}`
      const d   = byMonth[k] ?? { receitas: 0, despesas: 0, investimentos: 0 }
      meses6.push({ label: MONTH_NAMES[m], ...d, saldo: d.receitas - d.despesas - d.investimentos })
    }

    // ── Indicador 1: Expense-income ratio ────────────────────────────────────
    const expenseIncomeRatio = cur.receitas > 0 ? cur.despesas / cur.receitas : 1

    // ── Indicador 2: Taxa de poupança ─────────────────────────────────────────
    const savingsRate = cur.receitas > 0 ? (saldoMes / cur.receitas) * 100 : 0

    // ── Indicador 3: Burn rate trend ──────────────────────────────────────────
    const hist3 = meses6.slice(0, 3).map(m => m.despesas).filter(v => v > 0)
    const mediaDesp = hist3.length ? hist3.reduce((a, b) => a + b, 0) / hist3.length : cur.despesas
    const burnTrend = mediaDesp > 0 ? ((cur.despesas - mediaDesp) / mediaDesp) * 100 : 0

    // ── Indicador 4: Gastos por categoria (mês atual) ────────────────────────
    const catSpend: Record<string, number> = {}
    for (const tx of transactions) {
      const d = new Date(tx.transaction_date)
      if (d.getMonth() === curMes && d.getFullYear() === curAno && Number(tx.transaction_value) < 0) {
        const cat = (tx as any).categoryName ?? "Outros"
        catSpend[cat] = (catSpend[cat] ?? 0) + Math.abs(Number(tx.transaction_value))
      }
    }
    const catData = Object.entries(catSpend)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)

    // HHI de concentração
    const totalCat = Object.values(catSpend).reduce((a, b) => a + b, 0) || 1
    const hhi = Object.values(catSpend).reduce((acc, v) => acc + (v / totalCat) ** 2, 0) * 100

    // ── Indicador 5: Taxa de investimento ─────────────────────────────────────
    const investRate = cur.receitas > 0 ? (cur.investimentos / cur.receitas) * 100 : 0

    // ── Indicador 6: Reserva de emergência (meses) ───────────────────────────
    const mediaDesp3 = mediaDesp || 1
    const emergencyMonths = totalInvestido / mediaDesp3

    // ── Indicador 7: Cobertura de metas ──────────────────────────────────────
    const metasComAporte = metasAtivas.filter(
      m => m.suggested_contribution && cur.investimentos >= Number(m.suggested_contribution)
    ).length
    const goalCoverage = metasAtivas.length > 0 ? (metasComAporte / metasAtivas.length) * 100 : 100

    // ── Indicador 8: Anomalias por categoria (desvio >30% vs 3 meses) ────────
    const catHistMes: Record<string, number[]> = {}
    for (let i = 1; i <= 3; i++) {
      let m = curMes - i
      let y = curAno
      while (m < 0) { m += 12; y-- }
      for (const tx of transactions) {
        const d = new Date(tx.transaction_date)
        if (d.getMonth() === m && d.getFullYear() === y && Number(tx.transaction_value) < 0) {
          const cat = (tx as any).categoryName ?? "Outros"
          if (!catHistMes[cat]) catHistMes[cat] = []
          catHistMes[cat].push(Math.abs(Number(tx.transaction_value)))
        }
      }
    }
    const anomaliasCalc = Object.entries(catSpend)
      .filter(([cat]) => catHistMes[cat]?.length)
      .map(([cat, atual]) => {
        const hist   = catHistMes[cat]
        const media  = hist.reduce((a, b) => a + b, 0) / hist.length
        const desvio = media > 0 ? ((atual - media) / media) * 100 : 0
        return { cat, atual, media, desvio: Math.round(desvio) }
      })
      .filter(a => Math.abs(a.desvio) >= 30)
      .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))

    // ── Indicador 9: Volatilidade mensal ─────────────────────────────────────
    const saldos6 = meses6.map(m => m.saldo).filter(v => v !== 0)
    const meanS   = saldos6.length ? saldos6.reduce((a, b) => a + b, 0) / saldos6.length : 0
    const stdS    = saldos6.length >= 2
      ? Math.sqrt(saldos6.reduce((a, b) => a + (b - meanS) ** 2, 0) / saldos6.length)
      : 0
    const volatility = meanS !== 0 ? (stdS / Math.abs(meanS)) * 100 : 0

    // ── Indicador 10: Tendência patrimonial (6 meses) ─────────────────────────
    const patrimValues = meses6.map((m, i) => ({
      label: m.label,
      patrimonio: Math.round(meses6.slice(0, i + 1).reduce((a, b) => a + b.saldo, 0) + totalInvestido),
    }))

    // ── Score geral ponderado ─────────────────────────────────────────────────
    const s_eir     = Math.max(0, 100 - expenseIncomeRatio * 100)
    const s_sav     = Math.min(100, Math.max(0, savingsRate * 2))
    const s_burn    = Math.max(0, 100 - Math.abs(burnTrend))
    const s_hhi     = Math.max(0, 100 - hhi)
    const s_inv     = Math.min(100, investRate * 5)
    const s_emer    = Math.min(100, emergencyMonths * 16.7)
    const s_goals   = goalCoverage
    const s_anomaly = Math.max(0, 100 - anomaliasCalc.length * 20)
    const s_vol     = Math.max(0, 100 - Math.min(100, volatility))

    const scoreGeral = Math.round(
      s_eir * 0.20 + s_sav * 0.15 + s_burn * 0.10 + s_hhi * 0.08 +
      s_inv * 0.15 + s_emer * 0.15 + s_goals * 0.08 + s_anomaly * 0.05 + s_vol * 0.04
    )

    const radarData = [
      { subject: "Equilíbrio", A: Math.round(s_eir) },
      { subject: "Poupança",   A: Math.round(s_sav) },
      { subject: "Tendência",  A: Math.round(s_burn) },
      { subject: "Diversif.",  A: Math.round(s_hhi) },
      { subject: "Invest.",    A: Math.round(s_inv) },
      { subject: "Reserva",   A: Math.round(s_emer) },
    ]

    // Comparação atual vs histórico por categoria (para gráfico de discrepância)
    const discrepanciaData = Object.entries(catSpend)
      .filter(([cat]) => catHistMes[cat]?.length)
      .map(([cat, atual]) => {
        const hist  = catHistMes[cat]
        const media = hist.reduce((a, b) => a + b, 0) / hist.length
        return { name: cat.length > 10 ? cat.slice(0, 10) + "…" : cat, atual: Math.round(atual), media: Math.round(media) }
      })
      .sort((a, b) => b.atual - a.atual)

    return {
      scoreGeral, expenseIncomeRatio, savingsRate, burnTrend, hhi, investRate,
      emergencyMonths, goalCoverage, anomaliasCalc, volatility, meses6,
      catData, discrepanciaData, patrimValues, radarData,
      cur, saldoMes, metasAtivas,
    }
  }, [transactions, totalInvestido, metasAtivas])

  // Histórico de score do backend (quando disponível)
  const scoreHistory = scoresHistorico
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .slice(-12)
    .map(s => ({
      label: `${MONTH_NAMES[s.month - 1]}/${String(s.year).slice(2)}`,
      score: Number(s.score),
    }))

  return {
    isLoading, computed, anomalies, projections, scoreHistory,
  }
}

// ── Componentes de UI ─────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, trend, color, badge,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string
  trend?: number; color: string; badge?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
        {badge && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${color}18`, color }}>
            {badge}
          </span>
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

const CHART_COLORS = ["#4ade80","#22d3ee","#a78bfa","#fbbf24","#f87171","#fb923c","#38bdf8","#f472b6"]

const tooltipStyle = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: "var(--muted-foreground)" },
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AnalisePage() {
  const { isLoading, computed, anomalies, projections, scoreHistory } = useAnalytics()
  const [calculating, setCalculating] = useState(false)
  const qc = useQueryClient()

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      await api.post(`${BASE}/analytics/calculate`)
      qc.invalidateQueries({ queryKey: analyticsKeys.scores })
      qc.invalidateQueries({ queryKey: analyticsKeys.anomalies })
      qc.invalidateQueries({ queryKey: analyticsKeys.projections })
    } catch (e) {
      console.error(e)
    } finally {
      setCalculating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
        {[...Array(5)].map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)}
      </div>
    )
  }

  if (!computed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <Brain size={40} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Cadastre transações para ver sua análise financeira.</p>
      </div>
    )
  }

  const {
    scoreGeral, expenseIncomeRatio, savingsRate, burnTrend, hhi, investRate,
    emergencyMonths, goalCoverage, anomaliasCalc, volatility,
    meses6, catData, discrepanciaData, patrimValues, radarData, cur, saldoMes, metasAtivas,
  } = computed

  const projecao30 = projections.find(p => p.period_days === 30)
  const projecao90 = projections.find(p => p.period_days === 90)

  return (
    <div className="space-y-5 p-4 pb-24 sm:p-6 sm:pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Score & Inteligência</h1>
          <p className="text-xs text-muted-foreground">10 indicadores calculados em tempo real</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCalculate} disabled={calculating}>
          {calculating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Calcular & Salvar
        </Button>
      </div>

      {/* ── Score geral + Radar ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Score principal */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6">
          <div className="relative flex size-28 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--muted)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={scoreColor(scoreGeral)} strokeWidth="8"
                strokeDasharray={`${(scoreGeral / 100) * 251.2} 251.2`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black" style={{ color: scoreColor(scoreGeral) }}>{scoreGeral}</span>
              <span className="text-[10px] font-medium text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: scoreColor(scoreGeral) }}>{scoreLabel(scoreGeral)}</p>
            <p className="text-xs text-muted-foreground">Saúde Financeira Geral</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-muted-foreground">Receitas</p>
              <p className="font-semibold text-emerald-500">{fmtBRL(cur.receitas)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-muted-foreground">Despesas</p>
              <p className="font-semibold text-rose-400">{fmtBRL(cur.despesas)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-muted-foreground">Investido</p>
              <p className="font-semibold text-violet-400">{fmtBRL(cur.investimentos)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-muted-foreground">Saldo</p>
              <p className={cn("font-semibold", saldoMes >= 0 ? "text-emerald-500" : "text-rose-400")}>{fmtBRL(saldoMes)}</p>
            </div>
          </div>
        </div>

        {/* Radar */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Mapa de Saúde</p>
          <p className="mb-3 text-xs text-muted-foreground">6 dimensões financeiras · escala 0-100</p>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Radar dataKey="A" stroke="#4ade80" fill="#4ade80" fillOpacity={0.18} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 10 KPIs ────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">10 Indicadores</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

          {/* 1 - Comprometimento de renda */}
          <KpiCard
            icon={DollarSign}
            label="Comprometimento"
            value={fmtPct(expenseIncomeRatio * 100)}
            sub={expenseIncomeRatio < 0.7 ? "Saudável" : expenseIncomeRatio < 0.9 ? "Atenção" : "Crítico"}
            color={expenseIncomeRatio < 0.7 ? "#4ade80" : expenseIncomeRatio < 0.9 ? "#fbbf24" : "#f87171"}
            badge={expenseIncomeRatio < 0.7 ? "✓ OK" : "⚠"}
          />

          {/* 2 - Taxa de poupança */}
          <KpiCard
            icon={Shield}
            label="Taxa de Poupança"
            value={fmtPct(savingsRate)}
            sub={savingsRate >= 20 ? "Excelente" : savingsRate >= 10 ? "Adequado" : "Insuficiente"}
            color={savingsRate >= 20 ? "#4ade80" : savingsRate >= 10 ? "#fbbf24" : "#f87171"}
          />

          {/* 3 - Tendência de gastos */}
          <KpiCard
            icon={burnTrend > 0 ? TrendingUp : TrendingDown}
            label="Tendência Gastos"
            value={`${burnTrend > 0 ? "+" : ""}${fmtPct(burnTrend)}`}
            sub="vs média 3 meses"
            trend={burnTrend}
            color={Math.abs(burnTrend) < 15 ? "#4ade80" : Math.abs(burnTrend) < 30 ? "#fbbf24" : "#f87171"}
          />

          {/* 4 - Concentração de gastos */}
          <KpiCard
            icon={BarChart2}
            label="Concentração"
            value={`${hhi.toFixed(0)} HHI`}
            sub={hhi < 25 ? "Bem distribuído" : hhi < 50 ? "Moderado" : "Concentrado"}
            color={hhi < 25 ? "#4ade80" : hhi < 50 ? "#fbbf24" : "#f87171"}
          />

          {/* 5 - Taxa de investimento */}
          <KpiCard
            icon={TrendingUp}
            label="Taxa Invest."
            value={fmtPct(investRate)}
            sub={investRate >= 20 ? "Excelente" : investRate >= 10 ? "Bom" : "Melhorar"}
            color={investRate >= 20 ? "#4ade80" : investRate >= 10 ? "#fbbf24" : "#f87171"}
          />

          {/* 6 - Reserva de emergência */}
          <KpiCard
            icon={Shield}
            label="Reserva Emerg."
            value={`${emergencyMonths.toFixed(1)} meses`}
            sub={emergencyMonths >= 6 ? "Seguro" : emergencyMonths >= 3 ? "Razoável" : "Insuficiente"}
            color={emergencyMonths >= 6 ? "#4ade80" : emergencyMonths >= 3 ? "#fbbf24" : "#f87171"}
          />

          {/* 7 - Cobertura de metas */}
          <KpiCard
            icon={Target}
            label="Cobertura Metas"
            value={fmtPct(goalCoverage)}
            sub={`${metasAtivas?.length ?? 0} meta(s) ativa(s)`}
            color={goalCoverage >= 80 ? "#4ade80" : goalCoverage >= 50 ? "#fbbf24" : "#f87171"}
          />

          {/* 8 - Anomalias */}
          <KpiCard
            icon={AlertTriangle}
            label="Anomalias"
            value={`${anomaliasCalc.length} categ.`}
            sub={anomaliasCalc.length === 0 ? "Sem desvios" : "Desvio > 30%"}
            color={anomaliasCalc.length === 0 ? "#4ade80" : anomaliasCalc.length <= 2 ? "#fbbf24" : "#f87171"}
          />

          {/* 9 - Volatilidade */}
          <KpiCard
            icon={Activity}
            label="Volatilidade"
            value={fmtPct(volatility)}
            sub={volatility < 20 ? "Estável" : volatility < 50 ? "Moderada" : "Alta"}
            color={volatility < 20 ? "#4ade80" : volatility < 50 ? "#fbbf24" : "#f87171"}
          />

          {/* 10 - Score sintético */}
          <KpiCard
            icon={Brain}
            label="Score IA"
            value={String(scoreGeral)}
            sub={scoreLabel(scoreGeral)}
            color={scoreColor(scoreGeral)}
            badge="/100"
          />
        </div>
      </div>

      {/* ── Fluxo de caixa 6 meses ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-semibold">Fluxo de Caixa — 6 Meses</h2>
        <p className="mb-4 text-xs text-muted-foreground">Receitas vs Despesas vs Investimentos</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={meses6} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
            <Bar dataKey="receitas"      name="Receitas"     fill="#4ade80" radius={[3, 3, 0, 0]} />
            <Bar dataKey="despesas"      name="Despesas"     fill="#f87171" radius={[3, 3, 0, 0]} />
            <Bar dataKey="investimentos" name="Investimentos" fill="#a78bfa" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Discrepância por categoria ─────────────────────────────────────── */}
      {discrepanciaData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <h2 className="text-sm font-semibold">Discrepância por Categoria</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Gasto atual (azul) vs média histórica 3 meses (cinza)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={discrepanciaData} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="media"  name="Média hist." fill="var(--muted)" radius={[0, 3, 3, 0]} />
              <Bar dataKey="atual"  name="Mês atual"   radius={[0, 3, 3, 0]}>
                {discrepanciaData.map((entry, i) => (
                  <Cell key={i} fill={entry.atual > entry.media * 1.3 ? "#f87171" : entry.atual > entry.media * 1.1 ? "#fbbf24" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Evolução patrimonial + score ──────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Patrimônio acumulado */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-semibold">Tendência Patrimonial</h2>
          <p className="mb-4 text-xs text-muted-foreground">Patrimônio estimado acumulado</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={patrimValues} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="patrimonioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
              <Area type="monotone" dataKey="patrimonio" name="Patrimônio" stroke="#4ade80" fill="url(#patrimonioGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#4ade80" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Score histórico (quando disponível do backend) */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-semibold">Evolução do Score</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            {scoreHistory.length > 0 ? "Histórico salvo pelo backend" : "Clique em Calcular & Salvar para registrar"}
          </p>
          {scoreHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={scoreHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <ReferenceLine y={70} stroke="#4ade80" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="score" name="Score" stroke="#22d3ee" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#22d3ee", stroke: "var(--card)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[150px] flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-center">
              <Zap size={20} className="text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Score ainda não registrado.<br />Clique em "Calcular & Salvar".</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Distribuição de gastos + Anomalias ────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Pizza de gastos */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-semibold">Distribuição de Gastos</h2>
          <p className="mb-2 text-xs text-muted-foreground">Por categoria — mês atual</p>
          {catData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value" paddingAngle={2}>
                    {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {catData.slice(0, 5).map((c, i) => {
                  const pct = Math.round((c.value / catData.reduce((a, b) => a + b.value, 0)) * 100)
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="size-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Sem despesas registradas no mês.</p>
          )}
        </div>

        {/* Anomalias calculadas */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <h2 className="text-sm font-semibold">Alertas de Anomalia</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Categorias com desvio &gt; 30% vs histórico</p>
          {anomaliasCalc.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-3 text-xs text-emerald-500">
              <CheckCircle2 size={14} />
              <span>Nenhuma anomalia detectada. Padrão de gastos normal!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {anomaliasCalc.map((a, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs",
                  a.desvio > 0
                    ? "border-rose-500/20 bg-rose-500/8 text-rose-400"
                    : "border-emerald-500/20 bg-emerald-500/8 text-emerald-400"
                )}>
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{a.cat}</p>
                    <p className="text-muted-foreground">
                      Atual: {fmtBRL(a.atual)} · Esperado: {fmtBRL(a.media)}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold">
                    {a.desvio > 0 ? "+" : ""}{a.desvio}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Anomalias salvas no backend */}
          {anomalies.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Salvas no sistema</p>
              {anomalies.slice(0, 3).map(a => (
                <div key={a.id} className="flex justify-between text-xs py-1">
                  <span className="text-muted-foreground">Cat. #{a.category_id}</span>
                  <span className={a.deviation_percentage > 0 ? "text-rose-400" : "text-emerald-500"}>
                    {Number(a.deviation_percentage) > 0 ? "+" : ""}{Number(a.deviation_percentage).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Projeção de saldo ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Brain size={14} className="text-violet-400" />
          <h2 className="text-sm font-semibold">Projeção de Saldo</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {projecao30 ? "Baseado no ritmo de gastos atual" : "Clique em Calcular & Salvar para gerar projeção"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Projeção 30 dias", proj: projecao30, cor: "#22d3ee" },
            { label: "Projeção 90 dias", proj: projecao90, cor: "#a78bfa" },
          ].map(({ label, proj, cor }) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              {proj ? (
                <>
                  <p className="mt-1 text-base font-bold" style={{ color: cor }}>
                    {fmtBRL(Number(proj.projected_balance))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Atual: {fmtBRL(Number(proj.current_balance))}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">—</p>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}