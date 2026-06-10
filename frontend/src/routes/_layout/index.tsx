import { createFileRoute } from "@tanstack/react-router"
import useAuth from "@/hooks/useAuth"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  AlertTriangle, ChevronRight, Landmark, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/hooks/api/useDashboard"
import { CineCard } from "@/components/Common/CineCard"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — FinanceOS" }] }),
})

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// ── Tooltip em vidro ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-numeric font-semibold">
          {p.name}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>
      {action && (
        <button type="button" className="flex items-center gap-0.5 text-xs text-primary transition-opacity hover:opacity-70">
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
}

// ── KPI card (CineCard + CountUp) ─────────────────────────────────────────────

function KpiCard({ label, value, delta, deltaUp, accentColor, icon: Icon, loading }: {
  label: string; value: number; delta: string; deltaUp: boolean
  accentColor: string; icon: React.ElementType; loading?: boolean
}) {
  return (
    <CineCard accent={accentColor} className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        <div
          className="flex size-7 items-center justify-center rounded-lg"
          style={{ background: `${accentColor}1f`, boxShadow: `0 0 14px -4px ${accentColor}` }}
        >
          <Icon size={13} style={{ color: accentColor }} />
        </div>
      </div>
      {loading ? (
        <div className="skeleton h-7 w-24" />
      ) : (
        <div className="text-lg font-semibold tracking-tight sm:text-xl">
          <CountUp value={value} format={fmtBRL} />
        </div>
      )}
      <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium",
        deltaUp ? "text-emerald-500" : "text-rose-400")}>
        {deltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {delta}
      </div>
    </CineCard>
  )
}

// ── Anel de score ─────────────────────────────────────────────────────────────

