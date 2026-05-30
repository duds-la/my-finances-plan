import { createFileRoute } from "@tanstack/react-router"
import useAuth from "@/hooks/useAuth"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  Target, AlertTriangle, ChevronRight, Landmark, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/hooks/api/useDashboard"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — FinanceOS" }] }),
})

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {action && (
        <button type="button" className="flex items-center gap-0.5 text-xs text-primary hover:opacity-70">
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
}

function KpiCard({ label, value, delta, deltaUp, accentColor, icon: Icon, loading }: {
  label: string; value: string; delta: string; deltaUp: boolean
  accentColor: string; icon: React.ElementType; loading?: boolean
}) {
  return (
    <div className="animate-fade-up relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ background: accentColor }} />
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: `${accentColor}18` }}>
          <Icon size={13} style={{ color: accentColor }} />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <div className="text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      )}
      <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium",
        deltaUp ? "text-emerald-500" : "text-rose-500")}>
        {deltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {delta}
      </div>
    </div>
  )
}

function Dashboard() {
  const { user: currentUser } = useAuth()
  const nome = currentUser?.full_name?.split(" ")[0] || currentUser?.email

  const {
    isLoading,
    patrimonio, totalReceitas, totalDespesas, totalInvestido, totalRendimentos,
    scoreAtual, cashflowData, patrimonioData, categoriaData, recentes, metasAtivas, anomalies,
  } = useDashboard()

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Olá, {nome} 👋</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Resumo financeiro de <strong>{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong>
          </p>
        </div>
        {scoreAtual !== null && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Score: {scoreAtual} · {scoreAtual >= 80 ? "Excelente" : scoreAtual >= 60 ? "Bom" : "Atenção"}
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Patrimônio" value={fmtBRL(patrimonio)} delta="acumulado" deltaUp={patrimonio >= 0} accentColor="#4ade80" icon={Wallet} loading={isLoading} />
        <KpiCard label="Receita" value={fmtBRL(totalReceitas)} delta="mês atual" deltaUp accentColor="#22d3ee" icon={ArrowUpRight} loading={isLoading} />
        <KpiCard label="Despesas" value={fmtBRL(Math.abs(totalDespesas))} delta="mês atual" deltaUp={false} accentColor="#f87171" icon={ArrowDownRight} loading={isLoading} />
        <KpiCard label="Investido" value={fmtBRL(totalInvestido)} delta={`+${fmtBRL(totalRendimentos)} rend.`} deltaUp accentColor="#a78bfa" icon={Landmark} loading={isLoading} />
      </div>

      {/* Patrimônio + Categorias */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-3">
          <SectionHeader title="Evolução do Patrimônio" />
          {isLoading ? (
            <div className="h-[180px] animate-pulse rounded-lg bg-muted" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={patrimonioData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="patrimonioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#4ade80", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="valor" name="Patrimônio" stroke="#4ade80" strokeWidth={2.5} fill="url(#patrimonioGrad)" dot={false} activeDot={{ r: 5, fill: "#4ade80", stroke: "var(--card)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
          <SectionHeader title="Gastos por Categoria" />
          {isLoading ? (
            <div className="h-[130px] animate-pulse rounded-lg bg-muted" />
          ) : categoriaData.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem despesas no mês atual.</p>
          ) : (
            <div className="flex items-center gap-4">
              <PieChart width={90} height={90} style={{ flexShrink: 0 }}>
                <Pie data={categoriaData} cx={40} cy={40} innerRadius={26} outerRadius={42} paddingAngle={2} dataKey="value">
                  {categoriaData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
              <div className="flex-1 space-y-1.5">
                {categoriaData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <div className="size-2 shrink-0 rounded-sm" style={{ background: c.color }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                    <span className="font-semibold">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fluxo + Transações */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-3">
          <SectionHeader title="Fluxo de Caixa — 6 meses" action="Relatório" />
          {isLoading ? (
            <div className="h-[170px] animate-pulse rounded-lg bg-muted" />
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={cashflowData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="receita" name="Receita" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="#f87171" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 flex gap-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2.5 rounded-sm bg-emerald-400" /> Receita</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2.5 rounded-sm bg-rose-400" /> Despesa</span>
          </div>
        </div>

        <div className="col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
          <SectionHeader title="Últimas Transações" action="Ver todas" />
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : recentes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma transação encontrada.</p>
          ) : (
            <div className="space-y-3">
              {recentes.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-sm",
                    Number(tx.transaction_value) > 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                    {tx.categoryIcon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{tx.categoryName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(tx.transaction_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {tx.typeName}
                    </p>
                  </div>
                  <span className={cn("text-xs font-semibold",
                    Number(tx.transaction_value) > 0 ? "text-emerald-500" : "text-rose-400")}>
                    {Number(tx.transaction_value) > 0 ? "+" : ""}{fmtBRL(Number(tx.transaction_value))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metas + Score */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <SectionHeader title="Metas Financeiras" action="Gerenciar" />
          {isLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : metasAtivas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma meta ativa. Crie a sua primeira meta!</p>
          ) : (
            <div className="space-y-4">
              {metasAtivas.slice(0, 4).map((m, i) => {
                const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24"]
                const cor = COLORS[i % COLORS.length]
                const pct = Number(m.target_value) > 0
                  ? Math.min(100, Math.round((Number(m.current_value) / Number(m.target_value)) * 100))
                  : 0
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-medium">{m.title}</span>
                        <span className="ml-2 shrink-0 text-xs font-bold" style={{ color: cor }}>{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cor }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {fmtBRL(Number(m.current_value))} de {fmtBRL(Number(m.target_value))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <SectionHeader title="Saúde Financeira" action="Ver análise" />
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          ) : scoreAtual === null ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Loader2 size={24} className="text-muted-foreground animate-spin" />
              <p className="text-xs text-muted-foreground">Score não calculado para este mês ainda.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex size-20 shrink-0 flex-col items-center justify-center sm:size-24">
                  <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--muted)" strokeWidth="7" strokeDasharray="100 100" pathLength="100" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#4ade80" strokeWidth="7"
                      strokeDasharray={`${scoreAtual * 0.75} ${100}`} pathLength="100" strokeLinecap="round" />
                  </svg>
                  <span className="text-xl font-bold text-primary sm:text-2xl">{scoreAtual}</span>
                  <span className="text-[10px] text-muted-foreground">/ 100</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {scoreAtual >= 80 ? "Excelente" : scoreAtual >= 60 ? "Bom" : "Precisa melhorar"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Índice: {((Number(1) - Number(0)) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              {anomalies.filter(a => a.status === "ativo").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alertas</p>
                  {anomalies.filter(a => a.status === "ativo").slice(0, 2).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={13} />
                      <span className="flex-1">Desvio de {Math.abs(Number(a.deviation_percentage)).toFixed(0)}% detectado</span>
                      <span className="font-bold">{Number(a.deviation_percentage) > 0 ? "+" : ""}{Number(a.deviation_percentage).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
