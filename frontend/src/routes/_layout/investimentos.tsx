import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useMemo } from "react"
import {
  TrendingUp, DollarSign, Plus, X, Loader2,
  ChevronDown, ArrowUpRight, ArrowDownLeft,
  Trash2, Tag, Target, PlusCircle, Eye,
  Sparkles, Zap, Activity, Globe, Star, Shield,
} from "lucide-react"
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis } from "recharts"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  useInvestments, useCreateInvestment, useDeleteInvestment,
  useCreateIncome,
  type InvestmentEnriched, type Income,
} from "@/hooks/api/useInvestments"
import { useSharedInvestments } from "@/hooks/api/useGuestAccess"
import { useInvestmentTypes } from "@/hooks/api/useCategorias"
import { useGoals } from "@/hooks/api/useGoals"
import { useUserContext } from "@/contexts/UserContext"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/investimentos")({
  component: InvestimentosPage,
  head: () => ({ meta: [{ title: "Investimentos — FinanceOS" }] }),
})

/* ════════════════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════════════════ */

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number) => `${Number(v || 0).toFixed(2)}%`

const PALETTE = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#fb923c"]

const FINALIDADES = ["R.E", "Carro", "Apartamento", "Viagem", "Livre"]

const EVENT_KIND_CONFIG = {
  aporte:     { label: "Aporte",     bg: "bg-cyan-500/10",    text: "text-cyan-400",    icon: PlusCircle,    sign: +1 },
  rendimento: { label: "Rendimento", bg: "bg-emerald-500/10", text: "text-emerald-500", icon: ArrowUpRight,  sign: +1 },
  resgate:    { label: "Resgate",    bg: "bg-pink-500/10",    text: "text-pink-400",    icon: ArrowDownLeft, sign: -1 },
} as const
type EventKind = keyof typeof EVENT_KIND_CONFIG

const gradientBtn =
  "flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
const gradientBtnStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--finance-green), var(--finance-cyan))",
  boxShadow: "0 4px 20px -4px var(--glow-primary)",
}

const inputClass =
  "w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"

/* ── Acesso defensivo aos hooks auxiliares ────────────────────────────────────
   Os hooks podem expor os dados como `{ data }` (react-query puro) ou como
   propriedade nomeada (`{ types }`, `{ goals }`). Estes wrappers aceitam os
   dois formatos e SEMPRE devolvem array — nunca undefined. Foi exatamente um
   `types.map` de um `types` undefined que derrubava a página no modal.       */

function useInvestmentTypesSafe(): any[] {
  const result = useInvestmentTypes() as any
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.types)) return result.types
  return []
}

function useGoalsSafe(): any[] {
  const result = useGoals() as any
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.goals)) return result.goals
  if (Array.isArray(result?.data)) return result.data
  return []
}

/* ════════════════════════════════════════════════════════════════════════════
   Wealth Orb (keyframes com prefixo inv- para não conflitar com o index.css)
   ════════════════════════════════════════════════════════════════════════════ */

function OrbStyles() {
  return (
    <style>{`
      @keyframes inv-pulse-ring {
        0%   { transform: scale(0.9); opacity: 0.6; }
        100% { transform: scale(1.4); opacity: 0; }
      }
      @keyframes inv-float-up {
        0%   { transform: translateY(0) scale(1); opacity: 0.8; }
        100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
      }
      @keyframes inv-scan-line {
        0%   { transform: translateY(-100%); opacity: 0; }
        10%  { opacity: 0.4; }
        90%  { opacity: 0.4; }
        100% { transform: translateY(100%); opacity: 0; }
      }
      @keyframes inv-orb-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(34,211,238,0.2); }
        50%      { box-shadow: 0 0 40px rgba(34,211,238,0.4), 0 0 60px rgba(167,139,250,0.2); }
      }
    `}</style>
  )
}

