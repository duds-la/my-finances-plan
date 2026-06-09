import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
  TrendingUp, DollarSign, Plus, X, Loader2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft,
  Trash2, Tag, Target, PlusCircle, Eye, Share2,
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
import { useSharedInvestments } from "@/hooks/api/useGuestAccess"
import { useInvestmentTypes } from "@/hooks/api/useCategorias"
import { useGoals } from "@/hooks/api/useGoals"
import { useUserContext } from "@/contexts/UserContext"

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

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function ModalSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Card de investimento (somente leitura para convidados) ────────────────────

function InvestimentoCardReadOnly({ inv }: { inv: any }) {
  const currentValue = Number(inv.current_value ?? inv.invested_value)
  const totalInvested = Number(inv.invested_value)
  const rentPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
  const positivo = rentPct >= 0

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate">
                {inv.finalidade ?? "Investimento"}
              </p>
              <span className="flex items-center gap-0.5 rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-500 shrink-0">
                <Share2 size={9} /> compartilhado
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Aplicado em {new Date(inv.application_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <div className={cn("text-right shrink-0", positivo ? "text-emerald-500" : "text-rose-400")}>
          <p className="text-xs font-semibold">{positivo ? "+" : ""}{fmtPct(rentPct)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Investido</p>
          <p className="text-sm font-semibold">{fmtBRL(totalInvested)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Valor atual</p>
          <p className="text-sm font-semibold">{fmtBRL(currentValue)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Eye size={12} /> Somente visualização
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function InvestimentosPage() {
  const { isGuest } = useUserContext()
  const [modalOpen, setModalOpen] = useState(false)

  // ── Modo convidado ──────────────────────────────────────────────────────────
  const { data: sharedInvs = [], isLoading: loadingGuest } = useSharedInvestments(isGuest)

  if (isGuest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Investimentos Compartilhados</h1>
            <p className="text-xs text-muted-foreground">
              {loadingGuest ? "Carregando..." : `${sharedInvs.length} posição${sharedInvs.length !== 1 ? "ões" : ""} · somente visualização`}
            </p>
          </div>
        </div>

        {/* Banner */}
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <Share2 size={14} className="text-cyan-500 shrink-0" />
          <p className="text-xs text-cyan-600 dark:text-cyan-400">
            Você está visualizando investimentos compartilhados com você.
          </p>
        </div>

        {loadingGuest ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : sharedInvs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <TrendingUp size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum investimento compartilhado com você ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sharedInvs.map((inv: any) => (
              <InvestimentoCardReadOnly key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Modo normal (dono) ─────────────────────────────────────────────────────
  // Importa o componente completo somente quando não é convidado
  return <InvestimentosCompleto />
}

// ── Página completa para o dono ───────────────────────────────────────────────
// (mantém todo o código original da página de investimentos)

function InvestimentosCompleto() {
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
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <TrendingUp size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum investimento cadastrado ainda.</p>
          <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Adicionar primeiro
          </Button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Investido", value: fmtBRL(totalInvestido), color: "text-foreground" },
              { label: "Atual",     value: fmtBRL(totalAtual),     color: "text-foreground" },
              { label: "Retorno",   value: `${rentGlobal >= 0 ? "+" : ""}${fmtPct(rentGlobal)}`, color: rentGlobal >= 0 ? "text-emerald-500" : "text-rose-400" },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">{k.label}</p>
                <p className={cn("text-sm font-semibold", k.color)}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          <div className="space-y-3">
            {investments.map((inv) => (
              <InvestimentoCardOwner key={inv.id} inv={inv} eventsByInv={eventsByInv} incomeTypes={incomeTypes} />
            ))}
          </div>
        </>
      )}

      {modalOpen && <NovoInvestimentoModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

// ── Card do dono (versão completa) ────────────────────────────────────────────

function InvestimentoCardOwner({ inv, eventsByInv, incomeTypes }: {
  inv: InvestmentEnriched
  eventsByInv: Record<number, Income[]>
  incomeTypes: any[]
}) {
  const [open, setOpen] = useState(false)
  const [eventoModal, setEventoModal] = useState(false)
  const deleteMut = useDeleteInvestment()

  const events = eventsByInv[inv.id] ?? []
  const positivo = inv.rentabilidadePct >= 0

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-semibold truncate">{inv.typeName}</p>
              {inv.finalidade && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground shrink-0">
                  <Tag size={9} />{inv.finalidade}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(inv.application_date + "T00:00:00").toLocaleDateString("pt-BR")}
              {inv.maturity_date && ` → ${new Date(inv.maturity_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold">{fmtBRL(inv.currentValue)}</p>
            <p className={cn("text-xs font-medium", positivo ? "text-emerald-500" : "text-rose-400")}>
              {positivo ? "+" : ""}{fmtPct(inv.rentabilidadePct)}
            </p>
          </div>
        </div>

        {/* Expandir */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {events.length} evento{events.length !== 1 ? "s" : ""}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEventoModal(true)}
              className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Plus size={11} /> Evento
            </button>
            <button
              onClick={() => deleteMut.mutate(inv.id)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Eventos */}
        {open && events.length > 0 && (
          <div className="border-t border-border divide-y divide-border">
            {events.map(ev => {
              const typeName = incomeTypes.find(t => t.id === ev.income_type_id)?.description?.toLowerCase() ?? ""
              const kind: EventKind = typeName.includes("resgate") ? "resgate"
                : typeName.includes("rendimento") ? "rendimento" : "aporte"
              const cfg = EVENT_KIND_CONFIG[kind]
              const Icon = cfg.icon
              return (
                <div key={ev.id} className={cn("group flex items-center gap-3 px-4 py-2.5", cfg.bg)}>
                  <div className={cn("flex size-6 items-center justify-center rounded-lg shrink-0", cfg.bg)}>
                    <Icon size={12} className={cfg.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{cfg.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ev.income_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {ev.ir_withheld ? ` · IR: ${fmtBRL(Number(ev.ir_withheld))}` : ""}
                    </p>
                  </div>
                  <span className={cn("text-xs font-semibold shrink-0", cfg.text)}>
                    {Number(ev.income_value) >= 0 ? "+" : "−"}{fmtBRL(Number(ev.income_value))}
                  </span>
                  <button onClick={() => useDeleteIncome().mutate(ev.id)}
                    className="opacity-0 group-hover:opacity-100 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0">
                    <Trash2 size={10} />
                  </button>
                </div>
              )
            })}
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

// ── Modal: Novo Investimento ──────────────────────────────────────────────────

function NovoInvestimentoModal({ onClose }: { onClose: () => void }) {
  const { data: types = [] } = useInvestmentTypes()
  const { goals = [] } = useGoals()
  const createMut = useCreateInvestment()

  const [form, setForm] = useState({
    investment_type_id: "",
    invested_value: "",
    application_date: new Date().toISOString().slice(0, 10),
    interest_rate: "",
    maturity_date: "",
    finalidade: "",
    goal_id: "",
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  function handleSubmit() {
    if (!form.investment_type_id || !form.invested_value) return
    createMut.mutate({
      investment_type_id: Number(form.investment_type_id),
      invested_value: Number(form.invested_value.replace(",", ".")),
      application_date: form.application_date,
      interest_rate: form.interest_rate ? Number(form.interest_rate) / 100 : undefined,
      maturity_date: form.maturity_date || undefined,
      finalidade: form.finalidade || undefined,
      goal_id: form.goal_id ? Number(form.goal_id) : undefined,
    }, { onSuccess: onClose })
  }

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold">Novo Investimento</h2>
        <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <select value={form.investment_type_id} onChange={set("investment_type_id")}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Tipo de investimento...</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.description} ({t.acronym})</option>)}
        </select>
        <Input placeholder="Valor aplicado (R$)" type="number" value={form.invested_value} onChange={set("invested_value")} className="h-9 text-sm" />
        <Input placeholder="Data de aplicação" type="date" value={form.application_date} onChange={set("application_date")} className="h-9 text-sm" />
        <Input placeholder="Taxa de juros (% a.a.) — opcional" type="number" value={form.interest_rate} onChange={set("interest_rate")} className="h-9 text-sm" />
        <Input placeholder="Vencimento — opcional" type="date" value={form.maturity_date} onChange={set("maturity_date")} className="h-9 text-sm" />
        <select value={form.finalidade} onChange={set("finalidade")}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Finalidade — opcional</option>
          {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={form.goal_id} onChange={set("goal_id")}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Vincular a uma meta — opcional</option>
          {goals.filter(g => g.status === "em_andamento").map(g => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 shrink-0 px-5 py-4 border-t border-border">
        <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={createMut.isPending}>
          {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Adicionar"}
        </Button>
      </div>
    </ModalSheet>
  )
}

// ── Modal: Novo Evento ────────────────────────────────────────────────────────

function NovoEventoModal({ investment, incomeTypes, onClose }: {
  investment: InvestmentEnriched
  incomeTypes: any[]
  onClose: () => void
}) {
  const createIncMut = useCreateIncome()
  const [form, setForm] = useState({
    income_type_id: "",
    income_value: "",
    income_date: new Date().toISOString().slice(0, 10),
    ir_withheld: "",
  })

  function handleSubmit() {
    if (!form.income_type_id || !form.income_value) return
    createIncMut.mutate({
      investment_id: investment.id,
      income_type_id: Number(form.income_type_id),
      income_value: Number(form.income_value.replace(",", ".")),
      income_date: form.income_date,
      ir_withheld: form.ir_withheld ? Number(form.ir_withheld) : undefined,
    }, { onSuccess: onClose })
  }

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">Registrar Evento</h2>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{investment.typeName}</p>
        </div>
        <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <select value={form.income_type_id} onChange={e => setForm(p => ({ ...p, income_type_id: e.target.value }))}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Tipo de evento...</option>
          {incomeTypes.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
        </select>
        <Input placeholder="Valor (R$)" type="number" value={form.income_value}
          onChange={e => setForm(p => ({ ...p, income_value: e.target.value }))} className="h-9 text-sm" />
        <Input placeholder="Data" type="date" value={form.income_date}
          onChange={e => setForm(p => ({ ...p, income_date: e.target.value }))} className="h-9 text-sm" />
        <Input placeholder="IR retido (R$) — opcional" type="number" value={form.ir_withheld}
          onChange={e => setForm(p => ({ ...p, ir_withheld: e.target.value }))} className="h-9 text-sm" />
      </div>
      <div className="flex gap-2 shrink-0 px-5 py-4 border-t border-border">
        <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={createIncMut.isPending}>
          {createIncMut.isPending ? <Loader2 size={14} className="animate-spin" /> : "Confirmar"}
        </Button>
      </div>
    </ModalSheet>
  )
}