import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  TrendingUp, DollarSign, Plus, X, Loader2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft,
  Trash2, Tag, Target, PlusCircle,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useInvestments, useCreateInvestment, useUpdateInvestment,
  useDeleteInvestment, useCreateIncome, useDeleteIncome,
  type InvestmentEnriched, type Income,
} from "@/hooks/api/useInvestments"
import { useInvestmentTypes } from "@/hooks/api/useCategorias"
import { useGoals } from "@/hooks/api/useGoals"

export const Route = createFileRoute("/_layout/investimentos")({
  component: InvestimentosPage,
  head: () => ({ meta: [{ title: "Investimentos — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number) => `${Number(v).toFixed(2)}%`

const COLORS = ["#4ade80", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171", "#fb923c"]

const FINALIDADES = ["R.E", "Carro", "Apartamento", "Viagem", "Livre"]

// Tipo de evento com cor e rótulo
const EVENT_KIND_CONFIG = {
  aporte:     { label: "Aporte",     color: "#22d3ee", bg: "bg-cyan-500/10",    text: "text-cyan-400",    icon: PlusCircle,      sign: +1 },
  rendimento: { label: "Rendimento", color: "#4ade80", bg: "bg-emerald-500/10", text: "text-emerald-500", icon: ArrowUpRight,    sign: +1 },
  resgate:    { label: "Resgate",    color: "#f87171", bg: "bg-rose-500/10",    text: "text-rose-400",    icon: ArrowDownLeft,   sign: -1 },
} as const
type EventKind = keyof typeof EVENT_KIND_CONFIG

// ── Modal: Novo Investimento ──────────────────────────────────────────────────

function NovoInvestimentoModal({ onClose }: { onClose: () => void }) {
  const { data: tipos = [] } = useInvestmentTypes()
  const { ativas: metas = [] } = useGoals()
  const createMut = useCreateInvestment()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    investment_type_id: "",
    nome: "",
    invested_value: "",
    application_date: today,
    interest_rate: "",
    maturity_date: "",
    finalidade: "",
    goal_id: "",
    status: "ativo",
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const isValid = form.investment_type_id !== "" && form.invested_value.trim() !== "" && form.nome.trim() !== ""

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate({
      investment_type_id: Number(form.investment_type_id),
      invested_value:     Number(form.invested_value.replace(",", ".")),
      application_date:   form.application_date,
      interest_rate:      form.interest_rate ? Number(form.interest_rate.replace(",", ".")) / 100 : undefined,
      maturity_date:      form.maturity_date || undefined,
      finalidade:         form.finalidade || undefined,
      goal_id:            form.goal_id ? Number(form.goal_id) : undefined,
      status:             "ativo",
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
              <select value={form.investment_type_id} onChange={set("investment_type_id")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.description} ({t.acronym})</option>)}
              </select>
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome / Identificação</label>
              <Input placeholder="ex: CDB - NU (R.E)" value={form.nome} onChange={set("nome")} className="h-10 text-sm" />
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor (R$)</label>
                <Input placeholder="0,00" value={form.invested_value} type="number" step="0.01" min="0"
                  onChange={set("invested_value")} className="h-10 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data</label>
                <Input type="date" value={form.application_date} onChange={set("application_date")} className="h-10 text-sm" />
              </div>
            </div>

            {/* Taxa + Vencimento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa % a.a.</label>
                <Input placeholder="ex: 13.5" value={form.interest_rate} type="number" step="0.01"
                  onChange={set("interest_rate")} className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimento</label>
                <Input type="date" value={form.maturity_date} onChange={set("maturity_date")} className="h-10 text-sm" />
              </div>
            </div>

            {/* Finalidade */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Tag size={11} /> Finalidade
              </label>
              <select value={form.finalidade} onChange={set("finalidade")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Sem finalidade</option>
                {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Meta vinculada */}
            {metas.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Target size={11} /> Vincular à Meta
                </label>
                <select value={form.goal_id} onChange={set("goal_id")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sem meta</option>
                  {metas.map(m => <option key={m.id} value={m.id}>{m.name ?? m.title} — R$ {Number(m.target_value).toLocaleString("pt-BR")}</option>)}
                </select>
              </div>
            )}
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

// ── Modal: Registrar Evento (Aporte / Rendimento / Resgate) ───────────────────

function NovoEventoModal({
  investment, incomeTypes, onClose,
}: {
  investment: InvestmentEnriched
  incomeTypes: Array<{ id: number; description: string }>
  onClose: () => void
}) {
  const createMut = useCreateIncome()
  const today     = new Date().toISOString().slice(0, 10)

  const [kind, setKind]   = useState<EventKind>("rendimento")
  const [form, setForm]   = useState({ income_value: "", income_date: today, ir_withheld: "" })

  const cfg = EVENT_KIND_CONFIG[kind]

  // Filtra income_types pelo kind selecionado
  const tiposFiltrados = incomeTypes.filter(t =>
    t.description.toLowerCase().includes(kind === "aporte" ? "aporte" : kind === "rendimento" ? "rendimento" : "resgate")
  )
  const [income_type_id, setIncomeTypeId] = useState("")

  // Se só tem 1 tipo, seleciona automaticamente
  const typeId = tiposFiltrados.length === 1
    ? tiposFiltrados[0].id
    : income_type_id ? Number(income_type_id) : 0

  const isValid = form.income_value.trim() !== "" && typeId > 0

  const handleSubmit = () => {
    if (!isValid) return
    const raw  = Number(form.income_value.replace(",", "."))
    const val  = kind === "resgate" ? -Math.abs(raw) : Math.abs(raw)
    createMut.mutate({
      investment_id:  investment.id,
      income_type_id: typeId,
      income_date:    form.income_date,
      income_value:   val,
      ir_withheld:    form.ir_withheld ? Number(form.ir_withheld.replace(",", ".")) : undefined,
    }, { onSuccess: onClose })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl my-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <h2 className="text-base font-semibold">Registrar Movimento</h2>
            <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            {/* Seletor de tipo de evento */}
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(EVENT_KIND_CONFIG) as [EventKind, typeof EVENT_KIND_CONFIG[EventKind]][]).map(([k, c]) => (
                <button key={k} onClick={() => { setKind(k); setIncomeTypeId("") }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-all",
                    kind === k
                      ? `${c.bg} ${c.text} border-current`
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}>
                  <c.icon size={16} />
                  {c.label}
                </button>
              ))}
            </div>

            {/* Descrição do tipo selecionado */}
            <div className={cn("rounded-lg p-3 text-xs", cfg.bg, cfg.text)}>
              {kind === "aporte" && "Dinheiro novo que você está colocando no investimento. Aumenta o valor principal."}
              {kind === "rendimento" && "Juros ou lucros gerados pelo investimento. Não saiu do seu bolso."}
              {kind === "resgate" && "Retirada de dinheiro do investimento. Reduz o valor total."}
            </div>

            {/* Se houver múltiplos tipos, selecionar */}
            {tiposFiltrados.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo específico</label>
                <select value={income_type_id} onChange={e => setIncomeTypeId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione...</option>
                  {tiposFiltrados.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
                </select>
              </div>
            )}

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

            {/* IR retido (só para rendimento/resgate) */}
            {kind !== "aporte" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IR Retido (R$)</label>
                <Input placeholder="0,00 (opcional)" value={form.ir_withheld} type="number" step="0.01" min="0"
                  onChange={e => setForm(f => ({ ...f, ir_withheld: e.target.value }))}
                  className="h-10 text-sm" />
              </div>
            )}

            {/* Preview do impacto */}
            {form.income_value && (
              <div className={cn("rounded-lg p-3 flex items-center justify-between text-sm font-medium border", cfg.bg)}>
                <span className="text-muted-foreground text-xs">Valor atual após registro</span>
                <span className={cfg.text}>
                  {fmtBRL(investment.currentValue + cfg.sign * Math.abs(Number(form.income_value.replace(",", "."))))}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
            <Button className={cn("flex-1 h-10", kind === "resgate" ? "bg-rose-500 hover:bg-rose-600" : kind === "aporte" ? "bg-cyan-500 hover:bg-cyan-600" : "")}
              onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : `Registrar ${cfg.label}`}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Card de posição ───────────────────────────────────────────────────────────

function PosicaoCard({
  inv, events, incomeTypes, color,
}: {
  inv: InvestmentEnriched
  events: Income[]
  incomeTypes: Array<{ id: number; description: string }>
  color: string
}) {
  const [expanded,    setExpanded]    = useState(false)
  const [eventoModal, setEventoModal] = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const deleteInvMut  = useDeleteInvestment()
  const deleteIncMut  = useDeleteIncome()

  const statusColors: Record<string, string> = {
    ativo:     "text-emerald-500 bg-emerald-500/10",
    vencido:   "text-amber-500  bg-amber-500/10",
    resgatado: "text-muted-foreground bg-muted",
  }

  // Classifica cada evento pelo tipo
  const getKind = (ev: Income): EventKind => {
    const desc = incomeTypes.find(t => t.id === ev.income_type_id)?.description.toLowerCase() ?? ""
    if (desc.includes("aporte"))     return "aporte"
    if (desc.includes("resgate"))    return "resgate"
    return "rendimento"
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.income_date).getTime() - new Date(a.income_date).getTime()
  )

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
        {/* Barra de cor no topo */}
        <div className="h-0.5 w-full" style={{ background: color }} />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 text-[11px] font-bold text-white"
                style={{ backgroundColor: color }}>
                {inv.typeAcronym.slice(0, 2)}
              </div>
              <div className="min-w-0">
                {/* Nome real do investimento (finalidade) ou tipeName */}
                <p className="text-sm font-semibold truncate">
                  {inv.finalidade ? `${inv.typeName} (${inv.finalidade})` : inv.typeName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Desde {new Date(inv.application_date).toLocaleDateString("pt-BR")}
                  {inv.interest_rate ? ` · ${(Number(inv.interest_rate) * 100).toFixed(2)}% a.a.` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {inv.finalidade && (
                <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                  {inv.finalidade}
                </span>
              )}
              <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", statusColors[inv.status] ?? "bg-muted text-muted-foreground")}>
                {inv.status}
              </span>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/40 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Aportado</p>
              <p className="text-xs font-semibold">{fmtBRL(inv.totalInvested)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Rendimento</p>
              <p className={cn("text-xs font-semibold", inv.totalIncome >= 0 ? "text-emerald-500" : "text-rose-400")}>
                {inv.totalIncome >= 0 ? "+" : ""}{fmtBRL(inv.totalIncome)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Valor Atual</p>
              <p className="text-xs font-bold text-primary">{fmtBRL(inv.currentValue)}</p>
            </div>
          </div>

          {/* Rentabilidade */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Rentabilidade</span>
            <span className={cn("font-semibold", inv.rentabilidadePct >= 0 ? "text-emerald-500" : "text-rose-400")}>
              {inv.rentabilidadePct >= 0 ? "+" : ""}{fmtPct(inv.rentabilidadePct)}
            </span>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => setEventoModal(true)}>
              <Plus size={12} /> Movimento
            </Button>
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 rounded-md px-2.5 h-8 text-xs text-muted-foreground hover:bg-muted transition-colors">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {events.length} eventos
            </button>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                <Trash2 size={13} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => deleteInvMut.mutate(inv.id)}
                  className="text-[10px] font-medium text-rose-500 hover:underline">
                  {deleteInvMut.isPending ? <Loader2 size={10} className="animate-spin" /> : "Confirmar"}
                </button>
                <span className="text-muted-foreground text-[10px]">/</span>
                <button onClick={() => setConfirmDel(false)} className="text-[10px] text-muted-foreground hover:underline">
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de eventos */}
        {expanded && (
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Histórico</p>
            {sortedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhum movimento registrado.</p>
            ) : (
              sortedEvents.map(ev => {
                const k   = getKind(ev)
                const cfg = EVENT_KIND_CONFIG[k]
                const Icon = cfg.icon
                return (
                  <div key={ev.id} className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted/40 transition-colors">
                    <div className={cn("flex size-6 items-center justify-center rounded-md shrink-0", cfg.bg)}>
                      <Icon size={11} className={cfg.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium", cfg.text)}>{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ev.income_date).toLocaleDateString("pt-BR")}
                        {ev.ir_withheld && Number(ev.ir_withheld) > 0 ? ` · IR: ${fmtBRL(Number(ev.ir_withheld))}` : ""}
                      </p>
                    </div>
                    <span className={cn("text-xs font-semibold shrink-0", cfg.text)}>
                      {Number(ev.income_value) >= 0 ? "+" : "−"}{fmtBRL(Number(ev.income_value))}
                    </span>
                    <button onClick={() => deleteIncMut.mutate(ev.id)}
                      className="opacity-0 group-hover:opacity-100 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0">
                      <Trash2 size={10} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {eventoModal && (
        <NovoEventoModal
          investment={inv}
          incomeTypes={incomeTypes}
          onClose={() => setEventoModal(false)}
        />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InvestimentosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const {
    investments, eventsByInv, incomeTypes, incomeTypeMap,
    totalInvestido, totalAtual, totalRendimentos,
    composicaoPorFinalidade, isLoading,
  } = useInvestments()

  const rentGlobal = totalInvestido > 0
    ? ((totalAtual - totalInvestido) / totalInvestido) * 100
    : 0

  const pieData = Object.entries(composicaoPorFinalidade).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4 p-4 pb-24 sm:space-y-5 sm:p-6 sm:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Investimentos</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando..." : `${investments.length} posição${investments.length !== 1 ? "ões" : ""}`}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Novo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : investments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <TrendingUp size={32} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum investimento cadastrado.</p>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 mt-1">
            <Plus size={13} /> Cadastrar primeiro investimento
          </Button>
        </div>
      ) : (
        <>
          {/* KPIs globais */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Aportado",    value: fmtBRL(totalInvestido),   color: "text-foreground",    icon: DollarSign },
              { label: "Valor Atual", value: fmtBRL(totalAtual),        color: "text-primary",       icon: TrendingUp },
              { label: "Rendimento",  value: fmtBRL(totalRendimentos),  color: totalRendimentos >= 0 ? "text-emerald-500" : "text-rose-400", icon: TrendingUp },
              { label: "Rentab.",     value: `${rentGlobal >= 0 ? "+" : ""}${fmtPct(rentGlobal)}`, color: rentGlobal >= 0 ? "text-emerald-500" : "text-rose-400", icon: TrendingUp },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className={cn("text-sm font-bold mt-0.5", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Composição por finalidade */}
          {pieData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Composição por Finalidade</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={50} strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="size-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{fmtBRL(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cards de posição */}
          <div className="space-y-3">
            {investments.map((inv, i) => (
              <PosicaoCard
                key={inv.id}
                inv={inv}
                events={eventsByInv[inv.id] ?? []}
                incomeTypes={incomeTypes}
                color={COLORS[i % COLORS.length]}
              />
            ))}
          </div>
        </>
      )}

      {modalOpen && <NovoInvestimentoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}