function WealthOrb({ value, maxValue }: { value: number; maxValue: number }) {
  const intensity = maxValue > 0 ? Math.min(value / maxValue, 1) : 0.5
  const size = 120 + intensity * 40
  const particleCount = Math.floor(4 + intensity * 8)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 80, height: size + 80 }}>
      <OrbStyles />

      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="absolute rounded-full border border-cyan-400/20"
          style={{
            width: size + i * 28,
            height: size + i * 28,
            animation: `inv-pulse-ring ${2 + i * 0.5}s ease-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, rgba(34,211,238,${0.25 + intensity * 0.15}), rgba(167,139,250,${0.2 + intensity * 0.1}) 50%, rgba(52,211,153,0.1) 100%)`,
          boxShadow: `0 0 ${30 + intensity * 30}px rgba(34,211,238,0.3), 0 0 ${60 + intensity * 40}px rgba(167,139,250,0.15), inset 0 0 ${20 + intensity * 20}px rgba(34,211,238,0.1)`,
          border: `1px solid rgba(34,211,238,${0.2 + intensity * 0.15})`,
          animation: "inv-orb-glow 3s ease-in-out infinite",
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full" style={{ opacity: 0.3 }}>
          <div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            style={{ animation: "inv-scan-line 4s linear infinite" }}
          />
        </div>
        <Activity size={28} className="text-cyan-400" style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.8))" }} />
      </div>

      {Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * 360
        const r = size * 0.65
        const x = Math.cos((angle * Math.PI) / 180) * r
        const y = Math.sin((angle * Math.PI) / 180) * r
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              background: PALETTE[i % PALETTE.length],
              left: "50%",
              top: "50%",
              transform: `translate(${x - 2}px, ${y - 2}px)`,
              boxShadow: `0 0 6px ${PALETTE[i % PALETTE.length]}`,
              animation: `inv-float-up ${2 + (i % 3) * 0.7}s ease-out infinite`,
              animationDelay: `${i * 0.25}s`,
              opacity: 0.7 + intensity * 0.3,
            }}
          />
        )
      })}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Componentes auxiliares
   ════════════════════════════════════════════════════════════════════════════ */

function MetricNode({
  label, value, sub, color = "#22d3ee", icon: Icon, delay = 0,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: any; delay?: number
}) {
  return (
    <div
      className="animate-fade-up relative flex flex-col gap-0.5 opacity-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        {Icon && (
          <div className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon size={10} style={{ color }} />
          </div>
        )}
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <span className="font-numeric text-xl font-bold leading-none tracking-tight text-foreground">{value}</span>
      {sub && <span className="mt-0.5 text-[11px]" style={{ color }}>{sub}</span>}
    </div>
  )
}

function ModalSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="pointer-events-none fixed inset-0 z-[61] flex items-end justify-center sm:items-center">
        <div className="glass-card animate-fade-up pointer-events-auto flex max-h-[90svh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-w-md sm:rounded-2xl">
          <div className="divider-glow shrink-0" />
          <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Cards de investimento
   ════════════════════════════════════════════════════════════════════════════ */

