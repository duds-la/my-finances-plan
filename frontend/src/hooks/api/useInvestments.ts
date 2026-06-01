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

export interface IncomeCreate {
  investment_id: number
  income_type_id: number
  income_date: string
  income_value: number   // positivo = rendimento, negativo = resgate
  ir_withheld?: number
}

export interface InvestmentEnriched extends Investment {
  typeName: string
  typeAcronym: string
  isFixedIncome: boolean
  totalIncome: number
  // valor atual = invested_value + totalIncome (resgates negativos já reduzem)
  currentValue: number
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const invKeys = {
  all:     ["investments"] as const,
  types:   ["investment_types"] as const,
  incomes: ["incomes"] as const,
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const fetchInvestments  = async (): Promise<Investment[]>     => (await api.get(`${BASE}/investment/`)).data
const fetchInvestmentTypes = async (): Promise<InvestmentType[]> => (await api.get(`${BASE}/investment_type/`)).data
const fetchIncomes      = async (): Promise<Income[]>         => (await api.get(`${BASE}/income/`)).data

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useInvestments() {
  const { data: investments = [], isLoading: loadingInv }    = useQuery({ queryKey: invKeys.all,     queryFn: fetchInvestments })
  const { data: types = [],       isLoading: loadingTypes }  = useQuery({ queryKey: invKeys.types,   queryFn: fetchInvestmentTypes })
  const { data: incomes = [],     isLoading: loadingIncomes } = useQuery({ queryKey: invKeys.incomes, queryFn: fetchIncomes })

  const typeMap = Object.fromEntries(types.map(t => [t.id, t]))

  // Agrupa todos os eventos (rendimentos + resgates) por investment_id
  const incomeByInv: Record<number, number> = {}
  const eventsByInv: Record<number, Income[]> = {}
  for (const inc of incomes) {
    incomeByInv[inc.investment_id]  = (incomeByInv[inc.investment_id]  ?? 0) + Number(inc.income_value)
    eventsByInv[inc.investment_id]  = [...(eventsByInv[inc.investment_id] ?? []), inc]
  }

  const enriched: InvestmentEnriched[] = investments.map(inv => {
    const type        = typeMap[inv.investment_type_id]
    const totalIncome = incomeByInv[inv.id] ?? 0
    return {
      ...inv,
      typeName:     type?.description ?? "—",
      typeAcronym:  type?.acronym     ?? "?",
      isFixedIncome: type?.fixed_income ?? false,
      totalIncome,
      currentValue: Number(inv.invested_value) + totalIncome,
    }
  })

  const totalInvestido   = enriched.reduce((s, i) => s + Number(i.invested_value), 0)
  const totalRendimentos = enriched.reduce((s, i) => s + i.totalIncome, 0)

  const composicaoPorTipo = types
    .map(t => {
      const total = enriched.filter(i => i.investment_type_id === t.id).reduce((s, i) => s + i.currentValue, 0)
      return { name: t.description, acronym: t.acronym, total }
    })
    .filter(c => c.total > 0)
    .map(c => ({ ...c, pct: totalInvestido > 0 ? Math.round((c.total / totalInvestido) * 100) : 0 }))

  return {
    investments: enriched,
    eventsByInv,
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
    mutationFn: (data: InvestmentCreate) => api.post(`${BASE}/investment/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.all }),
  })
}

export function useDeleteInvestment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/investment/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.all }),
  })
}

export function useCreateIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: IncomeCreate) => api.post(`${BASE}/income/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.incomes }),
  })
}

export function useDeleteIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/income/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.incomes }),
  })
}