import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  TrendingUp, Percent, DollarSign, Clock, Plus, X, Loader2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, Trash2,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useInvestments, useCreateInvestment, useCreateIncome, useDeleteIncome,
  type InvestmentEnriched, type Income,
} from "@/hooks/api/useInvestments"
import { useInvestmentTypes, useIncomeTypes } from "@/hooks/api/useCategorias"
import { useTransactions } from "@/hooks/api/useTransactions"

export const Route = createFileRoute("/_layout/investimentos")({
  component: InvestimentosPage,
  head: () => ({ meta: [{ title: "Investimentos — FinanceOS" }] }),
})

const fmtBRL = (v: number) => Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number) => `${(Number(v) * 100).toFixed(2)}%`
const COLORS  = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171", "#fb923c"]

// ── Modal: Novo Investimento ──────────────────────────────────────────────────

function NovoInvestimentoModal({ onClose }: { onClose: () => void }) {
  const { data: tipos = [] } = useInvestmentTypes()
  const { transactions }     = useTransactions()
  const createMut            = useCreateInvestment()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    investment_type_id: "", invested_value: "",
    application_date: today, interest_rate: "", maturity_date: "",
    status: "ativo", transaction_id: "",
  })

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 15)
  cutoff.setHours(0, 0, 0, 0)

  const saidasDisponiveis = transactions
    .filter(tx => {
      if (Number(tx.transaction_value) >= 0) return false
      const dateStr = tx.transaction_date.slice(0, 10)
      const txDate  = new Date(dateStr + 'T00:00:00')
      return txDate >= cutoff
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  const isValid = form.investment_type_id !== "" && form.invested_value.trim() !== ""

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate({
      investment_type_id: Number(form.investment_type_id),
      invested_value:     Number(form.invested_value.replace(",", ".")),
      application_date:   form.application_date,
      interest_rate:      form.interest_rate ? Number(form.interest_rate.replace(",", ".")) / 100 : undefined,
      maturity_date:      form.maturity_date || undefined,
      status:             form.status,
      transaction_id:     form.transaction_id ? Number(form.transaction_id) : undefined,
    }, { onSuccess: onClose })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl my-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <h2 className="text-base font-semibold">Novo Investimento</h2>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X size={15} />
            </button>
          </div>
          <div className="space-y-4 p-5">
            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Investimento</label>
              <select value={form.investment_type_id} onChange={e => setForm(f => ({ ...f, investment_type_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione um tipo...</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.description} ({t.acronym}){t.fixed_income ? " · Renda Fixa" : ""}</option>)}
              </select>
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Investido (R$)</label>
                <Input placeholder="0,00" value={form.invested_value} type="number" step="0.01" min="0"
                  onChange={e => setForm(f => ({ ...f, invested_value: e.target.value }))} className="h-10 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de Aplicação</label>
                <Input type="date" value={form.application_date}
                  onChange={e => setForm(f => ({ ...f, application_date: e.target.value }))} className="h-10 text-sm" />
              </div>
            </div>

            {/* Taxa + Vencimento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa (% a.a.)</label>
                <Input placeholder="ex: 12.5" value={form.interest_rate} type="number" step="0.01"
                  onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimento</label>
                <Input type="date" value={form.maturity_date}
                  onChange={e => setForm(f => ({ ...f, maturity_date: e.target.value }))} className="h-10 text-sm" />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="ativo">Ativo</option>
                <option value="vencido">Vencido</option>
                <option value="resgatado">Resgatado</option>
              </select>
            </div>

            {/* Separador */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-[11px] text-muted-foreground">
                  Vincular transação de saída (opcional)
                </span>
              </div>
            </div>

            {/* Transação de origem */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Transação de Origem
              </label>
              <select value={form.transaction_id}
                onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Nenhuma (não vincular)</option>
                {saidasDisponiveis.map(tx => (
                  <option key={tx.id} value={tx.id}>
                    {new Date(tx.transaction_date).toLocaleDateString("pt-BR")}
                    {" · "}{tx.categoryName}
                    {" · "}{Math.abs(Number(tx.transaction_value)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </option>
                ))}
              </select>
              {form.transaction_id && (
                <p className="text-[11px] text-muted-foreground">
                  Esta transação ficará registrada como origem do aporte.
                </p>
              )}
              {saidasDisponiveis.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Nenhuma transação de saída cadastrada ainda.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 h-10" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Modal: Novo Evento (rendimento, resgate ou aporte) ────────────────────────

type EventKind = "rendimento" | "resgate" | "aporte"

function NovoEventoModal({ investment, onClose }: { investment: InvestmentEnriched; onClose: () => void }) {
  const { data: incomeTypes = [] } = useIncomeTypes()
  const { transactions }           = useTransactions()
  const createMut                  = useCreateIncome()

  const today = new Date().toISOString().slice(0, 10)
  const [eventKind, setEventKind] = useState<EventKind>("rendimento")
  const [form, setForm] = useState({
    income_type_id: "", income_value: "", income_date: today,
    ir_withheld: "", transaction_id: "",
  })

  // Saídas dos últimos 15 dias para vincular ao aporte
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 15)
  cutoff.setHours(0, 0, 0, 0)
  const saidasDisponiveis = transactions
    .filter(tx => {
      if (Number(tx.transaction_value) >= 0) return false
      const dateStr = tx.transaction_date.slice(0, 10)
      const txDate  = new Date(dateStr + "T00:00:00")
      return txDate >= cutoff
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  const isValid = form.income_type_id !== "" && form.income_value.trim() !== ""

  const deltaValue = () => {
    const raw = Math.abs(Number(form.income_value))
    if (eventKind === "resgate") return -raw
    return raw  // rendimento e aporte somam positivo
  }

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate({
      investment_id:  investment.id,
      income_type_id: Number(form.income_type_id),
      income_date:    form.income_date,
      income_value:   deltaValue(),
      ir_withheld:    form.ir_withheld ? Number(form.ir_withheld.replace(",", ".")) : undefined,
    }, { onSuccess: onClose })
  }

  const kindConfig = {
    rendimento: { label: "Rendimento",     color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: <ArrowUpRight size={13} />,  btnClass: "" },
    resgate:    { label: "Resgate Parcial", color: "text-rose-400",    bgColor: "bg-rose-500/10",    icon: <ArrowDownLeft size={13} />, btnClass: "bg-rose-500 hover:bg-rose-600" },
    aporte:     { label: "Aporte",          color: "text-violet-400",  bgColor: "bg-violet-500/10",  icon: <Plus size={13} />,          btnClass: "bg-violet-500 hover:bg-violet-600" },
  }
  const cfg = kindConfig[eventKind]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl my-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Novo Evento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{investment.typeName}</p>
            </div>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            {/* Toggle 3 opções */}
            <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
              {(["rendimento", "resgate", "aporte"] as EventKind[]).map(kind => (
                <button key={kind} type="button" onClick={() => setEventKind(kind)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                    eventKind === kind
                      ? `bg-card shadow-sm ${kindConfig[kind].color}`
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                  {kindConfig[kind].icon}
                  <span className="hidden sm:inline">{kindConfig[kind].label}</span>
                  <span className="sm:hidden">{kindConfig[kind].label.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {eventKind === "rendimento" ? "Tipo de Rendimento"
                  : eventKind === "resgate" ? "Tipo do Resgate"
                  : "Tipo do Aporte"}
              </label>
              <select value={form.income_type_id}
                onChange={e => setForm(f => ({ ...f, income_type_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {incomeTypes.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
              </select>
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor (R$)</label>
                <Input placeholder="0,00" value={form.income_value} type="number" step="0.01" min="0"
                  onChange={e => setForm(f => ({ ...f, income_value: e.target.value }))}
                  className="h-10 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data</label>
                <Input type="date" value={form.income_date}
                  onChange={e => setForm(f => ({ ...f, income_date: e.target.value }))}
                  className="h-10 text-sm" />
              </div>
            </div>

            {/* IR retido — só para rendimento */}
            {eventKind === "rendimento" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  IR Retido (R$) — opcional
                </label>
                <Input placeholder="0,00" value={form.ir_withheld} type="number" step="0.01" min="0"
                  onChange={e => setForm(f => ({ ...f, ir_withheld: e.target.value }))}
                  className="h-10 text-sm" />
              </div>
            )}

            {/* Transação de origem — só para aporte */}
            {eventKind === "aporte" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-2 text-[11px] text-muted-foreground">
                      Vincular transação de saída (opcional)
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Transação de Origem
                  </label>
                  <select value={form.transaction_id}
                    onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Nenhuma (não vincular)</option>
                    {saidasDisponiveis.map(tx => (
                      <option key={tx.id} value={tx.id}>
                        {new Date(tx.transaction_date).toLocaleDateString("pt-BR")}
                        {" · "}{tx.categoryName}
                        {" · "}{Math.abs(Number(tx.transaction_value)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </option>
                    ))}
                  </select>
                  {saidasDisponiveis.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Nenhuma transação de saída nos últimos 15 dias.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Preview do impacto */}
            {form.income_value && (
              <div className={cn("rounded-lg p-3 text-xs space-y-1", cfg.bgColor)}>
                <p className={cn("font-medium", cfg.color)}>{cfg.label}</p>
                <p className="font-semibold text-sm">
                  Novo saldo: {fmtBRL(investment.currentValue + deltaValue())}
                </p>
                <p className="text-muted-foreground">
                  {fmtBRL(investment.currentValue)} {eventKind === "resgate" ? "−" : "+"} {fmtBRL(Math.abs(Number(form.income_value)))}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button
              className={cn("flex-1 h-10", cfg.btnClass)}
              onClick={handleSubmit}
              disabled={!isValid || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Registrar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Card de posição ───────────────────────────────────────────────────────────

function PosicaoCard({ inv, events, color }: {
  inv: InvestmentEnriched; events: Income[]; color: string
}) {
  const [expanded, setExpanded]       = useState(false)
  const [eventoModal, setEventoModal] = useState(false)
  const deleteMut = useDeleteIncome()
 
  const statusColors: Record<string, string> = {
    ativo:     "text-emerald-500 bg-emerald-500/10",
    vencido:   "text-amber-500 bg-amber-500/10",
    resgatado: "text-muted-foreground bg-muted",
  }
 
  const currentValue  = inv.currentValue
  // Usa totalInvested (base de custo real = aporte inicial + aportes adicionais)
  const rentabilidade = inv.totalInvested > 0
    ? ((currentValue - inv.totalInvested) / inv.totalInvested) * 100
    : 0
 
  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
        {/* Cabeçalho do card */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-lg shrink-0 text-xs font-bold text-white"
                style={{ backgroundColor: color }}>
                {inv.typeAcronym.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{inv.typeName}</p>
                <p className="text-xs text-muted-foreground">
                  Desde {new Date(inv.application_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0", statusColors[inv.status] ?? statusColors.ativo)}>
              {inv.status}
            </span>
          </div>
 
          {/* KPIs do card */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Aportado</p>
              {/* totalInvested reflete o aporte inicial + aportes adicionais */}
              <p className="font-semibold mt-0.5">{fmtBRL(inv.totalInvested)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Atual</p>
              <p className={cn("font-semibold mt-0.5", currentValue >= inv.totalInvested ? "text-emerald-500" : "text-rose-400")}>
                {fmtBRL(currentValue)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Rentabilidade</p>
              <p className={cn("font-semibold mt-0.5", rentabilidade >= 0 ? "text-emerald-500" : "text-rose-400")}>
                {rentabilidade >= 0 ? "+" : ""}{rentabilidade.toFixed(2)}%
              </p>
            </div>
            {inv.interest_rate && (
              <div>
                <p className="text-muted-foreground">Taxa</p>
                <p className="font-semibold mt-0.5">{fmtPct(Number(inv.interest_rate))} a.a.</p>
              </div>
            )}
          </div>
        </div>
 
        {/* Ações do card */}
        <div className="flex items-center gap-1 px-4 pb-3">
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs flex-1"
            onClick={() => setEventoModal(true)}>
            <Plus size={12} /> Rendimento / Resgate
          </Button>
          <button onClick={() => setExpanded(e => !e)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
 
        {/* Histórico de eventos expandível */}
        {expanded && (
          <div className="border-t border-border divide-y divide-border">
            {events.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhum evento registrado.</p>
            ) : (
              events
                .slice()
                .sort((a, b) => new Date(b.income_date).getTime() - new Date(a.income_date).getTime())
                .map(ev => {
                  const isPositive = Number(ev.income_value) >= 0
                  return (
                    <div key={ev.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                      <div className={cn("flex size-6 items-center justify-center rounded-md shrink-0",
                        isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-400")}>
                        {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">
                          {isPositive ? "Rendimento" : "Resgate"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ev.income_date).toLocaleDateString("pt-BR")}
                          {ev.ir_withheld ? ` · IR: ${fmtBRL(Number(ev.ir_withheld))}` : ""}
                        </p>
                      </div>
                      <span className={cn("text-xs font-semibold shrink-0",
                        isPositive ? "text-emerald-500" : "text-rose-400")}>
                        {isPositive ? "+" : "−"}{fmtBRL(Number(ev.income_value))}
                      </span>
                      <button onClick={() => deleteMut.mutate(ev.id)}
                        className="opacity-0 group-hover:opacity-100 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })
            )}
          </div>
        )}
      </div>
 
      {eventoModal && <NovoEventoModal investment={inv} onClose={() => setEventoModal(false)} />}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InvestimentosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { investments: enriched, eventsByInv, totalInvestido, totalRendimentos, composicaoPorTipo, isLoading } = useInvestments()

  const valorAtualTotal = enriched.reduce((s, i) => s + i.currentValue, 0)
  const rentGlobal      = totalInvestido > 0 ? ((valorAtualTotal - totalInvestido) / totalInvestido) * 100 : 0

  return (
    <div className="space-y-4 p-4 pb-24 sm:space-y-5 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Investimentos</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isLoading ? "Carregando..." : `${enriched.length} posições`}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          <span className="hidden sm:inline">Novo</span> Investimento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Aportado",      value: fmtBRL(totalInvestido),   icon: DollarSign, color: "#4ade80" },
          { label: "Valor Atual",   value: fmtBRL(valorAtualTotal),  icon: TrendingUp,  color: "#22d3ee" },
          { label: "Rendimentos",   value: fmtBRL(totalRendimentos), icon: Percent,     color: totalRendimentos >= 0 ? "#a78bfa" : "#f87171" },
          { label: "Rentabilidade", value: `${rentGlobal >= 0 ? "+" : ""}${rentGlobal.toFixed(2)}%`, icon: Clock, color: rentGlobal >= 0 ? "#fbbf24" : "#f87171" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <k.icon size={13} style={{ color: k.color }} />
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-base font-semibold sm:text-lg" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Composição */}
      {composicaoPorTipo.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-3">Composição da Carteira</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={90} height={90}>
              <PieChart>
                <Pie data={composicaoPorTipo.map(c => ({ name: c.name, value: c.total }))}
                  dataKey="value" cx="50%" cy="50%" innerRadius={26} outerRadius={42}>
                  {composicaoPorTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {composicaoPorTipo.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                  <span className="font-medium">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de posições */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : enriched.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <TrendingUp size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Nenhum investimento cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Investimento" para começar</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {enriched.map((inv, i) => (
            <PosicaoCard key={inv.id} inv={inv} events={eventsByInv[inv.id] ?? []} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      )}

      {modalOpen && <NovoInvestimentoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}