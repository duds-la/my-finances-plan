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
  useInvestments, useCreateInvestment, useDeleteInvestment,
  useCreateIncome, useDeleteIncome,
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

const EVENT_KIND_CONFIG = {
  aporte:     { label: "Aporte",     color: "#22d3ee", bg: "bg-cyan-500/10",    text: "text-cyan-400",    icon: PlusCircle,    sign: +1 },
  rendimento: { label: "Rendimento", color: "#4ade80", bg: "bg-emerald-500/10", text: "text-emerald-500", icon: ArrowUpRight,  sign: +1 },
  resgate:    { label: "Resgate",    color: "#f87171", bg: "bg-rose-500/10",    text: "text-rose-400",    icon: ArrowDownLeft, sign: -1 },
} as const
type EventKind = keyof typeof EVENT_KIND_CONFIG

// ── Wrapper de modal mobile-safe ──────────────────────────────────────────────

function ModalSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Modal: Novo Investimento ──────────────────────────────────────────────────
// NOTA: InvestmentCreate NÃO tem campo "nome" — backend não suporta

function NovoInvestimentoModal({ onClose }: { onClose: () => void }) {
  const { data: tipos = [] } = useInvestmentTypes()
  const { ativas: metas = [] } = useGoals()
  const createMut = useCreateInvestment()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    investment_type_id: "",
    invested_value: "",
    application_date: today,
    interest_rate: "",
    maturity_date: "",
    finalidade: "",
    goal_id: "",
    status: "ativo",
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  // Válido quando tem tipo e valor preenchidos
  const isValid = form.investment_type_id !== "" && form.invested_value.trim() !== ""

  const handleSubmit = () => {
    if (!isValid) return
    createMut.mutate(
      {
        investment_type_id: Number(form.investment_type_id),
        invested_value:     Number(form.invested_value.replace(",", ".")),
        application_date:   form.application_date,
        // Divide por 100 para evitar overflow no NUMERIC(5,4)
        interest_rate:      form.interest_rate ? Number(form.interest_rate) / 100 : undefined,
        maturity_date:      form.maturity_date || undefined,
        finalidade:         form.finalidade || undefined,
        goal_id:            form.goal_id ? Number(form.goal_id) : undefined,
        status:             form.status,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
        <h2 className="text-base font-semibold">Novo Investimento</h2>
        <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Tipo de investimento */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Investimento *</label>
          <select value={form.investment_type_id} onChange={set("investment_type_id")}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Selecione um tipo</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
          </select>
        </div>

        {/* Valor investido */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Investido (R$) *</label>
          <Input type="number" step="0.01" placeholder="0,00"
            value={form.invested_value} onChange={set("invested_value")} className="h-10 text-sm" />
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aplicação</label>
            <Input type="date" value={form.application_date} onChange={set("application_date")} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimento</label>
            <Input type="date" value={form.maturity_date} onChange={set("maturity_date")} className="h-10 text-sm" />
          </div>
        </div>

        {/* Taxa */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de Juros (% a.a.)</label>
          <Input type="number" step="0.01" placeholder="Ex: 13.5"
            value={form.interest_rate} onChange={set("interest_rate")} className="h-10 text-sm" />
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

        {/* Meta */}
        {metas.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Target size={11} /> Vincular à Meta
            </label>
            <select value={form.goal_id} onChange={set("goal_id")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Sem meta</option>
              {metas.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.title} — R$ {Number(m.target_value).toLocaleString("pt-BR")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
        <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 h-10" onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
          {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </ModalSheet>
  )
}

// ── Modal: Registrar Evento ───────────────────────────────────────────────────

function NovoEventoModal({
  investment, incomeTypes, onClose,
}: {
  investment: InvestmentEnriched
  incomeTypes: Array<{ id: number; description: string }>
  onClose: () => void
}) {
  const createMut = useCreateIncome()
  const today = new Date().toISOString().slice(0, 10)
  const [kind, setKind] = useState<EventKind>("rendimento")
  const [form, setForm] = useState({ income_value: "", income_date: today, ir_withheld: "" })

  const cfg = EVENT_KIND_CONFIG[kind]

  const tiposFiltrados = incomeTypes.filter(t =>
    t.description.toLowerCase().includes(
      kind === "aporte" ? "aporte" : kind === "rendimento" ? "rendimento" : "resgate"
    )
  )
  const income_type_id = tiposFiltrados[0]?.id
  const isValid = form.income_value.trim() !== "" && !!income_type_id

  const handleSubmit = () => {
    if (!isValid) return
    const raw = Number(form.income_value.replace(",", "."))
    createMut.mutate(
      {
        investment_id:  investment.id,
        income_type_id: income_type_id!,
        income_value:   cfg.sign * Math.abs(raw),
        income_date:    form.income_date,
        ir_withheld:    form.ir_withheld ? Number(form.ir_withheld) : 0,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
        <h2 className="text-base font-semibold">Registrar Evento</h2>
        <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Seletor de tipo */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(EVENT_KIND_CONFIG) as [EventKind, typeof EVENT_KIND_CONFIG[EventKind]][]).map(([k, c]) => (
            <button key={k} onClick={() => setKind(k)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-xs font-medium",
                kind === k ? `border-transparent ${c.bg} ${c.text}` : "border-border text-muted-foreground hover:bg-muted"
              )}>
              <c.icon size={16} />
              {c.label}
            </button>
          ))}
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {investment.typeName}{investment.finalidade ? ` · ${investment.finalidade}` : ""}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor (R$)</label>
          <Input type="number" step="0.01" placeholder="0,00"
            value={form.income_value}
            onChange={e => setForm(f => ({ ...f, income_value: e.target.value }))}
            className="h-10 text-sm" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data</label>
          <Input type="date" value={form.income_date}
            onChange={e => setForm(f => ({ ...f, income_date: e.target.value }))}
            className="h-10 text-sm" />
        </div>

        {kind !== "aporte" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IR Retido (R$) — opcional</label>
            <Input type="number" step="0.01" placeholder="0,00"
              value={form.ir_withheld}
              onChange={e => setForm(f => ({ ...f, ir_withheld: e.target.value }))}
              className="h-10 text-sm" />
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
        <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
        <Button
          className={cn("flex-1 h-10",
            kind === "resgate" ? "bg-rose-500 hover:bg-rose-600" :
            kind === "aporte"  ? "bg-cyan-500 hover:bg-cyan-600" : "")}
          onClick={handleSubmit} disabled={!isValid || createMut.isPending}>
          {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : `Registrar ${cfg.label}`}
        </Button>
      </div>
    </ModalSheet>
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
  const deleteInvMut = useDeleteInvestment()
  const deleteIncMut = useDeleteIncome()

  const statusColors: Record<string, string> = {
    ativo:     "text-emerald-500 bg-emerald-500/10",
    vencido:   "text-amber-500  bg-amber-500/10",
    resgatado: "text-muted-foreground bg-muted",
  }

  const getKind = (ev: Income): EventKind => {
    const desc = incomeTypes.find(t => t.id === ev.income_type_id)?.description.toLowerCase() ?? ""
    if (desc.includes("aporte"))  return "aporte"
    if (desc.includes("resgate")) return "resgate"
    return "rendimento"
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.income_date).getTime() - new Date(a.income_date).getTime()
  )

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
        <div className="h-0.5 w-full" style={{ background: color }} />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 text-[11px] font-bold text-white"
                style={{ backgroundColor: color }}>
                {(inv.typeAcronym ?? "??").slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {inv.finalidade ? `${inv.typeName} (${inv.finalidade})` : inv.typeName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Desde {new Date(inv.application_date).toLocaleDateString("pt-BR")}
                  {inv.interest_rate ? ` · ${fmtPct(Number(inv.interest_rate) * 100)} a.a.` : ""}
                </p>
              </div>
            </div>
            <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0", statusColors[inv.status ?? "ativo"])}>
              {inv.status ?? "ativo"}
            </span>
          </div>

          {/* Valores — usa totalIncome (não totalGains que não existe) */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Investido",   value: fmtBRL(inv.totalInvested), color: "text-foreground" },
              { label: "Atual",       value: fmtBRL(inv.currentValue),  color: "text-foreground" },
              { label: "Rendimento",  value: fmtBRL(inv.totalIncome),   color: inv.totalIncome >= 0 ? "text-emerald-500" : "text-rose-400" },
            ].map(({ label, value, color: c }) => (
              <div key={label} className="rounded-lg bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className={cn("text-xs font-semibold mt-0.5", c)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1"
              onClick={() => setEventoModal(true)}>
              <Plus size={12} /> Evento
            </Button>
            <button onClick={() => setExpanded(e => !e)}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {confirmDel ? (
              <>
                <button onClick={() => deleteInvMut.mutate(inv.id)}
                  className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                  <X size={14} />
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Histórico expandido */}
          {expanded && (
            <div className="pt-2 space-y-1.5 border-t border-border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Histórico ({sortedEvents.length})
              </p>
              {sortedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhum evento registrado</p>
              ) : (
                sortedEvents.map(ev => {
                  const k = getKind(ev)
                  const cfg = EVENT_KIND_CONFIG[k]
                  return (
                    <div key={ev.id} className="group flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                      <div className={cn("flex size-6 items-center justify-center rounded-md shrink-0", cfg.bg)}>
                        <cfg.icon size={10} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{cfg.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ev.income_date).toLocaleDateString("pt-BR")}
                          {ev.ir_withheld ? ` · IR: ${fmtBRL(Number(ev.ir_withheld))}` : ""}
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
      </div>

      {eventoModal && (
        <NovoEventoModal investment={inv} incomeTypes={incomeTypes} onClose={() => setEventoModal(false)} />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InvestimentosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const {
    investments, eventsByInv, incomeTypes,
    totalInvestido, totalAtual, totalRendimentos,
    composicaoPorFinalidade, isLoading,
  } = useInvestments()

  const rentGlobal = totalInvestido > 0
    ? ((totalAtual - totalInvestido) / totalInvestido) * 100
    : 0

  const pieData = Object.entries(composicaoPorFinalidade).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
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
        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
          <TrendingUp size={32} className="mb-3 opacity-20" />
          Nenhum investimento cadastrado
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { icon: DollarSign,   label: "Investido",     value: fmtBRL(totalInvestido),  color: "text-foreground" },
              { icon: TrendingUp,   label: "Valor Atual",   value: fmtBRL(totalAtual),       color: "text-foreground" },
              { icon: ArrowUpRight, label: "Rendimentos",   value: fmtBRL(totalRendimentos), color: "text-emerald-500" },
              { icon: TrendingUp,   label: "Rentabilidade", value: fmtPct(rentGlobal),       color: rentGlobal >= 0 ? "text-emerald-500" : "text-rose-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className="text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                </div>
                <p className={cn("text-sm font-bold", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          {pieData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Composição por Finalidade
              </p>
              <div className="flex items-center gap-4">
                <div className="h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48} strokeWidth={0}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 min-w-0">
                      <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                      <span className="text-xs font-medium ml-auto">{fmtBRL(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lista */}
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