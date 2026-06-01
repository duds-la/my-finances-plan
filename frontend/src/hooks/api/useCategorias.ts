import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TransactionType { id: number; description: string }
export interface TransactionTypeCreate { description: string }
export interface TransactionTypeUpdate { description?: string }

export interface TransactionCategory { id: number; description: string; acronym: string }
export interface TransactionCategoryCreate { description: string; acronym: string }
export interface TransactionCategoryUpdate { description?: string; acronym?: string }

export interface InvestmentType {
  id: number
  acronym: string
  description: string
  daily_liquidity: boolean
  fixed_income: boolean
  ir_discount?: number
}
export interface InvestmentTypeCreate {
  acronym: string
  description: string
  daily_liquidity?: boolean
  fixed_income?: boolean
  ir_discount?: number
}
export interface InvestmentTypeUpdate {
  acronym?: string
  description?: string
  daily_liquidity?: boolean
  fixed_income?: boolean
  ir_discount?: number
}

export interface IncomeType { id: number; description: string }
export interface IncomeTypeCreate { description: string }
export interface IncomeTypeUpdate { description?: string }

// ── Query keys ────────────────────────────────────────────────────────────────

export const catKeys = {
  txTypes:       ["transaction_types"]   as const,
  txCategories:  ["transaction_categories"] as const,
  invTypes:      ["investment_types"]    as const,
  incomeTypes:   ["income_types"]        as const,
}

// ── Transaction Types ─────────────────────────────────────────────────────────

export function useTransactionTypes() {
  return useQuery<TransactionType[]>({
    queryKey: catKeys.txTypes,
    queryFn: () => api.get(`${BASE}/transaction_type/`).then(r => r.data),
  })
}
export function useCreateTransactionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionTypeCreate) => api.post(`${BASE}/transaction_type/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.txTypes }),
  })
}
export function useUpdateTransactionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionTypeUpdate }) =>
      api.patch(`${BASE}/transaction_type/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.txTypes }),
  })
}
export function useDeleteTransactionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/transaction_type/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.txTypes }),
  })
}

// ── Transaction Categories ────────────────────────────────────────────────────

export function useTransactionCategories() {
  return useQuery<TransactionCategory[]>({
    queryKey: catKeys.txCategories,
    queryFn: () => api.get(`${BASE}/transaction_category/`).then(r => r.data),
  })
}
export function useCreateTransactionCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionCategoryCreate) => api.post(`${BASE}/transaction_category/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.txCategories }),
  })
}
export function useUpdateTransactionCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionCategoryUpdate }) =>
      api.patch(`${BASE}/transaction_category/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.txCategories }),
  })
}
export function useDeleteTransactionCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/transaction_category/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.txCategories }),
  })
}

// ── Investment Types ──────────────────────────────────────────────────────────

export function useInvestmentTypes() {
  return useQuery<InvestmentType[]>({
    queryKey: catKeys.invTypes,
    queryFn: () => api.get(`${BASE}/investment_type/`).then(r => r.data),
  })
}
export function useCreateInvestmentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: InvestmentTypeCreate) => api.post(`${BASE}/investment_type/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.invTypes }),
  })
}
export function useUpdateInvestmentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InvestmentTypeUpdate }) =>
      api.patch(`${BASE}/investment_type/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.invTypes }),
  })
}
export function useDeleteInvestmentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/investment_type/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.invTypes }),
  })
}

// ── Income Types ──────────────────────────────────────────────────────────────

export function useIncomeTypes() {
  return useQuery<IncomeType[]>({
    queryKey: catKeys.incomeTypes,
    queryFn: () => api.get(`${BASE}/income_type/`).then(r => r.data),
  })
}
export function useCreateIncomeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: IncomeTypeCreate) => api.post(`${BASE}/income_type/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.incomeTypes }),
  })
}
export function useUpdateIncomeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: IncomeTypeUpdate }) =>
      api.patch(`${BASE}/income_type/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.incomeTypes }),
  })
}
export function useDeleteIncomeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/income_type/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catKeys.incomeTypes }),
  })
}