/**
 * useInvestments.ts
 *
 * Endpoints consumidos:
 *   GET  /api/v1/investment/               → lista investimentos do usuário
 *   GET  /api/v1/investment_type/          → lista tipos de investimento
 *   GET  /api/v1/income/                   → lista rendimentos
 *   POST /api/v1/investment/               → cria investimento
 *   PATCH /api/v1/investment/{id}          → atualiza
 *   DELETE /api/v1/investment/{id}         → remove
 *
 * Schemas relevantes:
 *   Investment_Schema_Response:
 *     id, user_id, investment_type_id, transaction_id?,
 *     invested_value (Decimal), interest_rate?, maturity_date?,
 *     application_date, status
 *
 *   Investment_Type_Response (inferido):
 *     id, acronym, description, daily_liquidity (bool), fixed_income (bool),
 *     ir_discount (Decimal)
 *
 *   Income_Schema_Response (rendimento):
 *     id, investment_id, income_type_id, income_date,
 *     income_value (Decimal), ir_withheld (Decimal)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvestmentType {
  id: number
  acronym: string
  description: string
  daily_liquidity: boolean
  fixed_income: boolean
  ir_discount?: number
}

export interface Investment {
  id: number
  user_id: number
  investment_type_id: number
  transaction_id?: number
  invested_value: number
  interest_rate?: number
  maturity_date?: string
  application_date: string
  status: string
}

export interface Income {
  id: number
  investment_id: number
  income_type_id: number
  income_date: string
  income_value: number
  ir_withheld: number
}

export interface InvestmentCreate {
  investment_type_id: number
  transaction_id?: number
  invested_value: number
  interest_rate?: number
  maturity_date?: string
  application_date: string
  status?: string
}

export interface InvestmentEnriched extends Investment {
  typeName: string
  typeAcronym: string
  isFixedIncome: boolean
  totalIncome: number  // soma dos rendimentos deste investimento
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const invKeys = {
  all: ["investments"] as const,
  types: ["investment_types"] as const,
  incomes: ["incomes"] as const,
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const fetchInvestments = async (): Promise<Investment[]> => {
  const { data } = await api.get(`${BASE}/investment/`)
  return data
}

const fetchInvestmentTypes = async (): Promise<InvestmentType[]> => {
  const { data } = await api.get(`${BASE}/investment_type/`)
  return data
}

const fetchIncomes = async (): Promise<Income[]> => {
  const { data } = await api.get(`${BASE}/income/`)
  return data
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useInvestments() {
  const { data: investments = [], isLoading: loadingInv } = useQuery({
    queryKey: invKeys.all,
    queryFn: fetchInvestments,
  })

  const { data: types = [], isLoading: loadingTypes } = useQuery({
    queryKey: invKeys.types,
    queryFn: fetchInvestmentTypes,
  })

  const { data: incomes = [], isLoading: loadingIncomes } = useQuery({
    queryKey: invKeys.incomes,
    queryFn: fetchIncomes,
  })

  const typeMap = Object.fromEntries(types.map((t) => [t.id, t]))

  // Agrupa rendimentos por investment_id
  const incomeByInv: Record<number, number> = {}
  for (const inc of incomes) {
    incomeByInv[inc.investment_id] =
      (incomeByInv[inc.investment_id] ?? 0) + Number(inc.income_value)
  }

  const enriched: InvestmentEnriched[] = investments.map((inv) => {
    const type = typeMap[inv.investment_type_id]
    return {
      ...inv,
      typeName: type?.description ?? "—",
      typeAcronym: type?.acronym ?? "?",
      isFixedIncome: type?.fixed_income ?? false,
      totalIncome: incomeByInv[inv.id] ?? 0,
    }
  })

  const totalInvestido = enriched.reduce((s, i) => s + Number(i.invested_value), 0)
  const totalRendimentos = Object.values(incomeByInv).reduce((s, v) => s + v, 0)

  // Composição por tipo para o gráfico de pizza
  const composicaoPorTipo = types
    .map((t) => {
      const total = enriched
        .filter((i) => i.investment_type_id === t.id)
        .reduce((s, i) => s + Number(i.invested_value), 0)
      return { name: t.description, acronym: t.acronym, total }
    })
    .filter((c) => c.total > 0)
    .map((c) => ({
      ...c,
      pct: totalInvestido > 0 ? Math.round((c.total / totalInvestido) * 100) : 0,
    }))

  return {
    investments: enriched,
    types,
    totalInvestido,
    totalRendimentos,
    composicaoPorTipo,
    isLoading: loadingInv || loadingTypes || loadingIncomes,
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateInvestment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: InvestmentCreate) =>
      api.post(`${BASE}/investment/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.all }),
  })
}

export function useDeleteInvestment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`${BASE}/investment/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.all }),
  })
}
