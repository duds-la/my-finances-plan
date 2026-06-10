import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  TrendingUp, DollarSign, Plus, X, Loader2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft,
  Trash2, Tag, Target, PlusCircle, Eye, Share2,
  Sparkles, Zap, Activity, Globe, Star, Shield,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from "recharts"
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
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number) => `${Number(v).toFixed(2)}%`

const PALETTE = [
  "#00d4ff", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#fb923c",
]

const EVENT_KIND_CONFIG = {
  aporte:     { label: "Aporte",     color: "#00d4ff", bg: "bg-cyan-500/10",    text: "text-cyan-400",    icon: PlusCircle,    sign: +1 },
  rendimento: { label: "Rendimento", color: "#34d399", bg: "bg-emerald-500/10", text: "text-emerald-500", icon: ArrowUpRight,  sign: +1 },
  resgate:    { label: "Resgate",    color: "#f472b6", bg: "bg-pink-500/10",    text: "text-pink-400",    icon: ArrowDownLeft, sign: -1 },
} as const
type EventKind = keyof typeof EVENT_KIND_CONFIG

const FINALIDADES = ["R.E", "Carro", "Apartamento", "Viagem", "Livre"]

// ── Hook: contador animado ────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    startRef.current = null
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(target * ease)
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
      else setValue(target)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

// ── Componente: Aurora Background ─────────────────────────────────────────────

function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, #00d4ff 0%, #a78bfa 50%, transparent 70%)",
          animation: "aurora1 8s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #a78bfa 0%, #34d399 50%, transparent 70%)",
          animation: "aurora2 10s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes aurora1 {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(60px,40px) scale(1.15); }
        }
        @keyframes aurora2 {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(-40px,-60px) scale(1.1); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes float-up {
          0%   { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0,212,255,0.2); }
          50%       { box-shadow: 0 0 40px rgba(0,212,255,0.4), 0 0 60px rgba(167,139,250,0.2); }
        }
        @keyframes scan-line {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 0.4; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes orbit {
          0%   { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
        }
        @keyframes slide-in-up {
          0%   { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-slide-up { animation: slide-in-up 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-fade-in  { animation: fade-in 0.8s ease both; }
        .shimmer-text {
          background: linear-gradient(90deg, #e2e8f0 0%, #00d4ff 40%, #a78bfa 60%, #e2e8f0 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>
    </div>
  )
}

// ── Componente: Wealth Orb ─────────────────────────────────────────────────────

function WealthOrb({ value, maxValue }: { value: number; maxValue: number }) {
  const intensity = maxValue > 0 ? Math.min(value / maxValue, 1) : 0.5
  const size = 120 + intensity * 40
  const particleCount = Math.floor(4 + intensity * 8)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 80, height: size + 80 }}>
      {/* Pulse rings */}
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="absolute rounded-full border border-cyan-400/20"
          style={{
            width: size + i * 28,
            height: size + i * 28,
            animation: `pulse-ring ${2 + i * 0.5}s ease-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      {/* Core orb */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, rgba(0,212,255,${0.25 + intensity * 0.15}), rgba(167,139,250,${0.2 + intensity * 0.1}) 50%, rgba(52,211,153,0.1) 100%)`,
          boxShadow: `0 0 ${30 + intensity * 30}px rgba(0,212,255,0.3), 0 0 ${60 + intensity * 40}px rgba(167,139,250,0.15), inset 0 0 ${20 + intensity * 20}px rgba(0,212,255,0.1)`,
          border: `1px solid rgba(0,212,255,${0.2 + intensity * 0.15})`,
          animation: "glow-pulse 3s ease-in-out infinite",
        }}
      >
        {/* Scan line */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ opacity: 0.3 }}
        >
          <div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            style={{ animation: "scan-line 4s linear infinite" }}
          />
        </div>

        <Activity size={28} className="text-cyan-400" style={{ filter: "drop-shadow(0 0 8px rgba(0,212,255,0.8))" }} />
      </div>

      {/* Floating particles */}
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
              animation: `float-up ${2 + (i % 3) * 0.7}s ease-out infinite`,
              animationDelay: `${i * 0.25}s`,
              opacity: 0.7 + intensity * 0.3,
            }}
          />
        )
      })}
    </div>
  )
}

