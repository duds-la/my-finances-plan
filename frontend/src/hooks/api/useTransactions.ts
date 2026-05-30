/**
 * useTransactions.ts
 *
 * Endpoints consumidos:
 *   GET  /api/v1/transaction/               → lista todas as transações do usuário
 *   GET  /api/v1/transaction_type/          → lista tipos (Entrada, Saída…)
 *   GET  /api/v1/transaction_category/      → lista categorias (Moradia, Alimentação…)
 *   POST /api/v1/transaction/               → cria transação
 *   PATCH /api/v1/transaction/{id}          → atualiza transação
 *   DELETE /api/v1/transaction/{id}         → remove transação
 *
 * Schemas relevantes do backend:
 *   Transaction_Schema_Response:
 *     id, user_id, transaction_value (Decimal), transaction_date (datetime),
 *     transaction_type_id (int), transaction_category_id (int)
 *
 *   Transaction_Category_Schema_Response:
 *     id, description, acronym (sigla ex: "ALM"), icon (emoji)
 *
 *   Transaction_Type_Response:
 *     id, description  (ex: "Entrada", "Saída", "Investimento")
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types (espelham os schemas Python) ────────────────────────────────────────

export interface TransactionType {
  id: number
  description: string
}

export interface TransactionCategory {
  id: number
  description: string
  acronym: string
  icon?: string
}

export interface Transaction {
  id: number
  user_id: number
  transaction_value: number
  transaction_date: string        // ISO datetime string
  transaction_type_id: number
  transaction_category_id: number
}

export interface TransactionCreate {
  transaction_value: number
  transaction_date?: string
  transaction_type_id: number
  transaction_category_id: number
}

export interface TransactionUpdate {
  transaction_value?: number
  transaction_date?: string
  transaction_type_id?: number
  transaction_category_id?: number
}

// ── Enriched type (junta type + category labels) ──────────────────────────────

export interface TransactionEnriched extends Transaction {
  typeName: string
  categoryName: string
  categoryIcon: string
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const txKeys = {
  all: ["transactions"] as const,
  types: ["transaction_types"] as const,
  categories: ["transaction_categories"] as const,
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data } = await api.get(`${BASE}/transaction/`)
  return data
}

const fetchTypes = async (): Promise<TransactionType[]> => {
  const { data } = await api.get(`${BASE}/transaction_type/`)
  return data
}

const fetchCategories = async (): Promise<TransactionCategory[]> => {
  const { data } = await api.get(`${BASE}/transaction_category/`)
  return data
}

// ── Icon fallback por sigla/descrição ─────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  SAL: "🏢", REC: "💰", ALU: "🏠", ALM: "🛒", TRN: "⛽",
  LAZ: "🎭", SAU: "💊", EDU: "📚", INV: "📈", OUT: "💳",
}

function getCategoryIcon(cat: TransactionCategory): string {
  return cat.icon ?? CATEGORY_ICONS[cat.acronym] ?? "💳"
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useTransactions() {
  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: txKeys.all,
    queryFn: fetchTransactions,
  })

  const { data: types = [], isLoading: loadingTypes } = useQuery({
    queryKey: txKeys.types,
    queryFn: fetchTypes,
  })

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: txKeys.categories,
    queryFn: fetchCategories,
  })

  const typeMap = Object.fromEntries(types.map((t) => [t.id, t.description]))
  const catMap = Object.fromEntries(
    categories.map((c) => [c.id, { name: c.description, icon: getCategoryIcon(c) }]),
  )

  const enriched: TransactionEnriched[] = transactions.map((tx) => ({
    ...tx,
    typeName: typeMap[tx.transaction_type_id] ?? "—",
    categoryName: catMap[tx.transaction_category_id]?.name ?? "—",
    categoryIcon: catMap[tx.transaction_category_id]?.icon ?? "💳",
  }))

  // Derivados para o Dashboard
  const totalReceitas = enriched
    .filter((t) => t.transaction_value > 0)
    .reduce((s, t) => s + Number(t.transaction_value), 0)

  const totalDespesas = enriched
    .filter((t) => t.transaction_value < 0)
    .reduce((s, t) => s + Number(t.transaction_value), 0)

  const saldo = totalReceitas + totalDespesas

  // 5 mais recentes para o widget do Dashboard
  const recentes = [...enriched]
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 5)

  return {
    transactions: enriched,
    recentes,
    types,
    categories,
    totalReceitas,
    totalDespesas,
    saldo,
    isLoading: loadingTx || loadingTypes || loadingCats,
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionCreate) =>
      api.post(`${BASE}/transaction/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: txKeys.all }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionUpdate }) =>
      api.patch(`${BASE}/transaction/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: txKeys.all }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`${BASE}/transaction/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: txKeys.all }),
  })
}
