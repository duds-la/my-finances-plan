/**
 * useAnalytics.ts
 *
 * Endpoints consumidos:
 *   GET  /api/v1/financial_score/                        → histórico de scores
 *   GET  /api/v1/financial_score/filter?month=&year=     → score de mês específico
 *   GET  /api/v1/anomaly/                                → anomalias detectadas
 *   GET  /api/v1/balance_projection/                     → projeções de saldo
 *   GET  /api/v1/analytics/dashboard/{year}/{month}      → snapshot completo de indicadores
 */
import { useQuery } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinancialScore {
  id: number
  user_id: number
  month: number
  year: number
  score: number
  expense_income_ratio?: number
  emergency_reserve?: number
  components?: Record<string, number>
  calculated_at: string
}

export interface Anomaly {
  id: number
  user_id: number
  transaction_id?: number
  category_id?: number
  expected_value: number
  real_value: number
  deviation_percentage: number
  status: string
  detected_at: string
}

export interface BalanceProjection {
  id: number
  user_id: number
  period_days: number
  current_balance: number
  projected_balance: number
  expected_incomes?: Record<string, number>
  expected_expenses?: Record<string, number>
  generated_at: string
}

export interface DashboardData {
  // Indicadores calculados pelo backend
  indicators: {
    score_geral: number
    expense_income_ratio: number
    savings_rate: number
    burn_rate_trend: number
    category_concentration: number
    investment_rate: number
    emergency_months: number
    goal_coverage: number
    anomaly_count: number
    monthly_volatility: number
  }
  // Totais do mês
  receitas: number
  despesas: number
  investimentos: number
  saldo: number
  // Gráficos
  cat_spending: Record<string, number>
  cat_hist_media: Record<string, number>
  saldos_historico: number[]
  anomalias: Array<{
    category_id: number
    expected_value: number
    actual_value: number
    deviation_percentage: number
    status: string
  }>
  projecoes: Array<{
    period_days: number
    current_balance: number
    projected_balance: number
    expected_inflows: Array<{ label: string; value: number }>
    expected_outflows: Array<{ label: string; value: number }>
  }>
  score_history: Array<{
    month: number
    year: number
    score: number
    components?: Record<string, number>
    calculated_at: string
  }>
  mes: number
  ano: number
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const analyticsKeys = {
  scores:       ["financial_scores"] as const,
  scoreByMonth: (month: number, year: number) => ["financial_score", month, year] as const,
  anomalies:    ["anomalies"] as const,
  projections:  ["balance_projections"] as const,
  dashboard:    (year: number, month: number) => ["analytics_dashboard", year, month] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useFinancialScores() {
  return useQuery({
    queryKey: analyticsKeys.scores,
    queryFn: async (): Promise<FinancialScore[]> => {
      const { data } = await api.get(`${BASE}/financial_score/`)
      return data
    },
  })
}

export function useCurrentMonthScore() {
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  return useQuery({
    queryKey: analyticsKeys.scoreByMonth(month, year),
    queryFn: async (): Promise<FinancialScore | null> => {
      try {
        const { data } = await api.get(
          `${BASE}/financial_score/filter?month=${month}&year=${year}`,
        )
        return data
      } catch {
        return null
      }
    },
  })
}

export function useAnomalies() {
  return useQuery({
    queryKey: analyticsKeys.anomalies,
    queryFn: async (): Promise<Anomaly[]> => {
      const { data } = await api.get(`${BASE}/anomaly/`)
      return data
    },
  })
}

export function useBalanceProjection() {
  return useQuery({
    queryKey: analyticsKeys.projections,
    queryFn: async (): Promise<BalanceProjection[]> => {
      const { data } = await api.get(`${BASE}/balance_projection/`)
      return data
    },
  })
}

export function useAnalyticsDashboard(year?: number, month?: number) {
  const now = new Date()
  const y   = year  ?? now.getFullYear()
  const m   = month ?? now.getMonth() + 1

  return useQuery({
    queryKey: analyticsKeys.dashboard(y, m),
    queryFn: async (): Promise<DashboardData> => {
      const { data } = await api.get(`${BASE}/analytics/dashboard/${y}/${m}`)
      return data
    },
  })
}

// ── Composite hook para a página de Análise ───────────────────────────────────

export function useAnalyticsPage() {
  const { data: scores = [], isLoading: loadingScores }       = useFinancialScores()
  const { data: currentScore, isLoading: loadingCurrent }     = useCurrentMonthScore()
  const { data: anomalies = [], isLoading: loadingAnomalies } = useAnomalies()
  const { data: projections = [], isLoading: loadingProjections } = useBalanceProjection()

  const scoreHistorico = [...scores]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })
    .slice(-6)
    .map((s) => ({
      month: new Date(s.year, s.month - 1).toLocaleString("pt-BR", { month: "short" }),
      score: Number(s.score),
    }))

  const componentesScore: Array<{ label: string; pct: number; cor: string }> = []
  if (currentScore?.components) {
    const colors = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171"]
    Object.entries(currentScore.components).forEach(([key, val], i) => {
      componentesScore.push({
        label: key.replace(/_/g, " "),
        pct:   Math.min(100, Math.round(Number(val))),
        cor:   colors[i % colors.length],
      })
    })
  }

  const scoreAtual = currentScore ? Number(currentScore.score) : null

  const projecaoAtual = projections.length > 0
    ? projections.sort(
        (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
      )[0]
    : null

  return {
    scores,
    currentScore,
    scoreAtual,
    scoreHistorico,
    componentesScore,
    anomalies,
    projecaoAtual,
    isLoading: loadingScores || loadingCurrent || loadingAnomalies || loadingProjections,
  }
}