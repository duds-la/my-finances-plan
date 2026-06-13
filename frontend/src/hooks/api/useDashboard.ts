/**
 * useDashboard.ts
 */
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTransactions } from "./useTransactions"
import { useInvestments } from "./useInvestments"
import { useGoals } from "./useGoals"
import { useCurrentMonthScore, useAnomalies } from "./useAnalytics"
import { api, BASE } from "@/lib/api"

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                     "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// ── Hook para total das caixinhas ─────────────────────────────────────────────

function useTotalReservado() {
  const now = new Date()

  // Próximo mês (com virada de ano)
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = next.getMonth() + 1
  const nextYear  = next.getFullYear()

  // Mês atual (fallback)
  const curMonth = now.getMonth() + 1
  const curYear  = now.getFullYear()

  return useQuery<number>({
    queryKey: ["category_reserves", "patrimonio", nextMonth, nextYear],
    queryFn: async () => {
      const { data: nextData } = await api.get(
        `${BASE}/category_reserve/summary?month=${nextMonth}&year=${nextYear}`
      )

      // Próximo mês tem caixinhas → usa o reservado bruto dele
      if (Array.isArray(nextData.reserves) && nextData.reserves.length > 0) {
        return nextData.total_reserved ?? 0
      }

      // Fallback: mês atual
      const { data: curData } = await api.get(
        `${BASE}/category_reserve/summary?month=${curMonth}&year=${curYear}`
      )
      return curData.total_reserved ?? 0
    },
  })
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useDashboard() {
  const { transactions, recentes, totalReceitas, totalDespesas, isLoading: loadTx } = useTransactions()
  const { totalInvestido, totalRendimentos, isLoading: loadInv } = useInvestments()
  const { ativas: metasAtivas, isLoading: loadGoals } = useGoals()
  const { data: currentScore, isLoading: loadScore } = useCurrentMonthScore()
  const { data: anomalies = [], isLoading: loadAnomaly } = useAnomalies()
  const { data: totalReservado = 0, isLoading: loadReservas } = useTotalReservado()

  const isLoading = loadTx || loadInv || loadGoals || loadScore || loadAnomaly || loadReservas

  // ── Fluxo de caixa por mês (últimos 6 meses) ─────────────────────────────

  const cashflowData = useMemo(() => {
    const now = new Date()
    const months: Array<{ month: string; receita: number; despesa: number }> = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()

      const monthTx = transactions.filter((tx) => {
        const txDate = new Date(tx.transaction_date)
        return txDate.getMonth() === m && txDate.getFullYear() === y
      })

      const receita = monthTx
        .filter((tx) => Number(tx.transaction_value) > 0)
        .reduce((s, tx) => s + Number(tx.transaction_value), 0)

      const despesa = monthTx
        .filter((tx) => Number(tx.transaction_value) < 0)
        .reduce((s, tx) => s + Math.abs(Number(tx.transaction_value)), 0)

      months.push({ month: MONTH_NAMES[m], receita, despesa })
    }

    return months
  }, [transactions])

  // ── Patrimônio acumulado por mês ─────────────────────────────────────────

  const patrimonioData = useMemo(() => {
    const now = new Date()
    let acumulado = 0
    const months: Array<{ month: string; valor: number }> = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()

      const monthTx = transactions.filter((tx) => {
        const txDate = new Date(tx.transaction_date)
        return txDate.getMonth() === m && txDate.getFullYear() === y
      })

      const netMonth = monthTx.reduce((s, tx) => s + Number(tx.transaction_value), 0)
      acumulado += netMonth

      months.push({ month: MONTH_NAMES[m], valor: acumulado + totalInvestido })
    }

    return months
  }, [transactions, totalInvestido])

  // ── Gastos por categoria (mês corrente) ──────────────────────────────────

  const categoriaData = useMemo(() => {
    const now = new Date()
    const despesasMes = transactions.filter((tx) => {
      const txDate = new Date(tx.transaction_date)
      return (
        Number(tx.transaction_value) < 0 &&
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      )
    })

    const byCat: Record<string, { name: string; icon: string; total: number }> = {}
    for (const tx of despesasMes) {
      const key = tx.categoryName
      if (!byCat[key]) byCat[key] = { name: tx.categoryName, icon: tx.categoryIcon, total: 0 }
      byCat[key].total += Math.abs(Number(tx.transaction_value))
    }

    const totalDespMes = Object.values(byCat).reduce((s, c) => s + c.total, 0)
    const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171"]

    return Object.values(byCat)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((c, i) => ({
        ...c,
        color: COLORS[i % COLORS.length],
        value: totalDespMes > 0 ? Math.round((c.total / totalDespMes) * 100) : 0,
        valor: c.total,
      }))
  }, [transactions])

  // ── KPIs ─────────────────────────────────────────────────────────────────
  //
  // Patrimônio real = caixinhas (dinheiro guardado por categoria)
  //                 + investimentos (CDBs e outros)
  //
  // Não usa totalReceitas - totalDespesas porque isso reflete só o fluxo
  // de caixa das transações, sem representar o que está efetivamente guardado.
  //
  const patrimonio = totalReservado + totalInvestido

  const scoreAtual = currentScore ? Number(currentScore.score) : null

  return {
    isLoading,
    patrimonio,
    totalReservado,
    totalReceitas,
    totalDespesas,
    totalInvestido,
    totalRendimentos,
    scoreAtual,
    cashflowData,
    patrimonioData,
    categoriaData,
    recentes,
    metasAtivas,
    anomalies,
  }
}