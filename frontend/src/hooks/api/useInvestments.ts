/**
 * useInvestments.ts
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Investment {
  id: number
  user_id: number
  investment_type_id: number
  invested_value: number
  current_value: number        // calculado pelo backend
  interest_rate?: number
  maturity_date?: string
  application_date: string
  status: string
  transaction_id?: number
  finalidade?: string          // 'R.E' | 'Carro' | 'Apartamento' | null
  goal_id?: number
}

export interface InvestmentType {
  id: number
  description: string
  acronym: string
  fixed_income: boolean
}

export interface Income {
  id: number
  investment_id: number
  income_type_id: number
  income_date: string
  income_value: number
  ir_withheld?: number
}

export interface IncomeType {
  id: number
  description: string
  acronym?: string
}

export interface InvestmentCreate {
  investment_type_id: number
  invested_value: number
  application_date: string
  interest_rate?: number
  maturity_date?: string
  status?: string
  transaction_id?: number
  finalidade?: string
  goal_id?: number
}

export interface InvestmentUpdate {
  invested_value?: number
  interest_rate?: number
  maturity_date?: string
  status?: string
  finalidade?: string
  goal_id?: number
}

export interface IncomeCreate {
  investment_id: number
  income_type_id: number
  income_date: string
  income_value: number
  ir_withheld?: number
}

export interface InvestmentEnriched extends Investment {
  typeName: string
  typeAcronym: string
  isFixedIncome: boolean
  // Valores calculados a partir do current_value do backend
  currentValue: number     // = current_value do backend
  totalInvested: number    // = invested_value (principal puro)
  totalIncome: number      // = currentValue - totalInvested (rendimentos líquidos)
  rentabilidadePct: number // % de retorno sobre o principal
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const invKeys = {
  all:         ["investments"]      as const,
  types:       ["investment_types"] as const,
  incomes:     ["incomes"]          as const,
  incomeTypes: ["income_types"]     as const,
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const fetchInvestments     = async (): Promise<Investment[]>     => (await api.get(`${BASE}/investment/`)).data
const fetchInvestmentTypes = async (): Promise<InvestmentType[]> => (await api.get(`${BASE}/investment_type/`)).data
const fetchIncomes         = async (): Promise<Income[]>         => (await api.get(`${BASE}/income/`)).data
const fetchIncomeTypes     = async (): Promise<IncomeType[]>     => (await api.get(`${BASE}/income/types`)).data

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useInvestments() {
  const { data: investments = [],  isLoading: loadingInv }        = useQuery({ queryKey: invKeys.all,         queryFn: fetchInvestments })
  const { data: types = [],        isLoading: loadingTypes }       = useQuery({ queryKey: invKeys.types,       queryFn: fetchInvestmentTypes })
  const { data: incomes = [],      isLoading: loadingIncomes }     = useQuery({ queryKey: invKeys.incomes,     queryFn: fetchIncomes })
  const { data: incomeTypes = [],  isLoading: loadingIncomeTypes } = useQuery({ queryKey: invKeys.incomeTypes, queryFn: fetchIncomeTypes })

  const typeMap       = Object.fromEntries(types.map(t => [t.id, t]))
  const incomeTypeMap = Object.fromEntries(incomeTypes.map(t => [t.id, t]))

  // Agrupa events por investimento
  const eventsByInv: Record<number, Income[]> = {}
  for (const inc of incomes) {
    eventsByInv[inc.investment_id] = [...(eventsByInv[inc.investment_id] ?? []), inc]
  }

  const enriched: InvestmentEnriched[] = investments.map(inv => {
    const type         = typeMap[inv.investment_type_id]
    const currentValue = Number(inv.current_value ?? inv.invested_value)
    const totalInvested = Number(inv.invested_value)
    const totalIncome   = currentValue - totalInvested
    const rentabilidadePct = totalInvested > 0
      ? ((totalIncome) / totalInvested) * 100
      : 0

    return {
      ...inv,
      typeName:       type?.description  ?? "—",
      typeAcronym:    type?.acronym      ?? "?",
      isFixedIncome:  type?.fixed_income ?? false,
      currentValue,
      totalInvested,
      totalIncome,
      rentabilidadePct,
    }
  })

  const totalInvestido   = enriched.reduce((s, i) => s + i.totalInvested, 0)
  const totalAtual       = enriched.reduce((s, i) => s + i.currentValue, 0)
  const totalRendimentos = enriched.reduce((s, i) => s + i.totalIncome, 0)

  // Composição por finalidade (para gráfico)
  const composicaoPorFinalidade = enriched
    .filter(i => i.status === "ativo")
    .reduce<Record<string, number>>((acc, i) => {
      const key = i.finalidade ?? "Livre"
      acc[key] = (acc[key] ?? 0) + i.currentValue
      return acc
    }, {})

  return {
    investments: enriched,
    eventsByInv,
    incomeTypeMap,
    types,
    incomeTypes,
    totalInvestido,
    totalAtual,
    totalRendimentos,
    composicaoPorFinalidade,
    isLoading: loadingInv || loadingTypes || loadingIncomes || loadingIncomeTypes,
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateInvestment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: InvestmentCreate) => api.post(`${BASE}/investment/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.all }),
  })
}

export function useUpdateInvestment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InvestmentUpdate }) =>
      api.patch(`${BASE}/investment/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.all })
      qc.invalidateQueries({ queryKey: invKeys.incomes })
    },
  })
}

export function useDeleteInvestment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/investment/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.all })
      qc.invalidateQueries({ queryKey: invKeys.incomes })
    },
  })
}

export function useCreateIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: IncomeCreate) => api.post(`${BASE}/income/`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.incomes })
      qc.invalidateQueries({ queryKey: invKeys.all })   // atualiza current_value
    },
  })
}

export function useDeleteIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/income/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.incomes })
      qc.invalidateQueries({ queryKey: invKeys.all })
    },
  })
}