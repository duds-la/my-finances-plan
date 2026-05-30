/**
 * useDashboard.ts
 *
 * Agrega dados dos quatro módulos para compor o Dashboard principal.
 * Não faz requisições extras — reutiliza os hooks existentes.
 *
 * Dados entregues:
 *   - KPIs: saldo, receitas, despesas, total investido
 *   - Gráfico patrimônio: combina saldo + investimentos ao longo do tempo
 *     (usa transações agrupadas por mês)
 *   - Gráfico fluxo de caixa: receitas vs despesas por mês (últimos 6)
 *   - Gastos por categoria: top categorias do mês corrente
 *   - Score: do mês atual (via useCurrentMonthScore)
 *   - Últimas transações: 5 mais recentes
 *   - Metas ativas: progresso
 */
import { useMemo } from "react"
import { useTransactions } from "./useTransactions"
import { useInvestments } from "./useInvestments"
import { useGoals } from "./useGoals"
import { useCurrentMonthScore, useAnomalies } from "./useAnalytics"

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                     "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export function useDashboard() {
  const { transactions, recentes, totalReceitas, totalDespesas, isLoading: loadTx } = useTransactions()
  const { totalInvestido, totalRendimentos, isLoading: loadInv } = useInvestments()
  const { ativas: metasAtivas, isLoading: loadGoals } = useGoals()
  const { data: currentScore, isLoading: loadScore } = useCurrentMonthScore()
  const { data: anomalies = [], isLoading: loadAnomaly } = useAnomalies()

  const isLoading = loadTx || loadInv || loadGoals || loadScore || loadAnomaly

  // ── Fluxo de caixa por mês (últimos 6 meses) ──────────────────────────────

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

  // ── Patrimônio acumulado por mês (receitas - despesas cumulativo) ─────────

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

  // ── Gastos por categoria (mês corrente) ───────────────────────────────────

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

  // ── Score atual ───────────────────────────────────────────────────────────

  const scoreAtual = currentScore ? Number(currentScore.score) : null

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const patrimonio = totalReceitas + totalDespesas + totalInvestido

  return {
    isLoading,
    // KPIs
    patrimonio,
    totalReceitas,
    totalDespesas,
    totalInvestido,
    totalRendimentos,
    scoreAtual,
    // Charts
    cashflowData,
    patrimonioData,
    categoriaData,
    // Listas
    recentes,
    metasAtivas,
    anomalies,
  }
}