function InvestimentoCardReadOnly({ inv }: { inv: any }) {
  const currentValue = Number(inv?.current_value ?? inv?.currentValue ?? inv?.invested_value ?? 0)
  const investedValue = Number(inv?.invested_value ?? 0)
  const rent = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0
  const isPositive = rent >= 0
  const acronym = inv?.investment_type?.acronym ?? inv?.typeAcronym ?? "?"
  const color = PALETTE[Number(inv?.id ?? 0) % PALETTE.length]

  return (
    <div
      className="glass-card relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01]"
      style={{ border: `1px solid ${color}30` }}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, transform: "translate(-30%, -30%)" }} />

      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
          {acronym}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {inv?.investment_type?.description ?? inv?.typeName ?? "—"}
          </p>
          {inv?.finalidade && (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${color}15`, color }}>
              <Tag size={8} /> {inv.finalidade}
            </span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-numeric text-base font-bold text-foreground">{fmtBRL(currentValue)}</p>
          <p className={cn("font-numeric mt-0.5 text-xs font-medium", isPositive ? "text-emerald-500" : "text-rose-400")}>
            {isPositive ? "▲" : "▼"} {fmtPct(Math.abs(rent))}
          </p>
        </div>
      </div>
    </div>
  )
}

function InvestimentoCard({
  inv, eventsByInv, incomeTypes, goals, onDelete, onAddEvent,
}: {
  inv: InvestmentEnriched
  eventsByInv: Record<number, Income[]>
  incomeTypes: any[]
  goals: any[]
  onDelete: (id: number) => void
  onAddEvent: (inv: InvestmentEnriched) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const events = eventsByInv?.[inv.id] ?? []
  const isPositive = Number(inv.rentabilidadePct ?? 0) >= 0
  const color = PALETTE[Number(inv.id) % PALETTE.length]
  const goal = (goals ?? []).find(g => g?.id === inv.goal_id)

  const getEventKind = (incomeTypeId: number): EventKind => {
    const t = (incomeTypes ?? []).find(t => t?.id === incomeTypeId)
    if (!t) return "aporte"
    const d = String(t.description ?? "").toLowerCase()
    if (d.includes("rendimento")) return "rendimento"
    if (d.includes("resgate")) return "resgate"
    return "aporte"
  }

  return (
    <div
      className="glass-card relative overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        border: `1px solid ${color}25`,
        boxShadow: expanded ? `0 8px 40px rgba(0,0,0,0.35), 0 0 40px ${color}10` : undefined,
      }}
    >
      <div className="absolute left-0 right-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full opacity-[0.06]"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, transform: "translate(-30%,-30%)" }} />

      {/* Cabeçalho clicável */}
      <button className="relative w-full p-4 text-left" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
            {inv.typeAcronym ?? "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{inv.typeName ?? "Investimento"}</p>
              {inv.status !== "ativo" && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {inv.status}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {inv.finalidade && (
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: `${color}15`, color }}>
                  <Tag size={8} /> {inv.finalidade}
                </span>
              )}
              {goal && (
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                  <Target size={8} /> {goal.title}
                </span>
              )}
              {inv.maturity_date && (
                <span className="text-[10px] text-muted-foreground">
                  Vence {new Date(inv.maturity_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <p className="font-numeric text-base font-bold text-foreground">{fmtBRL(inv.currentValue)}</p>
            <span className={cn(
              "font-numeric inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-400"
            )}>
              {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
              {fmtPct(Math.abs(Number(inv.rentabilidadePct ?? 0)))}
            </span>
            <span className={cn("text-muted-foreground transition-transform duration-300", expanded && "rotate-180")}>
              <ChevronDown size={14} />
            </span>
          </div>
        </div>
      </button>

      {/* Detalhes expandidos */}
      <div className={cn(
        "overflow-hidden transition-all duration-400 ease-in-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="space-y-3 px-4 pb-4">
          <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Investido", val: fmtBRL(Number(inv.totalInvested ?? 0)) },
              { label: "Rendimentos", val: fmtBRL(Number(inv.totalIncome ?? 0)) },
              { label: "Rentabilidade", val: fmtPct(Number(inv.rentabilidadePct ?? 0)) },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-xl border border-border/50 bg-muted/30 p-2.5 text-center">
                <p className="mb-0.5 text-[10px] text-muted-foreground">{label}</p>
                <p className="font-numeric text-xs font-semibold text-foreground">{val}</p>
              </div>
            ))}
          </div>

          {events.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Histórico</p>
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {[...events].reverse().map(ev => {
                  const cfg = EVENT_KIND_CONFIG[getEventKind(ev.income_type_id)]
                  const Icon = cfg.icon
                  return (
                    <div key={ev.id}
                      className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                        <Icon size={10} className={cfg.text} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground/80">{cfg.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ev.income_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <p className={cn("font-numeric shrink-0 text-xs font-semibold", cfg.text)}>
                        {cfg.sign > 0 ? "+" : "-"}{fmtBRL(Math.abs(Number(ev.income_value)))}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onAddEvent(inv)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all hover:brightness-110"
              style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}
            >
              <Plus size={12} /> Lançamento
            </button>
            <button
              onClick={() => onDelete(inv.id)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/20"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Modais
   ════════════════════════════════════════════════════════════════════════════ */

function ModalNovoInvestimento({ onClose }: { onClose: () => void }) {
  const types = useInvestmentTypesSafe()
  const goals = useGoalsSafe()
  const createMut = useCreateInvestment()

  const [form, setForm] = useState({
    investment_type_id: "",
    invested_value: "",
    interest_rate: "",
    application_date: new Date().toISOString().split("T")[0],
    maturity_date: "",
    finalidade: "",
    goal_id: "",
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const isValid = !!form.investment_type_id && !!form.invested_value && !!form.application_date

  const handleSubmit = () => {
    if (!isValid || createMut.isPending) return
    createMut.mutate({
      investment_type_id: Number(form.investment_type_id),
      invested_value: Number(String(form.invested_value).replace(",", ".")),
      interest_rate: form.interest_rate ? Number(String(form.interest_rate).replace(",", ".")) / 100 : undefined,
      application_date: form.application_date,
      maturity_date: form.maturity_date || undefined,
      finalidade: form.finalidade || undefined,
      goal_id: form.goal_id ? Number(form.goal_id) : undefined,
      status: "ativo",
    }, { onSuccess: onClose })
  }

  const activeGoals = goals.filter(g => g?.status === "em_andamento")

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15">
            <Plus size={13} className="text-cyan-400" />
          </div>
          <p className="font-display text-sm font-semibold text-foreground">Novo Investimento</p>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted">
          <X size={13} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tipo de Investimento</label>
          <select className={inputClass} value={form.investment_type_id}
            onChange={e => set("investment_type_id", e.target.value)}>
            <option value="">Selecione...</option>
            {types.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.description}{t.acronym ? ` (${t.acronym})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Valor Investido</label>
            <Input className={cn(inputClass, "font-numeric")} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.invested_value} onChange={e => set("invested_value", e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Taxa a.a. (%)</label>
            <Input className={cn(inputClass, "font-numeric")} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.interest_rate} onChange={e => set("interest_rate", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Data Aplicação</label>
            <Input className={inputClass} type="date"
              value={form.application_date} onChange={e => set("application_date", e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vencimento</label>
            <Input className={inputClass} type="date"
              value={form.maturity_date} onChange={e => set("maturity_date", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Finalidade</label>
          <select className={inputClass} value={form.finalidade} onChange={e => set("finalidade", e.target.value)}>
            <option value="">Sem finalidade</option>
            {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {activeGoals.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Meta vinculada</label>
            <select className={inputClass} value={form.goal_id} onChange={e => set("goal_id", e.target.value)}>
              <option value="">Nenhuma</option>
              {activeGoals.map((g: any) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/50 px-5 pb-5 pt-3">
        <button
          onClick={handleSubmit}
          disabled={createMut.isPending || !isValid}
          className={cn(gradientBtn, "w-full py-3")}
          style={gradientBtnStyle}
        >
          {createMut.isPending ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Registrar Investimento"}
        </button>
      </div>
    </ModalSheet>
  )
}

function ModalNovoLancamento({ inv, incomeTypes, onClose }: {
  inv: InvestmentEnriched
  incomeTypes: any[]
  onClose: () => void
}) {
  const createMut = useCreateIncome()
  const [form, setForm] = useState({
    income_type_id: "",
    income_date: new Date().toISOString().split("T")[0],
    income_value: "",
    ir_withheld: "",
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const color = PALETTE[Number(inv.id) % PALETTE.length]
  const isValid = !!form.income_type_id && !!form.income_value && !!form.income_date

  const handleSubmit = () => {
    if (!isValid || createMut.isPending) return
    createMut.mutate({
      investment_id: inv.id,
      income_type_id: Number(form.income_type_id),
      income_date: form.income_date,
      income_value: Number(String(form.income_value).replace(",", ".")),
      ir_withheld: form.ir_withheld ? Number(String(form.ir_withheld).replace(",", ".")) : undefined,
    }, { onSuccess: onClose })
  }

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Zap size={13} style={{ color }} />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">Novo Lançamento</p>
            <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">{inv.typeName}</p>
          </div>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted">
          <X size={13} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tipo</label>
          <select className={inputClass} value={form.income_type_id}
            onChange={e => set("income_type_id", e.target.value)}>
            <option value="">Selecione...</option>
            {(incomeTypes ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.description}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Valor (R$)</label>
            <Input className={cn(inputClass, "font-numeric")} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.income_value} onChange={e => set("income_value", e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">IR Retido</label>
            <Input className={cn(inputClass, "font-numeric")} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.ir_withheld} onChange={e => set("ir_withheld", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Data</label>
          <Input className={inputClass} type="date"
            value={form.income_date} onChange={e => set("income_date", e.target.value)} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border/50 px-5 pb-5 pt-3">
        <button
          onClick={handleSubmit}
          disabled={createMut.isPending || !isValid}
          className={cn(gradientBtn, "w-full py-3")}
          style={{
            background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
            boxShadow: `0 4px 20px ${color}30`,
          }}
        >
          {createMut.isPending ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Registrar Lançamento"}
        </button>
      </div>
    </ModalSheet>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   IA + Gráficos
   ════════════════════════════════════════════════════════════════════════════ */

function AIInsightCard({ insights }: { insights: string[] }) {
  const [idx, setIdx] = useState(0)
  const count = insights.length

  useEffect(() => {
    if (count <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % count), 5000)
    return () => clearInterval(t)
  }, [count])

  if (count === 0) return null
  const safeIdx = Math.min(idx, count - 1)

  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-4"
      style={{ border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 4px 24px rgba(167,139,250,0.1)" }}>
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)", transform: "translate(30%,-30%)" }} />
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md border border-violet-500/30 bg-violet-500/20">
          <Sparkles size={10} className="text-violet-400" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-widest text-violet-400">IA Financeira</span>
      </div>
      <p key={safeIdx} className="animate-fade-up text-sm leading-relaxed text-foreground/80">
        {insights[safeIdx]}
      </p>
      <div className="mt-3 flex gap-1">
        {insights.map((_, i) => (
          <div key={i} className="h-1 rounded-full transition-all duration-300"
            style={{ width: i === safeIdx ? 16 : 4, background: i === safeIdx ? "#a78bfa" : "rgba(167,139,250,0.3)" }} />
        ))}
      </div>
    </div>
  )
}

function LivingChart({ data }: { data: Array<{ month: string; valor: number }> }) {
  if (!data || data.length < 2) return null
  return (
    <div className="glass-card relative overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(34,211,238,0.15)" }}>
      <div className="p-4 pb-2">
        <div className="mb-1 flex items-center gap-2">
          <Activity size={12} className="text-cyan-400" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Evolução Patrimonial</p>
        </div>
      </div>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id="invAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="invAreaStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)", border: "1px solid var(--border)",
                borderRadius: 12, fontSize: 11, color: "var(--popover-foreground)",
              }}
              formatter={(v: any) => [fmtBRL(Number(v)), "Patrimônio"]}
            />
            <Area type="monotone" dataKey="valor" stroke="url(#invAreaStroke)" strokeWidth={2}
              fill="url(#invAreaGrad)" dot={false} activeDot={{ r: 4, fill: "#22d3ee" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AllocationOrbs({ data }: { data: Array<{ name: string; value: number; pct: number }> }) {
  if (!data || data.length === 0) return null
  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-4">
      <div className="mb-4 flex items-center gap-2">
        <Globe size={12} className="text-violet-400" />
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Composição</p>
      </div>
      <div className="space-y-2.5">
        {data.map(({ name, value, pct }, i) => (
          <div key={name}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length], boxShadow: `0 0 6px ${PALETTE[i % PALETTE.length]}` }} />
                <span className="text-xs font-medium text-foreground/80">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-numeric text-xs text-muted-foreground">{fmtBRL(value)}</span>
                <span className="font-numeric text-xs font-bold" style={{ color: PALETTE[i % PALETTE.length] }}>
                  {Number(pct || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 1) % PALETTE.length]}80)`,
                  boxShadow: `0 0 8px ${PALETTE[i % PALETTE.length]}60`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Página
   ════════════════════════════════════════════════════════════════════════════ */

function InvestimentosPage() {
  const { user, isGuest: ctxIsGuest } = useUserContext() as any
  const isGuest = ctxIsGuest ?? user?.is_guest === true

  const { data: sharedInvs = [], isLoading: loadingGuest } = useSharedInvestments(isGuest)

  if (isGuest) {
    return <InvestimentosGuestView sharedInvs={sharedInvs} loadingGuest={loadingGuest} />
  }
  return <InvestimentosCompleto />
}

/* ── Vista para convidados ──────────────────────────────────────────────────── */

function InvestimentosGuestView({ sharedInvs, loadingGuest }: { sharedInvs: any[]; loadingGuest: boolean }) {
  const list = Array.isArray(sharedInvs) ? sharedInvs : []
  const totalValue = list.reduce(
    (s, inv) => s + Number(inv?.currentValue ?? inv?.current_value ?? inv?.invested_value ?? 0), 0)

  return (
    <div className="space-y-4 pb-24 sm:pb-8">
      <PageHeader
        eyebrow="Investimentos compartilhados"
        title="Investimentos"
        subtitle={loadingGuest ? "Carregando..." : `${list.length} posição${list.length !== 1 ? "ões" : ""} · somente visualização`}
        action={
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
            <Eye size={16} className="text-cyan-400" />
          </div>
        }
      />

      {totalValue > 0 && (
        <div className="animate-fade-up delay-1 py-4 text-center opacity-0">
          <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Nosso Patrimônio</p>
          <p className="text-gradient font-display text-4xl font-bold">
            <CountUp value={totalValue} format={fmtBRL} duration={1400} />
          </p>
        </div>
      )}

      <div className="stagger-children space-y-3">
        {loadingGuest ? (
          Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
        ) : list.length === 0 ? (
          <div className="glass-card rounded-2xl border border-dashed border-border py-16 text-center">
            <TrendingUp size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum investimento compartilhado com você ainda.</p>
          </div>
        ) : (
          list.map((inv: any) => <InvestimentoCardReadOnly key={inv.id} inv={inv} />)
        )}
      </div>
    </div>
  )
}

/* ── Vista completa para o dono ─────────────────────────────────────────────── */

function InvestimentosCompleto() {
  const [modalOpen, setModalOpen] = useState(false)
  const [eventInv, setEventInv] = useState<InvestmentEnriched | null>(null)

  const hook = useInvestments() as any
  const investments: InvestmentEnriched[] = Array.isArray(hook?.investments) ? hook.investments : []
  const eventsByInv: Record<number, Income[]> = hook?.eventsByInv ?? {}
  const incomeTypes: any[] = Array.isArray(hook?.incomeTypes) ? hook.incomeTypes : []
  const totalInvestido = Number(hook?.totalInvestido ?? 0)
  const totalAtual = Number(hook?.totalAtual ?? 0)
  const totalRendimentos = Number(hook?.totalRendimentos ?? 0)
  const composicaoPorFinalidade = hook?.composicaoPorFinalidade ?? {}
  const composicaoPorTipo: any[] = Array.isArray(hook?.composicaoPorTipo) ? hook.composicaoPorTipo : []
  const isLoading = !!hook?.isLoading

  const { mutate: deleteInv } = useDeleteInvestment()
  const goals = useGoalsSafe()

  const rentGlobal = totalInvestido > 0
    ? ((totalAtual - totalInvestido) / totalInvestido) * 100
    : 0

  // Insights dinâmicos
  const insights = useMemo(() => {
    const msgs: string[] = []
    if (investments.length > 0) {
      if (rentGlobal > 0)
        msgs.push(`Seu patrimônio cresceu ${fmtPct(rentGlobal)} acima do valor aplicado.`)
      msgs.push(`Você possui ${investments.filter(i => i.status === "ativo").length} investimentos ativos distribuídos em ${Object.keys(composicaoPorFinalidade).length} finalidades.`)
      if (totalRendimentos > 0)
        msgs.push(`Seus rendimentos acumulados chegaram a ${fmtBRL(totalRendimentos)}.`)
      const topType = composicaoPorTipo[0]
      if (topType?.name != null)
        msgs.push(`${topType.name} representa ${Number(topType.pct ?? 0).toFixed(1)}% do seu portfólio — sua maior posição.`)
      msgs.push(`Mantenha aportes regulares para acelerar o crescimento do seu patrimônio.`)
    }
    return msgs.length > 0 ? msgs : ["Adicione investimentos para ativar a inteligência financeira."]
  }, [investments, rentGlobal, composicaoPorFinalidade, totalRendimentos, composicaoPorTipo])

  // Evolução (projeção simples baseada no total atual)
  const evolucaoData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
    const base = totalAtual * 0.75
    return months.map((month, i) => ({
      month,
      valor: base + (totalAtual - base) * (i / 5),
    }))
  }, [totalAtual])

  // Composição por tipo formatada
  const composicaoFormatted = useMemo(() => {
    const total = composicaoPorTipo.reduce((s: number, t: any) => s + Number(t?.total ?? 0), 0)
    return composicaoPorTipo.map((t: any) => ({
      name: String(t?.name ?? "—"),
      value: Number(t?.total ?? 0),
      pct: total > 0 ? (Number(t?.total ?? 0) / total) * 100 : 0,
    }))
  }, [composicaoPorTipo])

  const investimentosAtivos = investments.filter(i => i.status === "ativo")

  return (
    <div className="space-y-4 pb-24 sm:pb-8">

      {/* ── HERO ── */}
      <PageHeader
        eyebrow="Central de Patrimônio"
        title="Investimentos"
        gradient={false}
        action={
          <button onClick={() => setModalOpen(true)} className={cn(gradientBtn, "px-4 py-2.5")} style={gradientBtnStyle}>
            <Plus size={14} />
            <span className="hidden sm:inline">Novo</span>
          </button>
        }
      />

      <div className="flex flex-col items-center gap-8 sm:flex-row">
        {!isLoading && (
          <div className="animate-fade-up delay-2 flex-shrink-0 opacity-0">
            <WealthOrb value={totalAtual} maxValue={Math.max(totalAtual, 100000)} />
          </div>
        )}

        <div className="w-full flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="animate-fade-up delay-1 mb-6 opacity-0">
                <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Patrimônio Total</p>
                <p className="text-gradient font-display text-4xl font-bold leading-none sm:text-5xl">
                  <CountUp value={totalAtual} format={fmtBRL} duration={2000} />
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={cn(
                    "font-numeric inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
                    rentGlobal >= 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-400"
                  )}>
                    {rentGlobal >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                    {fmtPct(Math.abs(rentGlobal))} total
                  </span>
                  <span className="font-numeric text-xs text-muted-foreground">
                    vs {fmtBRL(totalInvestido)} aplicados
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <MetricNode label="Investido" value={fmtBRL(totalInvestido)} icon={DollarSign} color="#22d3ee" delay={100} />
                <MetricNode
                  label="Rendimentos"
                  value={fmtBRL(totalRendimentos)}
                  sub={totalRendimentos >= 0 ? "▲ positivo" : "▼ negativo"}
                  icon={TrendingUp}
                  color={totalRendimentos >= 0 ? "#34d399" : "#f472b6"}
                  delay={200}
                />
                <MetricNode label="Posições" value={`${investimentosAtivos.length}`} sub="ativas" icon={Star} color="#a78bfa" delay={300} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      {!isLoading && investments.length > 0 && (
        <div className="animate-fade-up opacity-0" style={{ animationDelay: "400ms" }}>
          <AIInsightCard insights={insights} />
        </div>
      )}

      {!isLoading && investments.length > 0 && (
        <div className="animate-fade-up grid grid-cols-1 gap-4 opacity-0 sm:grid-cols-2" style={{ animationDelay: "500ms" }}>
          <LivingChart data={evolucaoData} />
          <AllocationOrbs data={composicaoFormatted} />
        </div>
      )}

      <div className="animate-fade-up opacity-0" style={{ animationDelay: "600ms" }}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-cyan-400" />
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Seus Ativos</p>
          </div>
          <div className="divider-glow h-px flex-1" />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : investments.length === 0 ? (
          <div className="glass-card rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="flex justify-center">
              <WealthOrb value={0} maxValue={1} />
            </div>
            <p className="mt-2 text-sm font-medium text-foreground/70">Nenhum investimento registrado</p>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">Comece adicionando seu primeiro ativo</p>
            <button onClick={() => setModalOpen(true)} className={cn(gradientBtn, "mx-auto px-5 py-2.5")} style={gradientBtnStyle}>
              <Plus size={14} /> Adicionar Investimento
            </button>
          </div>
        ) : (
          <div className="stagger-children space-y-3">
            {[...investments]
              .sort((a, b) => Number(b.currentValue ?? 0) - Number(a.currentValue ?? 0))
              .map(inv => (
                <InvestimentoCard
                  key={inv.id}
                  inv={inv}
                  eventsByInv={eventsByInv}
                  incomeTypes={incomeTypes}
                  goals={goals}
                  onDelete={id => deleteInv(id)}
                  onAddEvent={setEventInv}
                />
              ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {modalOpen && <ModalNovoInvestimento onClose={() => setModalOpen(false)} />}
      {eventInv && (
        <ModalNovoLancamento inv={eventInv} incomeTypes={incomeTypes} onClose={() => setEventInv(null)} />
      )}
    </div>
  )
}