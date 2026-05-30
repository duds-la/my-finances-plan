/**
 * useGoals.ts
 *
 * Endpoints consumidos:
 *   GET  /api/v1/financial_goal/            → lista metas do usuário
 *   POST /api/v1/financial_goal/            → cria meta
 *   PATCH /api/v1/financial_goal/{id}       → atualiza meta
 *   DELETE /api/v1/financial_goal/{id}      → remove meta
 *   POST /api/v1/goal_contribution/         → registra aporte numa meta
 *   GET  /api/v1/goal_contribution/goal/{goal_id} → aportes de uma meta
 *
 * Schemas relevantes:
 *   Financial_Goal_Schema_Response:
 *     id, user_id, title, target_value (Decimal), current_value (Decimal),
 *     deadline (date|null), status ("em_andamento"|"concluida"|"cancelada"),
 *     suggested_contribution (Decimal|null)
 *
 *   Goal_Contribution_Schema_Response:
 *     id, goal_id, transaction_id?, value (Decimal), contribution_date (datetime)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinancialGoal {
  id: number
  user_id: number
  title: string
  target_value: number
  current_value: number
  deadline?: string
  status: string
  suggested_contribution?: number
}

export interface GoalCreate {
  title: string
  target_value: number
  current_value?: number
  deadline?: string
  status?: string
  suggested_contribution?: number
}

export interface GoalUpdate {
  title?: string
  target_value?: number
  current_value?: number
  deadline?: string
  status?: string
  suggested_contribution?: number
}

export interface GoalContribution {
  id: number
  goal_id: number
  transaction_id?: number
  value: number
  contribution_date: string
}

export interface ContributionCreate {
  goal_id: number
  transaction_id?: number
  value: number
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const goalKeys = {
  all: ["financial_goals"] as const,
  contributions: (goalId: number) => ["goal_contributions", goalId] as const,
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useGoals() {
  const { data: goals = [], isLoading } = useQuery({
    queryKey: goalKeys.all,
    queryFn: async (): Promise<FinancialGoal[]> => {
      const { data } = await api.get(`${BASE}/financial_goal/`)
      return data
    },
  })

  const ativas = goals.filter((g) => g.status === "em_andamento")
  const concluidas = goals.filter((g) => g.status === "concluida")
  const canceladas = goals.filter((g) => g.status === "cancelada")

  const totalAlvo = ativas.reduce((s, g) => s + Number(g.target_value), 0)
  const totalAtual = ativas.reduce((s, g) => s + Number(g.current_value), 0)
  const progressoGeral = totalAlvo > 0 ? Math.round((totalAtual / totalAlvo) * 100) : 0

  return { goals, ativas, concluidas, canceladas, totalAlvo, totalAtual, progressoGeral, isLoading }
}

// ── Hook para aportes de uma meta específica ──────────────────────────────────

export function useGoalContributions(goalId: number) {
  return useQuery({
    queryKey: goalKeys.contributions(goalId),
    queryFn: async (): Promise<GoalContribution[]> => {
      const { data } = await api.get(`${BASE}/goal_contribution/goal/${goalId}`)
      return data
    },
    enabled: goalId > 0,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GoalCreate) =>
      api.post(`${BASE}/financial_goal/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GoalUpdate }) =>
      api.patch(`${BASE}/financial_goal/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`${BASE}/financial_goal/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  })
}

export function useAddContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContributionCreate) =>
      api.post(`${BASE}/goal_contribution/`, data).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: goalKeys.all })
      qc.invalidateQueries({ queryKey: goalKeys.contributions(vars.goal_id) })
    },
  })
}