// ── Componente: KPI Metric ─────────────────────────────────────────────────────

function MetricNode({
  label, value, sub, color = "#00d4ff", icon: Icon, delay = 0,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: any; delay?: number
}) {
  return (
    <div
      className="relative flex flex-col gap-0.5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && (
          <div className="flex items-center justify-center w-5 h-5 rounded-md"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon size={10} style={{ color }} />
          </div>
        )}
        <span className="text-[11px] font-medium tracking-widest uppercase text-slate-400">{label}</span>
      </div>
      <span className="text-xl font-bold tracking-tight text-white leading-none">{value}</span>
      {sub && (
        <span className="text-[11px] mt-0.5" style={{ color }}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ── Componente: Modal Sheet ────────────────────────────────────────────────────

function ModalSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(10,12,20,0.97) 0%, rgba(15,18,30,0.97) 100%)",
            backdropFilter: "blur(40px)",
            boxShadow: "0 0 60px rgba(0,212,255,0.1), 0 40px 80px rgba(0,0,0,0.7)",
          }}>
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Componente: Card read-only para convidados ─────────────────────────────────

function InvestimentoCardReadOnly({ inv }: { inv: any }) {
  const currentValue = Number(inv.current_value ?? inv.invested_value ?? 0)
  const investedValue = Number(inv.invested_value ?? 0)
  const rent = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0
  const isPositive = rent >= 0
  const acronym = inv.investment_type?.acronym ?? inv.typeAcronym ?? "?"

  const colorIdx = inv.id % PALETTE.length
  const color = PALETTE[colorIdx]

  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: "linear-gradient(135deg, rgba(15,18,30,0.9) 0%, rgba(10,12,20,0.95) 100%)",
        border: `1px solid ${color}25`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}10`,
      }}
    >
      {/* Glow top-left accent */}
      <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, transform: "translate(-30%, -30%)" }} />

      <div className="relative flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
          {acronym}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate">
            {inv.investment_type?.description ?? inv.typeName ?? "—"}
          </p>
          {inv.finalidade && (
            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
              style={{ background: `${color}15`, color }}>
              <Tag size={8} /> {inv.finalidade}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-white">{fmtBRL(currentValue)}</p>
          <p className={cn("text-xs font-medium mt-0.5", isPositive ? "text-emerald-400" : "text-rose-400")}>
            {isPositive ? "▲" : "▼"} {fmtPct(Math.abs(rent))}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Componente: Investment Card expandível ────────────────────────────────────

function InvestimentoCard({
  inv,
  eventsByInv,
  incomeTypes,
  onDelete,
  onAddEvent,
  goals,
}: {
  inv: InvestmentEnriched
  eventsByInv: Record<number, Income[]>
  incomeTypes: any[]
  onDelete: (id: number) => void
  onAddEvent: (inv: InvestmentEnriched) => void
  goals: any[]
}) {
  const [expanded, setExpanded] = useState(false)
  const events = eventsByInv[inv.id] ?? []
  const isPositive = inv.rentabilidadePct >= 0
  const colorIdx = inv.id % PALETTE.length
  const color = PALETTE[colorIdx]

  const goal = goals.find(g => g.id === inv.goal_id)

  const getEventKind = (incomeTypeId: number): EventKind => {
    const t = incomeTypes.find(t => t.id === incomeTypeId)
    if (!t) return "aporte"
    const d = t.description.toLowerCase()
    if (d.includes("rendimento")) return "rendimento"
    if (d.includes("resgate")) return "resgate"
    return "aporte"
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "linear-gradient(135deg, rgba(15,18,30,0.95) 0%, rgba(10,12,20,0.98) 100%)",
        border: `1px solid ${color}20`,
        boxShadow: expanded
          ? `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}15, 0 0 40px ${color}08`
          : `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${color}10`,
      }}
    >
      {/* Accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      <div className="absolute top-0 left-0 w-40 h-40 rounded-full opacity-[0.06] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, transform: "translate(-30%,-30%)" }} />

      {/* Header */}
      <button className="relative w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          {/* Acronym badge */}
          <div className="flex items-center justify-center w-11 h-11 rounded-xl text-sm font-bold shrink-0"
            style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
            {inv.typeAcronym}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white/90 truncate">{inv.typeName}</p>
              {inv.status !== "ativo" && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-700/60 text-slate-400 font-medium">
                  {inv.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {inv.finalidade && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                  style={{ background: `${color}15`, color }}>
                  <Tag size={8} /> {inv.finalidade}
                </span>
              )}
              {goal && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-400">
                  <Target size={8} /> {goal.title}
                </span>
              )}
              {inv.maturity_date && (
                <span className="text-[10px] text-slate-500">
                  Vence {new Date(inv.maturity_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <p className="text-base font-bold text-white">{fmtBRL(inv.currentValue)}</p>
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
              isPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
            )}>
              {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
              {fmtPct(Math.abs(inv.rentabilidadePct))}
            </span>
            <span className={cn("transition-transform duration-300 text-slate-500", expanded && "rotate-180")}>
              <ChevronDown size={14} />
            </span>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <div className={cn(
        "overflow-hidden transition-all duration-400 ease-in-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-4 pb-4 space-y-3">
          {/* Divider */}
          <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Investido", val: fmtBRL(inv.totalInvested) },
              { label: "Rendimentos", val: fmtBRL(inv.totalIncome) },
              { label: "Rentabilidade", val: fmtPct(inv.rentabilidadePct) },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-xl p-2.5 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                <p className="text-xs font-semibold text-white/80">{val}</p>
              </div>
            ))}
          </div>

          {/* Events timeline */}
          {events.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Histórico</p>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {[...events].reverse().map(ev => {
                  const kind = getEventKind(ev.income_type_id)
                  const cfg = EVENT_KIND_CONFIG[kind]
                  const Icon = cfg.icon
                  return (
                    <div key={ev.id}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className={cn("flex items-center justify-center w-6 h-6 rounded-lg shrink-0", cfg.bg)}>
                        <Icon size={10} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/70">{cfg.label}</p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(ev.income_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <p className={cn("text-xs font-semibold shrink-0", cfg.text)}>
                        {cfg.sign > 0 ? "+" : "-"}{fmtBRL(Math.abs(Number(ev.income_value)))}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onAddEvent(inv)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all"
              style={{
                background: `${color}12`,
                border: `1px solid ${color}25`,
                color,
              }}
            >
              <Plus size={12} /> Lançamento
            </button>
            <button
              onClick={() => onDelete(inv.id)}
              className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 transition-all hover:bg-rose-500/20"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Novo Investimento ───────────────────────────────────────────────────

function ModalNovoInvestimento({ onClose }: { onClose: () => void }) {
  const { types } = useInvestmentTypes()
  const { goals } = useGoals()
  const { mutateAsync: create, isPending } = useCreateInvestment()

  const [form, setForm] = useState({
    investment_type_id: 0,
    invested_value: "",
    interest_rate: "",
    application_date: new Date().toISOString().split("T")[0],
    maturity_date: "",
    finalidade: "",
    goal_id: "",
    status: "ativo",
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.investment_type_id || !form.invested_value || !form.application_date) return
    await create({
      investment_type_id: Number(form.investment_type_id),
      invested_value: Number(form.invested_value),
      interest_rate: form.interest_rate ? Number(form.interest_rate) / 100 : undefined,
      application_date: form.application_date,
      maturity_date: form.maturity_date || undefined,
      finalidade: form.finalidade || undefined,
      goal_id: form.goal_id ? Number(form.goal_id) : undefined,
      status: form.status,
    })
    onClose()
  }

  const activeGoals = goals.filter(g => g.status === "em_andamento")

  const inputClass = "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <Plus size={13} className="text-cyan-400" />
          </div>
          <p className="text-sm font-semibold text-white">Novo Investimento</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <X size={13} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Tipo de Investimento</label>
          <select
            className={inputClass}
            value={form.investment_type_id}
            onChange={e => set("investment_type_id", e.target.value)}
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <option value={0} disabled>Selecione...</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>{t.description}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Valor Investido</label>
            <Input className={inputClass} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.invested_value} onChange={e => set("invested_value", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Taxa a.a. (%)</label>
            <Input className={inputClass} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.interest_rate} onChange={e => set("interest_rate", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Data Aplicação</label>
            <Input className={inputClass} type="date"
              value={form.application_date} onChange={e => set("application_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Vencimento</label>
            <Input className={inputClass} type="date"
              value={form.maturity_date} onChange={e => set("maturity_date", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Finalidade</label>
          <select className={inputClass} value={form.finalidade} onChange={e => set("finalidade", e.target.value)}
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <option value="">Sem finalidade</option>
            {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {activeGoals.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Meta vinculada</label>
            <select className={inputClass} value={form.goal_id} onChange={e => set("goal_id", e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <option value="">Nenhuma</option>
              {activeGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-white/8 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={isPending || !form.investment_type_id || !form.invested_value}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-40 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0891b2, #7c3aed)",
            boxShadow: "0 4px 20px rgba(0,212,255,0.25)",
          }}
        >
          {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Registrar Investimento"}
        </button>
      </div>
    </ModalSheet>
  )
}

// ── Modal: Novo Lançamento ────────────────────────────────────────────────────

function ModalNovoLancamento({ inv, incomeTypes, onClose }: {
  inv: InvestmentEnriched
  incomeTypes: any[]
  onClose: () => void
}) {
  const { mutateAsync: create, isPending } = useCreateIncome()
  const [form, setForm] = useState({
    income_type_id: 0,
    income_date: new Date().toISOString().split("T")[0],
    income_value: "",
    ir_withheld: "",
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.income_type_id || !form.income_value || !form.income_date) return
    await create({
      investment_id: inv.id,
      income_type_id: Number(form.income_type_id),
      income_date: form.income_date,
      income_value: Number(form.income_value),
      ir_withheld: form.ir_withheld ? Number(form.ir_withheld) : undefined,
    })
    onClose()
  }

  const colorIdx = inv.id % PALETTE.length
  const color = PALETTE[colorIdx]

  const inputClass = "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"

  return (
    <ModalSheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Zap size={13} style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Novo Lançamento</p>
            <p className="text-[11px] text-slate-500">{inv.typeName}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <X size={13} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Tipo</label>
          <select className={inputClass} value={form.income_type_id} onChange={e => set("income_type_id", e.target.value)}
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <option value={0} disabled>Selecione...</option>
            {incomeTypes.map(t => <option key={t.id} value={t.id}>{t.description}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Valor (R$)</label>
            <Input className={inputClass} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.income_value} onChange={e => set("income_value", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">IR Retido</label>
            <Input className={inputClass} placeholder="0,00" type="number" min={0} step={0.01}
              value={form.ir_withheld} onChange={e => set("ir_withheld", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Data</label>
          <Input className={inputClass} type="date"
            value={form.income_date} onChange={e => set("income_date", e.target.value)} />
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-white/8 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={isPending || !form.income_type_id || !form.income_value}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
            boxShadow: `0 4px 20px ${color}30`,
          }}
        >
          {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Registrar Lançamento"}
        </button>
      </div>
    </ModalSheet>
  )
}

// ── Componente: AI Insights ───────────────────────────────────────────────────

function AIInsightCard({ insights }: { insights: string[] }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % insights.length), 5000)
    return () => clearInterval(t)
  }, [insights.length])

  return (
    <div className="relative rounded-2xl p-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(0,212,255,0.05) 100%)",
        border: "1px solid rgba(167,139,250,0.2)",
        boxShadow: "0 4px 24px rgba(167,139,250,0.1)",
      }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)", transform: "translate(30%,-30%)" }} />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Sparkles size={10} className="text-violet-400" />
        </div>
        <span className="text-[10px] font-medium tracking-widest uppercase text-violet-400">IA Financeira</span>
      </div>
      <p className="text-sm text-white/80 leading-relaxed transition-all duration-500 key-{idx}">
        {insights[idx]}
      </p>
      <div className="flex gap-1 mt-3">
        {insights.map((_, i) => (
          <div key={i} className="h-1 rounded-full transition-all duration-300"
            style={{ width: i === idx ? 16 : 4, background: i === idx ? "#a78bfa" : "rgba(167,139,250,0.3)" }} />
        ))}
      </div>
    </div>
  )
}

// ── Componente: Performance Chart (Living) ────────────────────────────────────

function LivingChart({ data }: { data: Array<{ month: string; valor: number }> }) {
  if (data.length < 2) return null
  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(15,18,30,0.9) 0%, rgba(10,12,20,0.95) 100%)",
        border: "1px solid rgba(0,212,255,0.12)",
      }}>
      <div className="p-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={12} className="text-cyan-400" />
          <p className="text-xs font-medium tracking-widest uppercase text-slate-400">Evolução Patrimonial</p>
        </div>
      </div>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(10,12,20,0.95)", border: "1px solid rgba(0,212,255,0.2)",
                borderRadius: 12, fontSize: 11, color: "#e2e8f0",
              }}
              formatter={(v: any) => [fmtBRL(Number(v)), "Patrimônio"]}
            />
            <Area type="monotone" dataKey="valor" stroke="#00d4ff" strokeWidth={2}
              fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: "#00d4ff" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Componente: Allocation Orbs ───────────────────────────────────────────────

function AllocationOrbs({ data }: { data: Array<{ name: string; value: number; pct: number }> }) {
  if (data.length === 0) return null
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(15,18,30,0.9) 0%, rgba(10,12,20,0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
      <div className="flex items-center gap-2 mb-4">
        <Globe size={12} className="text-violet-400" />
        <p className="text-xs font-medium tracking-widest uppercase text-slate-400">Composição</p>
      </div>
      <div className="space-y-2.5">
        {data.map(({ name, value, pct }, i) => (
          <div key={name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="text-xs text-white/70 font-medium">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{fmtBRL(value)}</span>
                <span className="text-xs font-bold" style={{ color: PALETTE[i % PALETTE.length] }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${pct}%`,
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

