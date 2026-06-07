// frontend/src/components/SpendingHeatmap.tsx
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { TransactionEnriched } from "@/hooks/api/useTransactions"

interface Props {
  transactions: TransactionEnriched[]
  month: number  // 0-indexed
  year: number
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function getIntensityClass(value: number, max: number): string {
  if (value === 0) return "bg-muted/40 text-muted-foreground/40"
  const ratio = value / max
  if (ratio < 0.2)  return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
  if (ratio < 0.4)  return "bg-yellow-500/25 text-yellow-400 border-yellow-500/20"
  if (ratio < 0.6)  return "bg-orange-500/30 text-orange-400 border-orange-500/25"
  if (ratio < 0.8)  return "bg-rose-500/35 text-rose-400 border-rose-500/25"
  return "bg-rose-500/60 text-rose-300 border-rose-500/40"
}

function getLegendLabel(ratio: number): string {
  if (ratio === 0) return "Sem gastos"
  if (ratio < 0.2) return "Muito baixo"
  if (ratio < 0.4) return "Baixo"
  if (ratio < 0.6) return "Moderado"
  if (ratio < 0.8) return "Alto"
  return "Muito alto"
}

export function SpendingHeatmap({ transactions, month, year }: Props) {
  // Agrupa gastos por dia do mês (só despesas = valor negativo)
  const { dailyTotals, maxSpend, daysInMonth, firstDayOfWeek, today } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfWeek = new Date(year, month, 1).getDay()
    const now = new Date()
    const today = now.getMonth() === month && now.getFullYear() === year
      ? now.getDate()
      : -1

    const dailyTotals: Record<number, { total: number; count: number; categories: Record<string, number> }> = {}

    for (let d = 1; d <= daysInMonth; d++) {
      dailyTotals[d] = { total: 0, count: 0, categories: {} }
    }

    for (const tx of transactions) {
      if (Number(tx.transaction_value) >= 0) continue // só despesas
      const date = new Date(tx.transaction_date)
      if (date.getMonth() !== month || date.getFullYear() !== year) continue
      const day = date.getDate()
      const abs = Math.abs(Number(tx.transaction_value))
      dailyTotals[day].total += abs
      dailyTotals[day].count += 1
      const cat = tx.categoryName ?? "Outros"
      dailyTotals[day].categories[cat] = (dailyTotals[day].categories[cat] ?? 0) + abs
    }

    const maxSpend = Math.max(...Object.values(dailyTotals).map(d => d.total), 1)

    return { dailyTotals, maxSpend, daysInMonth, firstDayOfWeek, today }
  }, [transactions, month, year])

  // Soma total do mês e dia com maior gasto
  const totalMes = Object.values(dailyTotals).reduce((s, d) => s + d.total, 0)
  const diasComGasto = Object.values(dailyTotals).filter(d => d.total > 0).length
  const diaMaisGasto = Object.entries(dailyTotals)
    .sort((a, b) => b[1].total - a[1].total)[0]

  // Células do calendário (vazias antes do dia 1 + dias do mês)
  const cells: Array<{ day: number | null }> = [
    ...Array(firstDayOfWeek).fill({ day: null }),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1 })),
  ]

  // Preenche para completar a última semana
  const remainder = cells.length % 7
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push({ day: null })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Heatmap de Gastos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Intensidade de despesas por dia
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Total do mês</p>
          <p className="text-sm font-bold text-rose-400">{fmtBRL(totalMes)}</p>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Dias com gasto", value: String(diasComGasto), color: "text-foreground" },
          {
            label: "Dia mais pesado",
            value: diaMaisGasto[1].total > 0 ? `Dia ${diaMaisGasto[0]}` : "—",
            color: "text-rose-400",
          },
          {
            label: "Pico do dia",
            value: diaMaisGasto[1].total > 0 ? fmtBRL(diaMaisGasto[1].total) : "—",
            color: "text-rose-400",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
            <p className={cn("text-xs font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="space-y-1.5">
        {/* Labels dos dias da semana */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Grid de células */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell.day) {
              return <div key={`empty-${idx}`} className="aspect-square rounded" />
            }

            const data = dailyTotals[cell.day]
            const intensityClass = getIntensityClass(data.total, maxSpend)
            const isToday = cell.day === today
            const topCat = Object.entries(data.categories)
              .sort((a, b) => b[1] - a[1])[0]

            return (
              <div
                key={cell.day}
                title={
                  data.total > 0
                    ? `Dia ${cell.day}: ${fmtBRL(data.total)} (${data.count} transaç${data.count > 1 ? "ões" : "ão"})${topCat ? `\n${topCat[0]}: ${fmtBRL(topCat[1])}` : ""}`
                    : `Dia ${cell.day}: sem gastos`
                }
                className={cn(
                  "aspect-square rounded border flex flex-col items-center justify-center cursor-default transition-all hover:scale-110 hover:z-10 relative",
                  "border-transparent",
                  intensityClass,
                  isToday && "ring-1 ring-primary ring-offset-1 ring-offset-card"
                )}
              >
                <span className="text-[10px] font-semibold leading-none">{cell.day}</span>
                {data.total > 0 && (
                  <span className="text-[7px] leading-none mt-0.5 opacity-80">
                    {fmtBRL(data.total).replace("R$\u00a0", "").replace(",00", "")}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] text-muted-foreground shrink-0">Intensidade:</span>
        <div className="flex gap-1 flex-1">
          {[0, 0.1, 0.35, 0.55, 0.75, 1].map((ratio, i) => (
            <div
              key={i}
              title={getLegendLabel(ratio)}
              className={cn(
                "h-3 flex-1 rounded-sm border border-transparent",
                getIntensityClass(ratio * maxSpend, maxSpend)
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground shrink-0">
          <span>Baixo</span>
          <span className="ml-1">Alto</span>
        </div>
      </div>
    </div>
  )
}