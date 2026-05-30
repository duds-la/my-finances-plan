import { createFileRoute } from "@tanstack/react-router"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"
import { Brain, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalyticsPage } from "@/hooks/api/useAnalytics"

export const Route = createFileRoute("/_layout/analise")({
  component: AnalisePage,
  head: () => ({ meta: [{ title: "Score & IA — FinanceOS" }] }),
})

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function AnalisePage() {
  const { scoreAtual, scoreHistorico, componentesScore, anomalies, projecaoAtual, isLoading } = useAnalyticsPage()

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 pb-24 sm:p-6 sm:pb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
      </div>
    )
  }

  const scoreLabel = scoreAtual === null ? "—"
    : scoreAtual >= 80 ? "Excelente"
    : scoreAtual >= 60 ? "Bom"
    : "Precisa melhorar"

  return (
    <div className="space-y-4 p-4 pb-24 sm:space-y-5 sm:p-6 sm:pb-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Score & Inteligência Financeira</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Análise automática do seu comportamento financeiro</p>
      </div>

      {/* Score + Componentes + Radar */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Score principal */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center justify-center gap-3">
          {scoreAtual === null ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 size={32} className="text-muted-foreground animate-spin" />
              <p className="text-xs text-muted-foreground text-center">Score não calculado para este mês.</p>
            </div>
          ) : (
            <>
              <div className="relative flex size-24 items-center justify-center sm:size-28">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90 w-full h-full">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="8" strokeDasharray="132 264" pathLength="264" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#4ade80" strokeWidth="8"
                    strokeDasharray={`${scoreAtual * 264 / 100} 264`} pathLength="264" strokeLinecap="round" />
                </svg>
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary sm:text-4xl">{scoreAtual}</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{scoreLabel}</p>
                <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-500 mt-1">
                  Saúde Financeira
                </span>
              </div>
            </>
          )}
        </div>

        {/* Componentes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Componentes</h2>
          {componentesScore.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem componentes disponíveis.</p>
          ) : (
            <div className="space-y-3">
              {componentesScore.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{item.label}</span>
                    <span className="font-semibold" style={{ color: item.cor }}>{item.pct}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.cor }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Radar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">Radar</h2>
          {componentesScore.length >= 3 ? (
            <ResponsiveContainer width="100%" height={170}>
              <RadarChart data={componentesScore.map(c => ({ subject: c.label.slice(0, 8), A: c.pct }))}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                <Radar name="Score" dataKey="A" stroke="#4ade80" fill="#4ade80" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Dados insuficientes para o radar.</p>
          )}
        </div>
      </div>

      {/* Histórico de score */}
      {scoreHistorico.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold">Evolução do Score</h2>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={scoreHistorico} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              <Line type="monotone" dataKey="score" name="Score" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 4, fill: "#4ade80", stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Anomalias */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold">Anomalias Detectadas</h2>
          </div>
          {anomalies.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma anomalia ativa. Suas finanças estão no padrão! 🎉</p>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3 text-xs border",
                    Number(a.deviation_percentage) > 20
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-500",
                  )}
                >
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Desvio detectado</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Esperado: {fmtBRL(Number(a.expected_value))} · Real: {fmtBRL(Number(a.real_value))}
                    </p>
                    <p className="text-[10px] mt-0.5 text-muted-foreground">
                      {new Date(a.detected_at).toLocaleDateString("pt-BR")} · Status: {a.status}
                    </p>
                  </div>
                  <span className="font-bold shrink-0">
                    {Number(a.deviation_percentage) > 0 ? "+" : ""}{Number(a.deviation_percentage).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projeção de saldo */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Brain size={15} className="text-violet-400" />
            <h2 className="text-sm font-semibold">Projeção de Saldo</h2>
          </div>
          {!projecaoAtual ? (
            <p className="text-xs text-muted-foreground">Nenhuma projeção disponível ainda.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Saldo Atual</p>
                  <p className="mt-1 text-base font-semibold text-emerald-500">{fmtBRL(Number(projecaoAtual.current_balance))}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Saldo Projetado</p>
                  <p className={cn("mt-1 text-base font-semibold",
                    Number(projecaoAtual.projected_balance) >= Number(projecaoAtual.current_balance)
                      ? "text-emerald-500" : "text-rose-400")}>
                    {fmtBRL(Number(projecaoAtual.projected_balance))}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Período: {projecaoAtual.period_days} dias · Gerado em {new Date(projecaoAtual.generated_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