// ── Página Principal ──────────────────────────────────────────────────────────

function InvestimentosPage() {
  const { user } = useUserContext()
  const isGuest = user?.is_guest === true

  const { data: sharedInvs = [], isLoading: loadingGuest } = useSharedInvestments(isGuest)

  if (isGuest) {
    return <InvestimentosGuestView sharedInvs={sharedInvs} loadingGuest={loadingGuest} />
  }

  return <InvestimentosCompleto />
}

// ── Vista para convidados ─────────────────────────────────────────────────────

function InvestimentosGuestView({ sharedInvs, loadingGuest }: { sharedInvs: any[]; loadingGuest: boolean }) {
  const totalValue = sharedInvs.reduce((s, inv) => s + (inv.currentValue ?? Number(inv.current_value ?? inv.invested_value ?? 0)), 0)
  const animatedTotal = useCountUp(totalValue)

  return (
    <div className="min-h-screen pb-24 sm:pb-8"
      style={{ background: "linear-gradient(160deg, #060810 0%, #0a0d18 40%, #08101a 100%)" }}>

      {/* Hero convidado */}
      <div className="relative overflow-hidden px-4 pt-6 pb-8 sm:px-6">
        <AuroraBackground />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Share2 size={12} className="text-cyan-400" />
                <span className="text-[10px] font-medium tracking-widest uppercase text-cyan-400">Investimentos Compartilhados</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Investimentos</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {loadingGuest ? "Carregando..." : `${sharedInvs.length} posição${sharedInvs.length !== 1 ? "ões" : ""} · somente visualização`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Eye size={16} className="text-cyan-400" />
            </div>
          </div>

          {totalValue > 0 && (
            <div className="text-center py-4">
              <p className="text-[11px] tracking-widest uppercase text-slate-500 mb-1">Nosso Patrimônio </p>
              <p className="text-4xl font-bold shimmer-text">
                {fmtBRL(animatedTotal)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Investimentos */}
      <div className="px-4 sm:px-6 space-y-3">
        {loadingGuest ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)" }} />
          ))
        ) : sharedInvs.length === 0 ? (
          <div className="rounded-2xl py-16 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
            <TrendingUp size={32} className="mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-500">Nenhum investimento compartilhado com você ainda.</p>
          </div>
        ) : (
          sharedInvs.map((inv: any) => (
            <InvestimentoCardReadOnly key={inv.id} inv={inv} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Vista completa para o dono ────────────────────────────────────────────────

function InvestimentosCompleto() {
  const [modalOpen, setModalOpen] = useState(false)
  const [eventInv, setEventInv] = useState<InvestmentEnriched | null>(null)

  const {
    investments, eventsByInv, incomeTypes,
    totalInvestido, totalAtual, totalRendimentos,
    composicaoPorFinalidade, composicaoPorTipo, isLoading,
  } = useInvestments()
  const { mutate: deleteInv } = useDeleteInvestment()
  const { goals } = useGoals()

  const rentGlobal = totalInvestido > 0
    ? ((totalAtual - totalInvestido) / totalInvestido) * 100
    : 0

  const animatedTotal = useCountUp(totalAtual, 2000)

  // AI insights dinâmicos
  const insights = useMemo(() => {
    const msgs: string[] = []
    if (investments.length > 0) {
      if (rentGlobal > 0)
        msgs.push(`Seu patrimônio cresceu ${fmtPct(rentGlobal)} acima do valor aplicado.`)
      msgs.push(`Você possui ${investments.filter(i => i.status === "ativo").length} investimentos ativos distribuídos em ${Object.keys(composicaoPorFinalidade).length} finalidades.`)
      if (totalRendimentos > 0)
        msgs.push(`Seus rendimentos acumulados chegaram a ${fmtBRL(totalRendimentos)}.`)
      const topType = composicaoPorTipo[0]
      if (topType)
        msgs.push(`${topType.name} representa ${topType.pct.toFixed(1)}% do seu portfólio — sua maior posição.`)
      msgs.push(`Mantenha aportes regulares para acelerar o crescimento do seu patrimônio.`)
    }
    return msgs.length > 0 ? msgs : ["Adicione investimentos para ativar a inteligência financeira."]
  }, [investments, rentGlobal, composicaoPorFinalidade, totalRendimentos, composicaoPorTipo])

  // Evolução (simulada baseada nos dados reais)
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
    const total = composicaoPorTipo.reduce((s, t) => s + t.total, 0)
    return composicaoPorTipo.map(t => ({
      name: t.name,
      value: t.total,
      pct: total > 0 ? (t.total / total) * 100 : 0,
    }))
  }, [composicaoPorTipo])

  const investimentosAtivos = investments.filter(i => i.status === "ativo")

  return (
    <div className="min-h-screen pb-24 sm:pb-8"
      style={{ background: "linear-gradient(160deg, #060810 0%, #0a0d18 40%, #08101a 100%)" }}>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden px-4 pt-6 pb-10 sm:px-8">
        <AuroraBackground />

        <div className="relative">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8 animate-fade-in">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-medium tracking-widest uppercase text-slate-500">Central de Patrimônio</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Investimentos</h1>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #0891b2, #7c3aed)",
                boxShadow: "0 4px 20px rgba(0,212,255,0.3), 0 0 0 1px rgba(0,212,255,0.2)",
              }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>

          {/* Main hero layout */}
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Wealth Orb */}
            {!isLoading && (
              <div className="flex-shrink-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <WealthOrb value={totalAtual} maxValue={Math.max(totalAtual, 100000)} />
              </div>
            )}

            {/* KPI metrics */}
            <div className="flex-1 w-full">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* Total patrimônio - destaque */}
                  <div className="mb-6 animate-slide-up">
                    <p className="text-[11px] tracking-widest uppercase text-slate-500 mb-1">Patrimônio Total</p>
                    <p className="text-5xl sm:text-4xl font-bold text-white leading-none shimmer-text">
                      {fmtBRL(animatedTotal)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                        rentGlobal >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                      )}>
                        {rentGlobal >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                        {fmtPct(Math.abs(rentGlobal))} total
                      </span>
                      <span className="text-xs text-slate-500">
                        vs {fmtBRL(totalInvestido)} aplicados
                      </span>
                    </div>
                  </div>

                  {/* Métricas secundárias */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <MetricNode
                      label="Investido"
                      value={fmtBRL(totalInvestido)}
                      icon={DollarSign}
                      color="#00d4ff"
                      delay={100}
                    />
                    <MetricNode
                      label="Rendimentos"
                      value={fmtBRL(totalRendimentos)}
                      sub={totalRendimentos >= 0 ? `▲ positivo` : `▼ negativo`}
                      icon={TrendingUp}
                      color={totalRendimentos >= 0 ? "#34d399" : "#f472b6"}
                      delay={200}
                    />
                    <MetricNode
                      label="Posições"
                      value={`${investimentosAtivos.length}`}
                      sub="ativas"
                      icon={Star}
                      color="#a78bfa"
                      delay={300}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="px-4 sm:px-8 space-y-4">

        {/* AI Insights */}
        {!isLoading && investments.length > 0 && (
          <div className="animate-slide-up" style={{ animationDelay: "400ms" }}>
            <AIInsightCard insights={insights} />
          </div>
        )}

        {/* Charts row */}
        {!isLoading && investments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "500ms" }}>
            <LivingChart data={evolucaoData} />
            <AllocationOrbs data={composicaoFormatted} />
          </div>
        )}

        {/* Investments list */}
        <div className="animate-slide-up" style={{ animationDelay: "600ms" }}>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-cyan-400" />
              <p className="text-xs font-medium tracking-widest uppercase text-slate-400">Seus Ativos</p>
            </div>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(0,212,255,0.3), transparent)" }} />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : investments.length === 0 ? (
            <div className="rounded-2xl py-20 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <WealthOrb value={0} maxValue={1} />
              <p className="text-sm font-medium text-white/60 mt-2">Nenhum investimento registrado</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Comece adicionando seu primeiro ativo</p>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #0891b2, #7c3aed)",
                  boxShadow: "0 4px 20px rgba(0,212,255,0.25)",
                }}
              >
                <Plus size={14} /> Adicionar Investimento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {investments
                .sort((a, b) => b.currentValue - a.currentValue)
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
      </div>

      {/* Modals */}
      {modalOpen && <ModalNovoInvestimento onClose={() => setModalOpen(false)} />}
      {eventInv && (
        <ModalNovoLancamento
          inv={eventInv}
          incomeTypes={incomeTypes}
          onClose={() => setEventInv(null)}
        />
      )}
    </div>
  )
}