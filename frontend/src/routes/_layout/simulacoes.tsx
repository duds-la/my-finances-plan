import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import {
  Plus, Trash2, ChevronDown, ChevronUp, Loader2,
  Calculator, TrendingUp, Target, X, Sparkles,
  CreditCard, Flame, BadgeDollarSign, Home,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSimulations, useCreateSimulation, useDeleteSimulation } from "@/hooks/api/useSimulations"
import type { Simulation } from "@/hooks/api/useSimulations"

export const Route = createFileRoute("/_layout/simulacoes")({
  component: SimulacoesPage,
  head: () => ({ meta: [{ title: "Simulações — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })

const fmtBRLShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$\u00a0${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `R$\u00a0${(v / 1_000).toFixed(0)}k`
  return fmtBRL(v)
}

const TIPOS: Record<string, { label: string; icon: React.ElementType; cor: string; descricao: string }> = {
  juros_compostos: {
    label: "Juros Compostos",
    icon: TrendingUp,
    cor: "#4ade80",
    descricao: "Evolução de capital com aportes mensais",
  },
  prazo_meta: {
    label: "Prazo para Meta",
    icon: Target,
    cor: "#a78bfa",
    descricao: "Quando você atingirá um objetivo financeiro",
  },
  comparacao_investimento: {
    label: "Comparação de Taxas",
    icon: Calculator,
    cor: "#22d3ee",
    descricao: "Compare dois investimentos lado a lado",
  },
  parcelamento: {
    label: "Simulação de Parcelamento",
    icon: CreditCard,
    cor: "#fb923c",
    descricao: "Custo real de uma compra parcelada com juros",
  },
  independencia_financeira: {
    label: "Independência Financeira",
    icon: Flame,
    cor: "#f43f5e",
    descricao: "Quanto acumular para viver de renda passiva",
  },
  inflacao: {
    label: "Erosão pela Inflação",
    icon: BadgeDollarSign,
    cor: "#facc15",
    descricao: "Poder de compra real de um valor ao longo do tempo",
  },
  financiamento: {
    label: "Simulador de Financiamento",
    icon: Home,
    cor: "#818cf8",
    descricao: "Custo real e taxa implícita de um financiamento",
  },
}

// Labels amigáveis para parâmetros e resultados
const PARAM_LABELS: Record<string, string> = {
  principal:          "Capital inicial",
  taxa_mensal:        "Taxa mensal",
  meses:              "Período",
  aporte_mensal:      "Aporte mensal",
  valor_alvo:         "Valor alvo",
  valor_atual:        "Já tenho",
  taxa_a:             "Taxa A",
  taxa_b:             "Taxa B",
  valor_compra:       "Valor da compra",
  num_parcelas:       "Nº de parcelas",
  taxa_juros_mensal:  "Taxa de juros mensal",
  entrada:            "Entrada",
  gasto_mensal:       "Gasto mensal desejado",
  taxa_rendimento:    "Taxa de rendimento mensal",
  taxa_saque:         "Taxa de saque anual (regra)",
  valor_presente:     "Valor hoje",
  taxa_inflacao:      "Taxa de inflação anual",
  anos:               "Período (anos)",
  valor_imovel:       "Valor do imóvel / bem",
  valor_entrada:      "Valor da entrada",
  valor_parcela:      "Valor da parcela mensal",
  num_parcelas_fin:   "Nº de parcelas",
}

const RESULT_LABELS: Record<string, string> = {
  montante_final:       "Montante final",
  total_investido:      "Total investido",
  juros_ganhos:         "Juros ganhos",
  meses_total:          "Meses até a meta",
  anos:                 "Anos",
  meses_restantes:      "Meses restantes",
  saldo_final:          "Saldo final",
  total_aportado:       "Total aportado",
  montante_a:           "Resultado Taxa A",
  montante_b:           "Resultado Taxa B",
  diferenca:            "Diferença",
  melhor:               "Melhor opção",
  rendimento_a:         "Rendimento A",
  rendimento_b:         "Rendimento B",
  parcela_mensal:       "Parcela mensal",
  total_pago:           "Total pago",
  juros_totais:         "Juros totais",
  custo_efetivo:        "Custo efetivo (%)",
  patrimonio_necessario:"Patrimônio necessário",
  tempo_acumulacao:     "Tempo para acumular",
  aporte_sugerido:      "Aporte mensal sugerido",
  renda_passiva:        "Renda passiva mensal",
  valor_futuro:         "Valor futuro nominal",
  valor_real:           "Valor em poder de compra atual",
  perda_poder_compra:   "Perda de poder de compra",
  equivalente_hoje:     "Equivale hoje a",
  valor_financiado:     "Valor financiado",
  total_pago_fin:       "Total pago",
  juros_totais_fin:     "Total de juros",
  taxa_mensal_impl:     "Taxa mensal implícita",
  taxa_anual_impl:      "Taxa anual implícita (a.a.)",
  custo_sobre_bem:      "Custo sobre o bem (%)",
}

function labelParam(k: string) { return PARAM_LABELS[k] ?? k.replace(/_/g, " ") }
function labelResult(k: string) { return RESULT_LABELS[k] ?? k.replace(/_/g, " ") }

function fmtParamValue(k: string, v: unknown): string {
  if (typeof v !== "number") return String(v)
  if (k.includes("taxa") || k.includes("inflacao")) return `${v}%`
  if (k === "meses" || k === "num_parcelas" || k === "num_parcelas_fin") return `${v}x`
  if (k === "anos") return `${v} anos`
  return fmtBRL(v)
}

function fmtResultValue(k: string, v: unknown): string {
  if (typeof v !== "number") return String(v)
  if (k === "anos" || k === "meses_total" || k === "meses_restantes") return String(v)
  if (k === "custo_efetivo" || k === "taxa_mensal_impl" || k === "taxa_anual_impl" || k === "custo_sobre_bem")
    return `${v.toFixed(2)}%`
  if (k === "tempo_acumulacao") {
    const anos = Math.floor(v / 12)
    const m = v % 12
    return anos > 0 ? `${anos}a ${m}m` : `${m}m`
  }
  return fmtBRL(v)
}

// ── Calculadoras ──────────────────────────────────────────────────────────────

function calcJurosCompostos(params: Record<string, number>) {
  const { principal, taxa_mensal, meses, aporte_mensal = 0 } = params
  const r = taxa_mensal / 100
  let montante = principal
  const historico: number[] = [principal]
  for (let i = 0; i < meses; i++) {
    montante = montante * (1 + r) + aporte_mensal
    historico.push(Math.round(montante * 100) / 100)
  }
  const total_investido = principal + aporte_mensal * meses
  const juros_ganhos = montante - total_investido
  return {
    montante_final: Math.round(montante * 100) / 100,
    total_investido: Math.round(total_investido * 100) / 100,
    juros_ganhos: Math.round(juros_ganhos * 100) / 100,
    historico,
  }
}

function calcPrazoMeta(params: Record<string, number>) {
  const { valor_alvo, valor_atual, aporte_mensal, taxa_mensal = 0 } = params
  const r = taxa_mensal / 100
  let saldo = valor_atual
  let meses = 0
  const historico: number[] = [saldo]
  while (saldo < valor_alvo && meses < 600) {
    saldo = saldo * (1 + r) + aporte_mensal
    meses++
    historico.push(Math.round(saldo * 100) / 100)
  }
  return {
    meses_total: meses,
    anos: Math.floor(meses / 12),
    meses_restantes: meses % 12,
    saldo_final: Math.round(saldo * 100) / 100,
    total_aportado: Math.round(valor_atual + aporte_mensal * meses),
    historico,
  }
}

function calcComparacao(params: Record<string, number>) {
  const { principal, meses, taxa_a, taxa_b } = params
  const ra = taxa_a / 100
  const rb = taxa_b / 100
  const montante_a = principal * Math.pow(1 + ra, meses)
  const montante_b = principal * Math.pow(1 + rb, meses)
  const diferenca = Math.abs(montante_a - montante_b)

  // Histórico para comparação
  const historico: { mes: number; a: number; b: number }[] = []
  for (let i = 0; i <= meses; i += Math.max(1, Math.floor(meses / 12))) {
    historico.push({
      mes: i,
      a: Math.round(principal * Math.pow(1 + ra, i) * 100) / 100,
      b: Math.round(principal * Math.pow(1 + rb, i) * 100) / 100,
    })
  }

  return {
    montante_a: Math.round(montante_a * 100) / 100,
    montante_b: Math.round(montante_b * 100) / 100,
    diferenca: Math.round(diferenca * 100) / 100,
    melhor: montante_a >= montante_b ? "Opção A" : "Opção B",
    rendimento_a: Math.round((montante_a - principal) * 100) / 100,
    rendimento_b: Math.round((montante_b - principal) * 100) / 100,
    historico,
  }
}

// ── Novas calculadoras ────────────────────────────────────────────────────────

function calcParcelamento(params: Record<string, number>) {
  const { valor_compra, num_parcelas, taxa_juros_mensal = 0, entrada = 0 } = params
  const financiado = valor_compra - entrada
  const r = taxa_juros_mensal / 100

  let parcela_mensal: number
  let total_pago: number

  if (r === 0) {
    parcela_mensal = financiado / num_parcelas
    total_pago = entrada + parcela_mensal * num_parcelas
  } else {
    // Fórmula Price
    parcela_mensal = financiado * (r * Math.pow(1 + r, num_parcelas)) / (Math.pow(1 + r, num_parcelas) - 1)
    total_pago = entrada + parcela_mensal * num_parcelas
  }

  const juros_totais = total_pago - valor_compra
  const custo_efetivo = (juros_totais / valor_compra) * 100

  // Histórico do saldo devedor
  const historico: { parcela: number; saldo: number; juros: number; amortizacao: number }[] = []
  let saldo = financiado
  for (let i = 1; i <= num_parcelas; i++) {
    const jurosMes = saldo * r
    const amort = parcela_mensal - jurosMes
    saldo = Math.max(0, saldo - amort)
    historico.push({
      parcela: i,
      saldo: Math.round(saldo * 100) / 100,
      juros: Math.round(jurosMes * 100) / 100,
      amortizacao: Math.round(amort * 100) / 100,
    })
  }

  return {
    parcela_mensal: Math.round(parcela_mensal * 100) / 100,
    total_pago: Math.round(total_pago * 100) / 100,
    juros_totais: Math.round(juros_totais * 100) / 100,
    custo_efetivo: Math.round(custo_efetivo * 100) / 100,
    historico,
  }
}

function calcIndependenciaFinanceira(params: Record<string, number>) {
  const { gasto_mensal, taxa_rendimento, taxa_saque = 4, aporte_mensal = 0, valor_atual = 0 } = params
  const gasto_anual = gasto_mensal * 12

  // Patrimônio necessário pela regra de saque seguro
  const patrimonio_necessario = (gasto_anual / taxa_saque) * 100
  const ainda_falta = Math.max(0, patrimonio_necessario - valor_atual)

  // Tempo para acumular com aporte
  let meses = 0
  let patrimonio = valor_atual
  const r = taxa_rendimento / 100
  const historico: number[] = [patrimonio]

  if (aporte_mensal > 0 || r > 0) {
    while (patrimonio < patrimonio_necessario && meses < 720) {
      patrimonio = patrimonio * (1 + r) + aporte_mensal
      meses++
      if (meses % 6 === 0) historico.push(Math.round(patrimonio * 100) / 100)
    }
  }

  const renda_passiva = (patrimonio_necessario * (taxa_saque / 100)) / 12

  return {
    patrimonio_necessario: Math.round(patrimonio_necessario * 100) / 100,
    renda_passiva: Math.round(renda_passiva * 100) / 100,
    ainda_falta: Math.round(ainda_falta * 100) / 100,
    tempo_acumulacao: meses,
    aporte_sugerido: aporte_mensal,
    historico,
  }
}

function calcInflacao(params: Record<string, number>) {
  const { valor_presente, taxa_inflacao, anos } = params
  const r = taxa_inflacao / 100

  const historico: { ano: number; nominal: number; real: number }[] = [
    { ano: 0, nominal: valor_presente, real: valor_presente },
  ]

  for (let i = 1; i <= anos; i++) {
    const nominal = valor_presente // o valor nominal não muda
    const real = valor_presente / Math.pow(1 + r, i)
    historico.push({
      ano: i,
      nominal: Math.round(nominal * 100) / 100,
      real: Math.round(real * 100) / 100,
    })
  }

  const valor_real_final = valor_presente / Math.pow(1 + r, anos)
  const perda_poder_compra = valor_presente - valor_real_final

  return {
    valor_futuro: valor_presente, // nominal permanece
    valor_real: Math.round(valor_real_final * 100) / 100,
    perda_poder_compra: Math.round(perda_poder_compra * 100) / 100,
    equivalente_hoje: Math.round(valor_real_final * 100) / 100,
    historico,
  }
}

function PreviewJurosCompostos({ params }: { params: Record<string, number> }) {
  const result = useMemo(() => {
    if (!params.principal || !params.taxa_mensal || !params.meses) return null
    return calcJurosCompostos(params)
  }, [params])

  if (!result) return null

  const chartData = result.historico
    .filter((_, i) => i % Math.max(1, Math.floor(result.historico.length / 24)) === 0)
    .map((v, i) => ({ mes: i, valor: v }))

  const pct = result.total_investido > 0
    ? ((result.juros_ganhos / result.total_investido) * 100).toFixed(1)
    : "0"

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} className="text-[#4ade80]" />
        <span className="text-xs font-semibold text-[#4ade80] uppercase tracking-wider">Prévia</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Montante final</p>
          <p className="text-sm font-bold text-[#4ade80]">{fmtBRLShort(result.montante_final)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Investido</p>
          <p className="text-sm font-semibold">{fmtBRLShort(result.total_investido)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Juros ({pct}%)</p>
          <p className="text-sm font-semibold text-[#4ade80]">{fmtBRLShort(result.juros_ganhos)}</p>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPreview" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              formatter={(v: any) => [fmtBRL(v), "Montante"]}
              labelFormatter={(l) => `Mês ${l}`}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
            />
            <Area type="monotone" dataKey="valor" stroke="#4ade80" strokeWidth={2} fill="url(#gradPreview)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PreviewPrazoMeta({ params }: { params: Record<string, number> }) {
  const result = useMemo(() => {
    if (!params.valor_alvo || !params.aporte_mensal) return null
    return calcPrazoMeta(params)
  }, [params])

  if (!result) return null
  if (result.meses_total >= 600) return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
      Com esses parâmetros, a meta levaria mais de 50 anos. Tente aumentar o aporte ou a taxa.
    </div>
  )

  const chartData = result.historico
    .filter((_, i) => i % Math.max(1, Math.floor(result.historico.length / 24)) === 0)
    .map((v, i) => ({ mes: i, saldo: v, alvo: params.valor_alvo }))

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} className="text-[#a78bfa]" />
        <span className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wider">Prévia</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Tempo total</p>
          <p className="text-sm font-bold text-[#a78bfa]">
            {result.anos > 0 ? `${result.anos}a ` : ""}{result.meses_restantes}m
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Total aportado</p>
          <p className="text-sm font-semibold">{fmtBRLShort(result.total_aportado)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Saldo final</p>
          <p className="text-sm font-semibold text-[#a78bfa]">{fmtBRLShort(result.saldo_final)}</p>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMeta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" hide />
            <YAxis hide domain={[0, params.valor_alvo * 1.05]} />
            <Tooltip
              formatter={(v: any, name: any) => [fmtBRL(v), name === "saldo" ? "Saldo" : "Alvo"]}
              labelFormatter={(l) => `Mês ${l}`}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
            />
            <Area type="monotone" dataKey="alvo" stroke="#a78bfa" strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false} />
            <Area type="monotone" dataKey="saldo" stroke="#a78bfa" strokeWidth={2} fill="url(#gradMeta)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PreviewComparacao({ params }: { params: Record<string, number> }) {
  const result = useMemo(() => {
    if (!params.principal || !params.meses || !params.taxa_a || !params.taxa_b) return null
    return calcComparacao(params)
  }, [params])

  if (!result) return null

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} className="text-[#22d3ee]" />
        <span className="text-xs font-semibold text-[#22d3ee] uppercase tracking-wider">Prévia</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card border border-border p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Taxa A ({params.taxa_a}% a.m.)</p>
          <p className="text-sm font-bold">{fmtBRLShort(result.montante_a)}</p>
          <p className="text-[10px] text-[#22d3ee]">+{fmtBRLShort(result.rendimento_a)}</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Taxa B ({params.taxa_b}% a.m.)</p>
          <p className="text-sm font-bold">{fmtBRLShort(result.montante_b)}</p>
          <p className="text-[10px] text-[#22d3ee]">+{fmtBRLShort(result.rendimento_b)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/20 px-3 py-2">
        <span className="text-xs text-muted-foreground">Melhor opção:</span>
        <span className="text-xs font-bold text-[#22d3ee]">{result.melhor}</span>
        <span className="text-xs text-muted-foreground ml-auto">diferença de {fmtBRLShort(result.diferenca)}</span>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={result.historico} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f472b6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              formatter={(v: any, name: any) => [fmtBRL(v), name === "a" ? "Taxa A" : "Taxa B"]}
              labelFormatter={(l) => `Mês ${l}`}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
            />
            <Area type="monotone" dataKey="a" stroke="#22d3ee" strokeWidth={2} fill="url(#gradA)" dot={false} />
            <Area type="monotone" dataKey="b" stroke="#f472b6" strokeWidth={2} fill="url(#gradB)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PreviewParcelamento({ params }: { params: Record<string, number> }) {
  const result = useMemo(() => {
    if (!params.valor_compra || !params.num_parcelas) return null
    return calcParcelamento(params)
  }, [params])

  if (!result) return null
  const cor = "#fb923c"

  // Agrupamos por grupos de parcelas para o gráfico de saldo devedor
  const step = Math.max(1, Math.floor(result.historico.length / 12))
  const chartData = result.historico
    .filter((_, i) => i % step === 0)
    .map(h => ({ parcela: h.parcela, saldo: h.saldo, juros: h.juros }))

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} style={{ color: cor }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>Prévia</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Parcela mensal</p>
          <p className="text-sm font-bold" style={{ color: cor }}>{fmtBRLShort(result.parcela_mensal)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Total pago</p>
          <p className="text-sm font-semibold">{fmtBRLShort(result.total_pago)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Juros totais</p>
          <p className="text-sm font-semibold" style={{ color: cor }}>{fmtBRLShort(result.juros_totais)}</p>
        </div>
      </div>

      {result.juros_totais > 0 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradParc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="parcela" hide />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                formatter={(v: any, name: any) => [fmtBRL(v), name === "saldo" ? "Saldo devedor" : "Juros"]}
                labelFormatter={(l) => `Parcela ${l}`}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              />
              <Area type="monotone" dataKey="saldo" stroke={cor} strokeWidth={2} fill="url(#gradParc)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PreviewFIRE({ params }: { params: Record<string, number> }) {
  const result = useMemo(() => {
    if (!params.gasto_mensal || !params.taxa_rendimento) return null
    return calcIndependenciaFinanceira(params)
  }, [params])

  if (!result) return null
  const cor = "#f43f5e"

  const chartData = result.historico.map((v, i) => ({
    periodo: i * 6,
    patrimonio: v,
    meta: result.patrimonio_necessario,
  }))

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} style={{ color: cor }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>Prévia</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Patrimônio necessário</p>
          <p className="text-sm font-bold" style={{ color: cor }}>{fmtBRLShort(result.patrimonio_necessario)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Renda passiva</p>
          <p className="text-sm font-semibold">{fmtBRLShort(result.renda_passiva)}/mês</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Tempo estimado</p>
          <p className="text-sm font-semibold" style={{ color: cor }}>
            {result.tempo_acumulacao > 0
              ? `${Math.floor(result.tempo_acumulacao / 12)}a ${result.tempo_acumulacao % 12}m`
              : "—"}
          </p>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFIRE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="periodo" hide />
              <YAxis hide domain={[0, result.patrimonio_necessario * 1.1]} />
              <Tooltip
                formatter={(v: any, name: any) => [fmtBRL(v), name === "patrimonio" ? "Patrimônio" : "Meta"]}
                labelFormatter={(l) => `Mês ${l}`}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              />
              <ReferenceLine y={result.patrimonio_necessario} stroke={cor} strokeDasharray="4 2" strokeWidth={1} />
              <Area type="monotone" dataKey="patrimonio" stroke={cor} strokeWidth={2} fill="url(#gradFIRE)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PreviewInflacao({ params }: { params: Record<string, number> }) {
  const result = useMemo(() => {
    if (!params.valor_presente || !params.taxa_inflacao || !params.anos) return null
    return calcInflacao(params)
  }, [params])

  if (!result) return null
  const cor = "#facc15"
  const perdaPct = ((result.perda_poder_compra / params.valor_presente) * 100).toFixed(1)

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} style={{ color: cor }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>Prévia</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Valor real em {params.anos}a</p>
          <p className="text-sm font-bold" style={{ color: cor }}>{fmtBRLShort(result.valor_real)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Perda de poder de compra</p>
          <p className="text-sm font-semibold text-destructive">{fmtBRLShort(result.perda_poder_compra)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Desvalorização</p>
          <p className="text-sm font-semibold text-destructive">-{perdaPct}%</p>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={result.historico} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradInfl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={cor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="ano" hide />
            <YAxis hide domain={[0, params.valor_presente * 1.05]} />
            <Tooltip
              formatter={(v: any, name: any) => [fmtBRL(v), name === "nominal" ? "Valor nominal" : "Poder de compra real"]}
              labelFormatter={(l) => `Ano ${l}`}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
            />
            <Area type="monotone" dataKey="nominal" stroke="#94a3b8" strokeWidth={1}
              strokeDasharray="4 2" fill="none" dot={false} />
            <Area type="monotone" dataKey="real" stroke={cor} strokeWidth={2} fill="url(#gradInfl)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function FormJurosCompostos({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ principal: "", taxa_mensal: "", meses: "", aporte_mensal: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const params = useMemo(() => ({
    principal: parseFloat(f.principal) || 0,
    taxa_mensal: parseFloat(f.taxa_mensal) || 0,
    meses: parseInt(f.meses) || 0,
    aporte_mensal: parseFloat(f.aporte_mensal) || 0,
  }), [f])

  const calcular = () => {
    if (!params.principal || !params.taxa_mensal || !params.meses) return
    onSave(params, calcJurosCompostos(params))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Capital inicial (R$) *</label>
          <Input type="number" placeholder="1000" value={f.principal} onChange={set("principal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa mensal (%) *</label>
          <Input type="number" placeholder="1.0" step="0.01" value={f.taxa_mensal} onChange={set("taxa_mensal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período (meses) *</label>
          <Input type="number" placeholder="12" value={f.meses} onChange={set("meses")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Aporte mensal (R$)</label>
          <Input type="number" placeholder="0" value={f.aporte_mensal} onChange={set("aporte_mensal")} />
        </div>
      </div>

      <PreviewJurosCompostos params={params} />

      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.principal || !f.taxa_mensal || !f.meses}>
        Salvar simulação
      </Button>
    </div>
  )
}

function FormPrazoMeta({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ valor_alvo: "", valor_atual: "", aporte_mensal: "", taxa_mensal: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const params = useMemo(() => ({
    valor_alvo: parseFloat(f.valor_alvo) || 0,
    valor_atual: parseFloat(f.valor_atual) || 0,
    aporte_mensal: parseFloat(f.aporte_mensal) || 0,
    taxa_mensal: parseFloat(f.taxa_mensal) || 0,
  }), [f])

  const calcular = () => {
    if (!params.valor_alvo || !params.aporte_mensal) return
    onSave(params, calcPrazoMeta(params))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor alvo (R$) *</label>
          <Input type="number" placeholder="50000" value={f.valor_alvo} onChange={set("valor_alvo")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Já tenho (R$)</label>
          <Input type="number" placeholder="0" value={f.valor_atual} onChange={set("valor_atual")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Aporte mensal (R$) *</label>
          <Input type="number" placeholder="500" value={f.aporte_mensal} onChange={set("aporte_mensal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa mensal (%)</label>
          <Input type="number" placeholder="0.8" step="0.01" value={f.taxa_mensal} onChange={set("taxa_mensal")} />
        </div>
      </div>

      <PreviewPrazoMeta params={params} />

      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.valor_alvo || !f.aporte_mensal}>
        Salvar simulação
      </Button>
    </div>
  )
}

function FormComparacao({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ principal: "", meses: "", taxa_a: "", taxa_b: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const params = useMemo(() => ({
    principal: parseFloat(f.principal) || 0,
    meses: parseInt(f.meses) || 0,
    taxa_a: parseFloat(f.taxa_a) || 0,
    taxa_b: parseFloat(f.taxa_b) || 0,
  }), [f])

  const calcular = () => {
    if (!params.principal || !params.meses || !params.taxa_a || !params.taxa_b) return
    onSave(params, calcComparacao(params))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Capital (R$) *</label>
          <Input type="number" placeholder="10000" value={f.principal} onChange={set("principal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período (meses) *</label>
          <Input type="number" placeholder="12" value={f.meses} onChange={set("meses")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa A (% a.m.) *</label>
          <Input type="number" placeholder="1.0" step="0.01" value={f.taxa_a} onChange={set("taxa_a")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa B (% a.m.) *</label>
          <Input type="number" placeholder="0.8" step="0.01" value={f.taxa_b} onChange={set("taxa_b")} />
        </div>
      </div>

      <PreviewComparacao params={params} />

      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.principal || !f.meses || !f.taxa_a || !f.taxa_b}>
        Salvar simulação
      </Button>
    </div>
  )
}

function FormParcelamento({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ valor_compra: "", num_parcelas: "", taxa_juros_mensal: "", entrada: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const params = useMemo(() => ({
    valor_compra: parseFloat(f.valor_compra) || 0,
    num_parcelas: parseInt(f.num_parcelas) || 0,
    taxa_juros_mensal: parseFloat(f.taxa_juros_mensal) || 0,
    entrada: parseFloat(f.entrada) || 0,
  }), [f])

  const calcular = () => {
    if (!params.valor_compra || !params.num_parcelas) return
    onSave(params, calcParcelamento(params))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor da compra (R$) *</label>
          <Input type="number" placeholder="5000" value={f.valor_compra} onChange={set("valor_compra")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nº de parcelas *</label>
          <Input type="number" placeholder="12" value={f.num_parcelas} onChange={set("num_parcelas")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Juros mensais (%)</label>
          <Input type="number" placeholder="1.99" step="0.01" value={f.taxa_juros_mensal} onChange={set("taxa_juros_mensal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Entrada (R$)</label>
          <Input type="number" placeholder="0" value={f.entrada} onChange={set("entrada")} />
        </div>
      </div>
      <PreviewParcelamento params={params} />
      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.valor_compra || !f.num_parcelas}>
        Salvar simulação
      </Button>
    </div>
  )
}

function FormFIRE({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ gasto_mensal: "", taxa_rendimento: "", taxa_saque: "4", aporte_mensal: "", valor_atual: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const params = useMemo(() => ({
    gasto_mensal: parseFloat(f.gasto_mensal) || 0,
    taxa_rendimento: parseFloat(f.taxa_rendimento) || 0,
    taxa_saque: parseFloat(f.taxa_saque) || 4,
    aporte_mensal: parseFloat(f.aporte_mensal) || 0,
    valor_atual: parseFloat(f.valor_atual) || 0,
  }), [f])

  const calcular = () => {
    if (!params.gasto_mensal || !params.taxa_rendimento) return
    onSave(params, calcIndependenciaFinanceira(params))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Gasto mensal desejado (R$) *</label>
          <Input type="number" placeholder="5000" value={f.gasto_mensal} onChange={set("gasto_mensal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa de rendimento mensal (%) *</label>
          <Input type="number" placeholder="0.8" step="0.01" value={f.taxa_rendimento} onChange={set("taxa_rendimento")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa de saque anual (%) *</label>
          <Input type="number" placeholder="4" step="0.1" value={f.taxa_saque} onChange={set("taxa_saque")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Já tenho investido (R$)</label>
          <Input type="number" placeholder="0" value={f.valor_atual} onChange={set("valor_atual")} />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Aporte mensal (R$)</label>
          <Input type="number" placeholder="1000" value={f.aporte_mensal} onChange={set("aporte_mensal")} />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        A regra dos 4% (taxa de saque padrão) sugere que você pode retirar 4% do patrimônio por ano indefinidamente.
      </p>
      <PreviewFIRE params={params} />
      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.gasto_mensal || !f.taxa_rendimento}>
        Salvar simulação
      </Button>
    </div>
  )
}

function FormInflacao({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ valor_presente: "", taxa_inflacao: "5", anos: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const params = useMemo(() => ({
    valor_presente: parseFloat(f.valor_presente) || 0,
    taxa_inflacao: parseFloat(f.taxa_inflacao) || 0,
    anos: parseInt(f.anos) || 0,
  }), [f])

  const calcular = () => {
    if (!params.valor_presente || !params.taxa_inflacao || !params.anos) return
    onSave(params, calcInflacao(params))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor hoje (R$) *</label>
          <Input type="number" placeholder="100000" value={f.valor_presente} onChange={set("valor_presente")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Inflação anual (%) *</label>
          <Input type="number" placeholder="5" step="0.1" value={f.taxa_inflacao} onChange={set("taxa_inflacao")} />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período (anos) *</label>
          <Input type="number" placeholder="10" value={f.anos} onChange={set("anos")} />
        </div>
      </div>
      <PreviewInflacao params={params} />
      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.valor_presente || !f.taxa_inflacao || !f.anos}>
        Salvar simulação
      </Button>
    </div>
  )
}

// ── Gráficos inline nos cards salvos ─────────────────────────────────────────

function ChartJurosCompostos({ result, cor }: { result: Record<string, unknown>; cor: string }) {
  const historico = result.historico as number[] | undefined
  if (!historico || historico.length < 2) return null

  const step = Math.max(1, Math.floor(historico.length / 20))
  const data = historico
    .filter((_, i) => i % step === 0)
    .map((v, i) => ({ mes: i * step, valor: v }))

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gc-${cor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}m`} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v: any) => [fmtBRL(v), "Montante"]}
            labelFormatter={(l) => `Mês ${l}`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          />
          <Area type="monotone" dataKey="valor" stroke={cor} strokeWidth={2}
            fill={`url(#gc-${cor.replace("#", "")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartPrazoMeta({ result, params, cor }: {
  result: Record<string, unknown>
  params: Record<string, unknown>
  cor: string
}) {
  const historico = result.historico as number[] | undefined
  const valorAlvo = params.valor_alvo as number | undefined
  if (!historico || historico.length < 2) return null

  const step = Math.max(1, Math.floor(historico.length / 20))
  const data = historico
    .filter((_, i) => i % step === 0)
    .map((v, i) => ({ mes: i * step, saldo: v, alvo: valorAlvo }))

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gm-${cor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}m`} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v: any, name: any) => [fmtBRL(v), name === "saldo" ? "Saldo" : "Alvo"]}
            labelFormatter={(l) => `Mês ${l}`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          />
          <Area type="monotone" dataKey="alvo" stroke={cor} strokeWidth={1}
            strokeDasharray="4 2" fill="none" dot={false} />
          <Area type="monotone" dataKey="saldo" stroke={cor} strokeWidth={2}
            fill={`url(#gm-${cor.replace("#", "")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartComparacao({ result }: { result: Record<string, unknown> }) {
  const historico = result.historico as { mes: number; a: number; b: number }[] | undefined
  if (!historico || historico.length < 2) return null

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={historico} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gcmpA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gcmpB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f472b6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}m`} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v: any, name: any) => [fmtBRL(v), name === "a" ? "Taxa A" : "Taxa B"]}
            labelFormatter={(l) => `Mês ${l}`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          />
          <Area type="monotone" dataKey="a" stroke="#22d3ee" strokeWidth={2} fill="url(#gcmpA)" dot={false} />
          <Area type="monotone" dataKey="b" stroke="#f472b6" strokeWidth={2} fill="url(#gcmpB)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartParcelamento({ result, cor }: { result: Record<string, unknown>; cor: string }) {
  const historico = result.historico as { parcela: number; saldo: number; juros: number }[] | undefined
  if (!historico || historico.length < 2) return null

  const step = Math.max(1, Math.floor(historico.length / 20))
  const data = historico.filter((_, i) => i % step === 0)

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gcParc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="parcela" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v: any, name: any) => [fmtBRL(v), name === "saldo" ? "Saldo devedor" : "Juros"]}
            labelFormatter={(l) => `Parcela ${l}`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          />
          <Area type="monotone" dataKey="saldo" stroke={cor} strokeWidth={2} fill="url(#gcParc)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartFIRE({ result, cor }: { result: Record<string, unknown>; cor: string }) {
  const historico = result.historico as number[] | undefined
  const meta = result.patrimonio_necessario as number | undefined
  if (!historico || historico.length < 2) return null

  const data = historico.map((v, i) => ({ periodo: i * 6, patrimonio: v, meta }))

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gcFIRE" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}m`} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v: any, name: any) => [fmtBRL(v), name === "patrimonio" ? "Patrimônio" : "Meta"]}
            labelFormatter={(l) => `Mês ${l}`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          />
          {meta && <ReferenceLine y={meta} stroke={cor} strokeDasharray="4 2" strokeWidth={1} />}
          <Area type="monotone" dataKey="patrimonio" stroke={cor} strokeWidth={2} fill="url(#gcFIRE)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartInflacao({ result, params, cor }: {
  result: Record<string, unknown>
  params: Record<string, unknown>
  cor: string
}) {
  const historico = result.historico as { ano: number; nominal: number; real: number }[] | undefined
  if (!historico || historico.length < 2) return null

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={historico} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gcInfl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="ano" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}a`} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v: any, name: any) => [fmtBRL(v), name === "nominal" ? "Nominal" : "Poder de compra real"]}
            labelFormatter={(l) => `Ano ${l}`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          />
          <Area type="monotone" dataKey="nominal" stroke="#94a3b8" strokeWidth={1}
            strokeDasharray="4 2" fill="none" dot={false} />
          <Area type="monotone" dataKey="real" stroke={cor} strokeWidth={2} fill="url(#gcInfl)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Financiamento (calculadora reversa) ───────────────────────────────────────

/**
 * Dado valor_imovel, valor_entrada, valor_parcela e num_parcelas_fin,
 * resolve a taxa mensal implícita pelo método de Newton-Raphson sobre
 * a equação Price: P = F * r*(1+r)^n / ((1+r)^n - 1)
 * onde F = financiado, P = parcela, n = parcelas.
 */
function resolverTaxaImplicita(financiado: number, parcela: number, n: number): number {
  if (financiado <= 0 || parcela <= 0 || n <= 0) return 0
  // Sem juros: parcela * n ≈ financiado
  if (Math.abs(parcela * n - financiado) < 0.01) return 0
  // Parcelas insuficientes para cobrir o financiado (sem juros nem cobriria)
  if (parcela * n < financiado) return NaN

  // Newton-Raphson sobre f(r) = P - F*r*(1+r)^n / ((1+r)^n - 1) = 0
  // f'(r) calculado numericamente para evitar erros algébricos
  let r = parcela / financiado / n  // chute inicial simples
  r = Math.min(Math.max(r, 0.0001), 0.5)

  for (let i = 0; i < 1000; i++) {
    const fator = Math.pow(1 + r, n)
    const denom = fator - 1
    if (denom === 0) break
    const parcCalc = financiado * r * fator / denom
    // Derivada numérica
    const dr = r * 1e-6 + 1e-10
    const fatorD = Math.pow(1 + r + dr, n)
    const denomD = fatorD - 1
    const parcCalcD = financiado * (r + dr) * fatorD / denomD
    const derivada = (parcCalcD - parcCalc) / dr
    if (Math.abs(derivada) < 1e-15) break
    const rNovo = r - (parcCalc - parcela) / derivada
    if (!isFinite(rNovo) || rNovo <= 0) break
    if (Math.abs(rNovo - r) < 1e-12) { r = rNovo; break }
    r = rNovo
  }
  return isFinite(r) && r > 0 ? r : 0
}

function calcFinanciamento(params: Record<string, number>) {
  const { valor_imovel, valor_entrada = 0, valor_parcela, num_parcelas_fin } = params
  const financiado = valor_imovel - valor_entrada
  const total_pago_fin = valor_entrada + valor_parcela * num_parcelas_fin
  const juros_totais_fin = total_pago_fin - valor_imovel
  const custo_sobre_bem = (juros_totais_fin / valor_imovel) * 100

  const taxa_mensal = resolverTaxaImplicita(financiado, valor_parcela, num_parcelas_fin)
  const taxa_anual_impl = (Math.pow(1 + taxa_mensal, 12) - 1) * 100

  // Tabela Price: amortização + juros por parcela
  const historico: { parcela: number; saldo: number; juros: number; amort: number }[] = []
  let saldo = financiado
  for (let i = 1; i <= num_parcelas_fin; i++) {
    const juros = saldo * taxa_mensal
    const amort = valor_parcela - juros
    saldo = Math.max(0, saldo - amort)
    historico.push({
      parcela: i,
      saldo: Math.round(saldo * 100) / 100,
      juros: Math.round(juros * 100) / 100,
      amort: Math.round(amort * 100) / 100,
    })
  }

  return {
    valor_financiado: Math.round(financiado * 100) / 100,
    total_pago_fin: Math.round(total_pago_fin * 100) / 100,
    juros_totais_fin: Math.round(juros_totais_fin * 100) / 100,
    taxa_mensal_impl: Math.round(taxa_mensal * 10000) / 100,
    taxa_anual_impl: Math.round(taxa_anual_impl * 100) / 100,
    custo_sobre_bem: Math.round(custo_sobre_bem * 100) / 100,
    historico,
  }
}

function PreviewFinanciamento({ params }: { params: Record<string, number> }) {
  const result = useMemo(() => {
    if (!params.valor_imovel || !params.valor_parcela || !params.num_parcelas_fin) return null
    if (params.valor_parcela * params.num_parcelas_fin < (params.valor_imovel - (params.valor_entrada ?? 0))) return null
    return calcFinanciamento(params)
  }, [params])

  if (!result) return null
  const cor = "#818cf8"

  const step = Math.max(1, Math.floor(result.historico.length / 18))
  const chartData = result.historico.filter((_, i) => i % step === 0)

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} style={{ color: cor }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>Prévia</span>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card border border-border p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total pago</p>
          <p className="text-sm font-bold" style={{ color: cor }}>{fmtBRLShort(result.total_pago_fin)}</p>
        </div>
        <div className="rounded-lg bg-card border border-border p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total de juros</p>
          <p className="text-sm font-bold text-destructive">{fmtBRLShort(result.juros_totais_fin)}</p>
        </div>
      </div>

      {/* Taxa implícita destaque */}
      <div className="flex items-center justify-between rounded-lg px-3 py-2 border"
        style={{ borderColor: `${cor}40`, background: `${cor}08` }}>
        <div>
          <p className="text-[10px] text-muted-foreground">Taxa mensal implícita</p>
          <p className="text-base font-bold" style={{ color: cor }}>{result.taxa_mensal_impl.toFixed(2)}% a.m.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Taxa anual implícita</p>
          <p className="text-base font-bold" style={{ color: cor }}>{result.taxa_anual_impl.toFixed(2)}% a.a.</p>
        </div>
      </div>

      {/* Gráfico saldo devedor */}
      {result.juros_totais_fin > 0 && (
        <div style={{ height: 112, minHeight: 112, width: "100%", overflow: "hidden" }}>
          <ResponsiveContainer width="100%" height={112}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFinPrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="parcela" hide />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip
                formatter={(v: any) => [fmtBRL(v), "Saldo devedor"]}
                labelFormatter={(l) => `Parcela ${l}`}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              />
              <Area type="monotone" dataKey="saldo" stroke={cor} strokeWidth={2} fill="url(#gradFinPrev)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Barra de custo: bem vs juros */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Custo do bem</span>
          <span>Juros ({result.custo_sobre_bem.toFixed(1)}% do valor)</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-l-full"
            style={{
              width: `${(params.valor_imovel / result.total_pago_fin) * 100}%`,
              background: cor,
            }}
          />
          <div
            className="h-full rounded-r-full bg-destructive/60"
            style={{ width: `${(result.juros_totais_fin / result.total_pago_fin) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function FormFinanciamento({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ valor_imovel: "", valor_entrada: "", valor_parcela: "", num_parcelas_fin: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const params = useMemo(() => ({
    valor_imovel: parseFloat(f.valor_imovel) || 0,
    valor_entrada: parseFloat(f.valor_entrada) || 0,
    valor_parcela: parseFloat(f.valor_parcela) || 0,
    num_parcelas_fin: parseInt(f.num_parcelas_fin) || 0,
  }), [f])

  const financiado = params.valor_imovel - params.valor_entrada
  const totalParcelas = params.valor_parcela * params.num_parcelas_fin
  const parcelasInsuficientes = params.valor_parcela > 0 && params.num_parcelas_fin > 0 &&
    totalParcelas < financiado

  const calcular = () => {
    if (!params.valor_imovel || !params.valor_parcela || !params.num_parcelas_fin) return
    if (parcelasInsuficientes) return
    onSave(params, calcFinanciamento(params))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor do imóvel / bem (R$) *</label>
          <Input type="number" placeholder="300000" value={f.valor_imovel} onChange={set("valor_imovel")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor da entrada (R$)</label>
          <Input type="number" placeholder="60000" value={f.valor_entrada} onChange={set("valor_entrada")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor da parcela mensal (R$) *</label>
          <Input type="number" placeholder="2500" value={f.valor_parcela} onChange={set("valor_parcela")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nº de parcelas *</label>
          <Input type="number" placeholder="360" value={f.num_parcelas_fin} onChange={set("num_parcelas_fin")} />
        </div>
      </div>

      {/* Financiado calculado ao vivo */}
      {params.valor_imovel > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Valor financiado</span>
          <span className="font-semibold">{fmtBRL(Math.max(0, financiado))}</span>
        </div>
      )}

      {parcelasInsuficientes && (
        <p className="text-xs text-amber-400">
          ⚠️ O total das parcelas ({fmtBRL(totalParcelas)}) é menor que o valor financiado ({fmtBRL(financiado)}). Aumente a parcela ou o número de parcelas.
        </p>
      )}

      <PreviewFinanciamento params={params} />

      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.valor_imovel || !f.valor_parcela || !f.num_parcelas_fin || parcelasInsuficientes}>
        Salvar simulação
      </Button>
    </div>
  )
}

function ChartFinanciamento({ result, cor }: { result: Record<string, unknown>; cor: string }) {
  const historico = result.historico as { parcela: number; saldo: number; juros: number; amort: number }[] | undefined
  if (!historico || historico.length < 2) return null

  const step = Math.max(1, Math.floor(historico.length / 24))
  const data = historico.filter((_, i) => i % step === 0)

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gcFin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="parcela" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={fmtBRLShort} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            formatter={(v: any, name: any) => [
              fmtBRL(v),
              name === "saldo" ? "Saldo devedor" : name === "juros" ? "Juros" : "Amortização",
            ]}
            labelFormatter={(l) => `Parcela ${l}`}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
          />
          <Area type="monotone" dataKey="saldo" stroke={cor} strokeWidth={2} fill="url(#gcFin)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ResultCard({ sim, onDelete }: { sim: Simulation; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const tipo = TIPOS[sim.simulation_type]
  const Icon = tipo?.icon ?? Calculator
  const cor = tipo?.cor ?? "#94a3b8"
  const r = (sim.result ?? {}) as Record<string, unknown>
  const p = (sim.parameters ?? {}) as Record<string, unknown>

  // Destaque principal por tipo
  const destaque = useMemo(() => {
    if (sim.simulation_type === "juros_compostos" && typeof r.montante_final === "number")
      return { label: "Montante final", valor: fmtBRL(r.montante_final) }
    if (sim.simulation_type === "prazo_meta" && typeof r.meses_total === "number")
      return { label: "Tempo até a meta", valor: `${Math.floor(r.meses_total / 12)}a ${r.meses_total % 12}m` }
    if (sim.simulation_type === "comparacao_investimento" && typeof r.melhor === "string")
      return { label: "Melhor opção", valor: r.melhor }
    if (sim.simulation_type === "parcelamento" && typeof r.parcela_mensal === "number")
      return { label: "Parcela mensal", valor: fmtBRL(r.parcela_mensal) }
    if (sim.simulation_type === "independencia_financeira" && typeof r.patrimonio_necessario === "number")
      return { label: "Patrimônio necessário", valor: fmtBRLShort(r.patrimonio_necessario) }
    if (sim.simulation_type === "inflacao" && typeof r.valor_real === "number")
      return { label: "Valor real", valor: fmtBRL(r.valor_real) }
    if (sim.simulation_type === "financiamento" && typeof r.taxa_anual_impl === "number")
      return { label: "Taxa anual implícita", valor: `${(r.taxa_anual_impl as number).toFixed(2)}% a.a.` }
    return null
  }, [sim, r])

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cor}20` }}>
            <Icon size={14} style={{ color: cor }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{tipo?.label ?? sim.simulation_type}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(sim.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {destaque && !expanded && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">{destaque.label}</p>
              <p className="text-xs font-bold" style={{ color: cor }}>{destaque.valor}</p>
            </div>
          )}
          <button onClick={() => setExpanded(v => !v)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Gráfico inline */}
          {sim.simulation_type === "juros_compostos" && (
            <ChartJurosCompostos result={r} cor={cor} />
          )}
          {sim.simulation_type === "prazo_meta" && (
            <ChartPrazoMeta result={r} params={p} cor={cor} />
          )}
          {sim.simulation_type === "comparacao_investimento" && (
            <ChartComparacao result={r} />
          )}
          {sim.simulation_type === "parcelamento" && (
            <ChartParcelamento result={r} cor={cor} />
          )}
          {sim.simulation_type === "independencia_financeira" && (
            <ChartFIRE result={r} cor={cor} />
          )}
          {sim.simulation_type === "inflacao" && (
            <ChartInflacao result={r} params={p} cor={cor} />
          )}
          {sim.simulation_type === "financiamento" && (
            <ChartFinanciamento result={r} cor={cor} />
          )}

          {/* Parâmetros */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parâmetros</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(p).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{labelParam(k)}</span>
                  <span className="font-medium">{fmtParamValue(k, v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resultados */}
          {Object.keys(r).filter(k => k !== "historico").length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: `${cor}40`, background: `${cor}08` }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>Resultado</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.entries(r).filter(([k]) => k !== "historico").map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{labelResult(k)}</span>
                    <span className="font-semibold">{fmtResultValue(k, v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal nova simulação ──────────────────────────────────────────────────────

function NovaSimulacaoModal({ onClose }: { onClose: () => void }) {
  const [tipo, setTipo] = useState<string | null>(null)
  const createMut = useCreateSimulation()

  const handleSave = (params: Record<string, number>, result: Record<string, unknown>) => {
    if (!tipo) return
    createMut.mutate({ simulation_type: tipo, parameters: params, result }, { onSuccess: onClose })
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">

          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold">
              {tipo ? TIPOS[tipo]?.label : "Nova Simulação"}
            </h2>
            <div className="flex items-center gap-2">
              {tipo && (
                <button onClick={() => setTipo(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ← Voltar
                </button>
              )}
              <button onClick={onClose}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!tipo ? (
              <div className="space-y-2">
                {Object.entries(TIPOS).map(([key, { label, icon: Icon, cor, descricao }]) => (
                  <button key={key} onClick={() => setTipo(key)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-muted/50 transition-colors">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cor}20` }}>
                      <Icon size={14} style={{ color: cor }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{descricao}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : createMut.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : tipo === "juros_compostos" ? (
              <FormJurosCompostos onSave={handleSave} />
            ) : tipo === "prazo_meta" ? (
              <FormPrazoMeta onSave={handleSave} />
            ) : tipo === "comparacao_investimento" ? (
              <FormComparacao onSave={handleSave} />
            ) : tipo === "parcelamento" ? (
              <FormParcelamento onSave={handleSave} />
            ) : tipo === "independencia_financeira" ? (
              <FormFIRE onSave={handleSave} />
            ) : tipo === "financiamento" ? (
              <FormFinanciamento onSave={handleSave} />
            ) : (
              <FormInflacao onSave={handleSave} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SimulacoesPage() {
  const { simulations, isLoading } = useSimulations()
  const deleteMut = useDeleteSimulation()
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)

  const simulacoesFiltradas = useMemo(() => {
    if (!filtroTipo) return simulations
    return simulations.filter(s => s.simulation_type === filtroTipo)
  }, [simulations, filtroTipo])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {modalOpen && <NovaSimulacaoModal onClose={() => setModalOpen(false)} />}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Simulações</h1>
          <p className="text-xs text-muted-foreground">
            {simulations.length} simulaç{simulations.length !== 1 ? "ões" : "ão"} salva{simulations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus size={14} /> Nova
        </Button>
      </div>

      {/* Filtro por tipo */}
      {simulations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setFiltroTipo(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !filtroTipo
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {Object.entries(TIPOS).map(([key, { label, cor }]) => {
            const count = simulations.filter(s => s.simulation_type === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setFiltroTipo(filtroTipo === key ? null : key)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroTipo === key
                    ? "text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                style={filtroTipo === key ? { background: cor } : {}}
              >
                {label}
                <span className={`rounded-full px-1 text-[10px] ${filtroTipo === key ? "bg-black/20" : "bg-muted-foreground/20"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Lista de simulações */}
      {simulacoesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
            <Calculator size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {filtroTipo ? "Nenhuma simulação desse tipo" : "Nenhuma simulação ainda"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filtroTipo ? "Tente outro filtro ou crie uma nova simulação" : "Crie sua primeira para visualizar projeções financeiras"}
          </p>
          {!filtroTipo && (
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Nova simulação
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {simulacoesFiltradas.map(sim => (
            <ResultCard
              key={sim.id}
              sim={sim}
              onDelete={() => deleteMut.mutate(sim.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}