function ScoreRing({ score, size = "lg" }: { score: number; size?: "lg" | "sm" }) {
  const color = score >= 80 ? "var(--finance-green)" : score >= 60 ? "var(--finance-amber)" : "var(--finance-red)"
  const dims = size === "lg" ? "size-24 sm:size-28" : "size-20"
  return (
    <div className={cn("relative flex shrink-0 flex-col items-center justify-center", dims)}>
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--finance-green)" />
            <stop offset="100%" stopColor="var(--finance-cyan)" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="32" fill="none" stroke="var(--muted)" strokeWidth="7"
          strokeDasharray="100 100" pathLength="100" />
        <circle cx="40" cy="40" r="32" fill="none"
          stroke={score >= 60 ? "url(#scoreGrad)" : color} strokeWidth="7"
          strokeDasharray={`${Math.max(0, Math.min(100, score))} 100`} pathLength="100"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${score >= 60 ? "var(--glow-primary)" : color})` }}
        />
      </svg>
      <span className="font-numeric text-xl font-bold sm:text-2xl" style={{ color }}>
        <CountUp value={score} format={(v) => v.toFixed(0)} />
      </span>
      <span className="text-[10px] text-muted-foreground">/ 100</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Dashboard() {
  const { user: currentUser } = useAuth()
  const nome = currentUser?.full_name?.split(" ")[0] || currentUser?.email

  const {
    isLoading,
    patrimonio, totalReceitas, totalDespesas, totalInvestido, totalRendimentos,
    scoreAtual, cashflowData, patrimonioData, categoriaData, recentes, metasAtivas, anomalies,
  } = useDashboard()

  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6 sm:pb-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Visão geral"
        title={<>Olá, {nome}</>}
        subtitle={<>Resumo financeiro de <strong className="text-foreground">{mesAtual}</strong></>}
        action={
          scoreAtual !== null ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary glow-primary">
              <span className="status-dot size-1.5 rounded-full bg-primary" />
              Score: {scoreAtual} · {scoreAtual >= 80 ? "Excelente" : scoreAtual >= 60 ? "Bom" : "Atenção"}
            </span>
          ) : undefined
        }
      />

      {/* ── Hero: Patrimônio ────────────────────────────────────────────────── */}
      <CineCard accent="var(--finance-green)" className="animate-fade-up delay-1 p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Landmark size={12} className="text-primary" />
              Patrimônio total
            </p>
            {isLoading ? (
              <div className="skeleton mt-2 h-11 w-52" />
            ) : (
              <p className="text-gradient mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                <CountUp value={patrimonio} format={fmtBRL} duration={1400} />
              </p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Caixinhas + investimentos · acumulado
            </p>
          </div>

          {/* Rendimentos em destaque */}
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
              <TrendingUp size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rendimentos</p>
              <p className="font-numeric text-sm font-bold text-primary">
                {isLoading ? "—" : <>+<CountUp value={totalRendimentos} format={fmtBRL} /></>}
              </p>
            </div>
          </div>
        </div>
      </CineCard>

      {/* ── KPIs do mês ─────────────────────────────────────────────────────── */}
      <div className="stagger-children grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Receita" value={totalReceitas} delta="mês atual" deltaUp accentColor="#22d3ee" icon={ArrowUpRight} loading={isLoading} />
        <KpiCard label="Despesas" value={Math.abs(totalDespesas)} delta="mês atual" deltaUp={false} accentColor="#fb7185" icon={ArrowDownRight} loading={isLoading} />
        <KpiCard label="Investido" value={totalInvestido} delta={`+${fmtBRL(totalRendimentos)} rend.`} deltaUp accentColor="#a78bfa" icon={Landmark} loading={isLoading} />
      </div>

      {/* ── Patrimônio + Categorias ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <CineCard accent="var(--finance-green)" className="animate-fade-up delay-2 col-span-1 p-4 sm:p-5 lg:col-span-3">
          <SectionHeader title="Evolução do Patrimônio" />
          {isLoading ? (
            <div className="skeleton h-[180px]" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={patrimonioData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="patrimonioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                    <stop offset="55%" stopColor="#22d3ee" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="patrimonioStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#34d399", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="valor" name="Patrimônio"
                  stroke="url(#patrimonioStroke)" strokeWidth={2.5}
                  fill="url(#patrimonioGrad)" dot={false}
                  activeDot={{ r: 5, fill: "#34d399", stroke: "var(--card)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CineCard>

        <CineCard accent="var(--finance-cyan)" className="animate-fade-up delay-3 col-span-1 p-4 sm:p-5 lg:col-span-2">
          <SectionHeader title="Gastos por Categoria" />
          {isLoading ? (
            <div className="skeleton h-[130px]" />
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
                    <div className="size-2 shrink-0 rounded-sm" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                    <span className="font-numeric font-semibold">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CineCard>
      </div>

      {/* ── Fluxo + Transações ──────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <CineCard accent="var(--finance-cyan)" className="animate-fade-up delay-3 col-span-1 p-4 sm:p-5 lg:col-span-3">
          <SectionHeader title="Fluxo de Caixa — 6 meses" action="Relatório" />
          {isLoading ? (
            <div className="skeleton h-[170px]" />
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={cashflowData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
                <defs>
                  <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.45} />
                  </linearGradient>
                  <linearGradient id="despesaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="receita" name="Receita" fill="url(#receitaGrad)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="url(#despesaGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 flex gap-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2.5 rounded-sm bg-emerald-400" /> Receita</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-2.5 rounded-sm bg-rose-400" /> Despesa</span>
          </div>
        </CineCard>

        <CineCard accent="var(--finance-purple)" className="animate-fade-up delay-4 col-span-1 p-4 sm:p-5 lg:col-span-2">
          <SectionHeader title="Últimas Transações" action="Ver todas" />
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton size-8 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton h-2.5 w-16" />
                  </div>
                  <div className="skeleton h-3 w-16" />
                </div>
              ))}
            </div>
          ) : recentes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma transação encontrada.</p>
          ) : (
            <div className="stagger-children space-y-1">
              {recentes.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40"
                >
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
                  <span className={cn("font-numeric text-xs font-semibold",
                    Number(tx.transaction_value) > 0 ? "text-emerald-500" : "text-rose-400")}>
                    {Number(tx.transaction_value) > 0 ? "+" : ""}{fmtBRL(Number(tx.transaction_value))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CineCard>
      </div>

      {/* ── Metas + Saúde ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CineCard accent="var(--finance-amber)" className="animate-fade-up delay-5 p-4 sm:p-5">
          <SectionHeader title="Metas Financeiras" action="Gerenciar" />
          {isLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
          ) : metasAtivas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma meta ativa. Crie a sua primeira meta!</p>
          ) : (
            <div className="stagger-children space-y-4">
              {metasAtivas.slice(0, 4).map((m, i) => {
                const COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#fbbf24"]
                const cor = COLORS[i % COLORS.length]
                const pct = Number(m.target_value) > 0
                  ? Math.min(100, Math.round((Number(m.current_value) / Number(m.target_value)) * 100))
                  : 0
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-medium">{m.title}</span>
                        <span className="font-numeric ml-2 shrink-0 text-xs font-bold" style={{ color: cor }}>{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${cor}90, ${cor})`,
                            boxShadow: `0 0 8px ${cor}`,
                          }}
                        />
                      </div>
                      <p className="font-numeric mt-1 text-[11px] text-muted-foreground">
                        {fmtBRL(Number(m.current_value))} de {fmtBRL(Number(m.target_value))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CineCard>

        <CineCard accent="var(--finance-green)" className="animate-fade-up delay-6 p-4 sm:p-5">
          <SectionHeader title="Saúde Financeira" action="Ver análise" />
          {isLoading ? (
            <div className="skeleton h-32" />
          ) : scoreAtual === null ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Score não calculado para este mês ainda.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-5">
                <ScoreRing score={scoreAtual} />
                <div>
                  <p className="font-display text-base font-bold text-primary">
                    {scoreAtual >= 80 ? "Excelente" : scoreAtual >= 60 ? "Bom" : "Precisa melhorar"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pontuação geral do mês, com base nos seus 10 indicadores.
                  </p>
                </div>
              </div>
              {anomalies.filter(a => a.status === "ativo").length > 0 && (
                <div className="stagger-children space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Alertas</p>
                  {anomalies.filter(a => a.status === "ativo").slice(0, 2).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={13} />
                      <span className="flex-1">Desvio de {Math.abs(Number(a.deviation_percentage)).toFixed(0)}% detectado</span>
                      <span className="font-numeric font-bold">{Number(a.deviation_percentage) > 0 ? "+" : ""}{Number(a.deviation_percentage).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CineCard>
      </div>
    </div>
  )
}