/**
 * useAnalytics.ts
 *
 * Endpoints consumidos:
 *   GET  /api/v1/financial_score/          → histórico de scores do usuário
 *   GET  /api/v1/financial_score/filter?month=&year=  → score de mês/ano específico
 *   GET  /api/v1/anomaly/                  → anomalias detectadas
 *   GET  /api/v1/balance_projection/       → projeções de saldo
 *
 * Schemas relevantes:
 *   Financial_Score_Schema_Response (model financial_score.py):
 *     id, user_id, month (int), year (int), score (Decimal 5,2),
 *     expense_income_ratio (Decimal 5,4 | null),
 *     emergency_reserve (Decimal 10,2 | null),
 *     components (JSON | null),
 *     calculated_at (datetime)
 *
 *   ANOMALIA (DER):
 *     id, user_id, transacao_id, categoria_id,
 *     valor_esperado, valor_real, desvio_percentual,
 *     status, detectada_em
 *
 *   PROJECAO_SALDO (DER):
 *     id, user_id, periodo_dias, saldo_atual, saldo_projetado,
 *     entradas_previstas (JSON), saidas_previstas (JSON), gerado_em
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

// ── Query keys ────────────────────────────────────────────────────────────────

export const analyticsKeys = {
  scores: ["financial_scores"] as const,
  scoreByMonth: (month: number, year: number) => ["financial_score", month, year] as const,
  anomalies: ["anomalies"] as const,
  projections: ["balance_projections"] as const,
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
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  return useQuery({
    queryKey: analyticsKeys.scoreByMonth(month, year),
    queryFn: async (): Promise<FinancialScore | null> => {
      try {
        const { data } = await api.get(
          `${BASE}/financial_score/filter?month=${month}&year=${year}`,
        )
        return data
      } catch {
        // 404 = score ainda não calculado para o mês
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

// ── Composite hook para a página de Análise ───────────────────────────────────

export function useAnalyticsPage() {
  const { data: scores = [], isLoading: loadingScores } = useFinancialScores()
  const { data: currentScore, isLoading: loadingCurrent } = useCurrentMonthScore()
  const { data: anomalies = [], isLoading: loadingAnomalies } = useAnomalies()
  const { data: projections = [], isLoading: loadingProjections } = useBalanceProjection()

  // Histórico dos últimos 6 meses para o gráfico de linha
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

  // Componentes do score para barras de progresso
  const componentesScore: Array<{ label: string; pct: number; cor: string }> = []
  if (currentScore?.components) {
    const colors = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171"]
    Object.entries(currentScore.components).forEach(([key, val], i) => {
      componentesScore.push({
        label: key.replace(/_/g, " "),
        pct: Math.min(100, Math.round(Number(val))),
        cor: colors[i % colors.length],
      })
    })
  }

  const scoreAtual = currentScore ? Number(currentScore.score) : null

  // Projeção mais recente
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
