import { createFileRoute } from "@tanstack/react-router"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { TrendingUp, Percent, DollarSign, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/investimentos")({
  component: InvestimentosPage,
  head: () => ({ meta: [{ title: "Investimentos — FinanceOS" }] }),
})

const portfolioHistorico = [
  { month: "Nov", valor: 18200 }, { month: "Dez", valor: 19800 },
  { month: "Jan", valor: 21500 }, { month: "Fev", valor: 20900 },
  { month: "Mar", valor: 23400 }, { month: "Abr", valor: 25100 },
  { month: "Mai", valor: 27320 },
]

const posicoes = [
  { nome: "Tesouro IPCA+ 2029", tipo: "Renda Fixa", valor: 12500, rendimento: 8.4, vencimento: "2029-01-01", cor: "#4ade80" },
  { nome: "CDB Banco Inter 115% CDI", tipo: "Renda Fixa", valor: 8000, rendimento: 11.2, vencimento: "2027-06-01", cor: "#22d3ee" },
  { nome: "IVVB11 (S&P 500)", tipo: "Renda Variável", valor: 4200, rendimento: 14.8, vencimento: null, cor: "#a78bfa" },
  { nome: "MXRF11 (FII)", tipo: "Fundos Imob.", valor: 1820, rendimento: 9.1, vencimento: null, cor: "#fbbf24" },
  { nome: "Poupança Reserva", tipo: "Poupança", valor: 800, rendimento: 6.2, vencimento: null, cor: "#f87171" },
]

const composicao = [
  { name: "Renda Fixa", value: 75, cor: "#4ade80" },
  { name: "Renda Variável", value: 15, cor: "#a78bfa" },
  { name: "Fundos Imob.", value: 7, cor: "#fbbf24" },
  { name: "Poupança", value: 3, cor: "#f87171" },
]

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

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

function InvestimentosPage() {
  const totalInvestido = posicoes.reduce((s, p) => s + p.valor, 0)
  const rendimentoMedio = posicoes.reduce((s, p) => s + p.rendimento * (p.valor / totalInvestido), 0)

  return (
    <div className="space-y-4 p-4 pb-24 sm:space-y-5 sm:p-6 sm:pb-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Investimentos</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{posicoes.length} posições ativas</p>
      </div>

      {/* KPIs — 2x2 no mobile */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Patrimônio", value: fmtBRL(totalInvestido), icon: DollarSign, color: "#4ade80" },
          { label: "Rend. Médio", value: `${rendimentoMedio.toFixed(1)}% a.a.`, icon: Percent, color: "#22d3ee" },
          { label: "Rend. Mês", value: fmtBRL(320), icon: TrendingUp, color: "#a78bfa" },
          { label: "Próx. Vencto.", value: "Jun 2027", icon: Clock, color: "#fbbf24" },
        ].map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ background: k.color }} />
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <div className="flex size-6 items-center justify-center rounded-md sm:size-7" style={{ background: `${k.color}20` }}>
                <k.icon size={12} style={{ color: k.color }} />
              </div>
            </div>
            <p className="text-base font-semibold sm:text-xl">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico + Composição */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold">Evolução do Portfólio</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={portfolioHistorico} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#a78bfa", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="valor" name="Portfólio" stroke="#a78bfa" strokeWidth={2.5} fill="url(#portfolioGrad)" dot={false} activeDot={{ r: 5, fill: "#a78bfa", stroke: "var(--card)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold">Composição</h2>
          {/* No mobile: inline */}
          <div className="flex items-center gap-4 sm:flex-col sm:items-center">
            <PieChart width={90} height={90} style={{ flexShrink: 0 }}>
              <Pie data={composicao} cx={40} cy={40} innerRadius={26} outerRadius={43} paddingAngle={3} dataKey="value">
                {composicao.map((entry) => (
                  <Cell key={entry.name} fill={entry.cor} stroke="none" />
                ))}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-2 sm:w-full">
              {composicao.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="size-2 shrink-0 rounded-sm" style={{ background: c.cor }} />
                  <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                  <span className="font-semibold">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Posições — cards no mobile */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Posições</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {posicoes.map((p) => (
            <div key={p.nome} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 active:bg-muted/30">
              <div className="size-2.5 shrink-0 rounded-full" style={{ background: p.cor }} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.tipo}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{fmtBRL(p.valor)}</p>
                <p className={cn("text-xs font-medium", p.rendimento >= 8 ? "text-emerald-500" : "text-amber-500")}>
                  {p.rendimento}% a.a.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
