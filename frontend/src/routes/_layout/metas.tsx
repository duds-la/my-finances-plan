// frontend/src/routes/_layout/metas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState, useCallback } from "react"
import {
  Plus, X, Loader2, Check, Sparkles, Calendar,
  ChevronRight, ArrowUp, Share2, Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useGoals, useCreateGoal, useAddContribution, useGoalContributions,
  type FinancialGoal, type GoalContribution,
} from "@/hooks/api/useGoals"
import { useSharedGoals } from "@/hooks/api/useGuestAccess"
import { useUserContext } from "@/contexts/UserContext"

export const Route = createFileRoute("/_layout/metas")({
  component: MetasPage,
  head: () => ({ meta: [{ title: "Metas — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const fmtBRLFull = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

const ORB_THEMES = [
  { id: "blue",    from: "#0ea5e9", to: "#6366f1", glow: "rgba(99,102,241,0.6)",  particle: "#a5b4fc" },
  { id: "purple",  from: "#a855f7", to: "#ec4899", glow: "rgba(168,85,247,0.6)", particle: "#f0abfc" },
  { id: "emerald", from: "#10b981", to: "#06b6d4", glow: "rgba(16,185,129,0.6)", particle: "#6ee7b7" },
  { id: "amber",   from: "#f59e0b", to: "#ef4444", glow: "rgba(245,158,11,0.6)", particle: "#fcd34d" },
  { id: "rose",    from: "#f43f5e", to: "#fb923c", glow: "rgba(244,63,94,0.6)",  particle: "#fda4af" },
]

function getTheme(idx: number) { return ORB_THEMES[idx % ORB_THEMES.length] }

function getDaysLeft(deadline?: string) {
  if (!deadline) return null
  const d = new Date(deadline + "T00:00:00")
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000))
}

// ── CSS Animations ────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes aurora2 {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(-5%,5%) scale(1.1); }
}
@keyframes aurora3 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(3%,-3%) scale(1.05); }
  66%      { transform: translate(-3%,3%) scale(0.98); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.slide-up { animation: slide-up 0.5s ease-out both; }
`

// ── Aurora Background ─────────────────────────────────────────────────────────

function AuroraBackground({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div className="absolute inset-0 bg-[#050508]" />
      <div
        className="absolute inset-0 opacity-30 transition-transform duration-700 ease-out"
        style={{
          background: `radial-gradient(ellipse 80% 60% at ${40 + mouseX * 20}% ${30 + mouseY * 15}%,
            rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 60% 50% at ${70 - mouseX * 10}% ${60 + mouseY * 10}%,
            rgba(6,182,212,0.5) 0%, rgba(16,185,129,0.2) 50%, transparent 70%)`,
          animation: "aurora2 12s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          background: `radial-gradient(ellipse 90% 40% at 20% 80%,
            rgba(244,63,94,0.3) 0%, rgba(251,146,60,0.15) 50%, transparent 70%)`,
          animation: "aurora3 18s ease-in-out infinite",
        }}
      />
    </div>
  )
}

// ── SVG Progress Ring ─────────────────────────────────────────────────────────

function ProgressRing({ pct, size, theme }: { pct: number; size: number; theme: typeof ORB_THEMES[0] }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const id = `grad-${theme.id}-${size}`
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={theme.from} />
          <stop offset="100%" stopColor={theme.to} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${id})`} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 6px ${theme.glow})` }}
      />
    </svg>
  )
}

// ── Global Progress Arc ───────────────────────────────────────────────────────

function GlobalProgressArc({
  pct, totalAtual, totalAlvo, ativasCount, concluidasCount
}: {
  pct: number; totalAtual: number; totalAlvo: number; ativasCount: number; concluidasCount: number
}) {
  return (
    <div
      className="slide-up rounded-3xl p-5 flex items-center gap-5"
      style={{
        background: "linear-gradient(135deg, rgba(10,10,25,0.9), rgba(20,10,40,0.95))",
        border: "1px solid rgba(99,102,241,0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="relative shrink-0">
        <ProgressRing pct={pct} size={80} theme={ORB_THEMES[0]} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-white">{pct}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] tracking-widest uppercase text-indigo-400 mb-1">Progresso Geral</p>
        <p className="text-xl font-black text-white">{fmtBRL(totalAtual)}</p>
        <p className="text-xs text-white/40 mt-0.5">
          de {fmtBRL(totalAlvo)} · {ativasCount} ativa{ativasCount !== 1 ? "s" : ""}
          {concluidasCount > 0 && ` · ${concluidasCount} concluída${concluidasCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  )
}

// ── Goal Orb Card ─────────────────────────────────────────────────────────────

function GoalOrb({
  meta, themeIdx, onSelect, delay = 0, isShared = false,
}: {
  meta: FinancialGoal; themeIdx: number; onSelect: (m: FinancialGoal) => void; delay?: number; isShared?: boolean
}) {
  const theme = getTheme(themeIdx)
  const pct = Number(meta.target_value) > 0
    ? Math.min(100, Math.round((Number(meta.current_value) / Number(meta.target_value)) * 100))
    : 0
  const daysLeft = getDaysLeft(meta.deadline)
  const isComplete = pct >= 100
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="slide-up cursor-pointer select-none"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => onSelect(meta)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative rounded-3xl p-[1px] transition-all duration-300"
        style={{
          background: hovered
            ? `linear-gradient(135deg, ${theme.from}60, ${theme.to}60)`
            : `linear-gradient(135deg, ${theme.from}20, ${theme.to}20)`,
          boxShadow: hovered
            ? `0 0 40px ${theme.glow}, 0 20px 60px rgba(0,0,0,0.5)`
            : `0 8px 32px rgba(0,0,0,0.4)`,
          transform: hovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        }}
      >
        <div
          className="rounded-3xl p-5 flex flex-col gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.98))",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Top */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: theme.from }}>
                  {isComplete ? "✦ Concluída" : "Em andamento"}
                </p>
                {isShared && (
                  <span
                    className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium shrink-0"
                    style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee" }}
                  >
                    <Share2 size={8} /> compartilhada
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-white truncate">{meta.title}</p>
            </div>
            <div className="shrink-0 ml-3">
              <ProgressRing pct={pct} size={52} theme={theme} />
              <p className="text-center text-[11px] font-bold mt-0.5" style={{ color: theme.from }}>{pct}%</p>
            </div>
          </div>

          {/* Values */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Acumulado</p>
              <p className="text-lg font-black text-white">{fmtBRL(Number(meta.current_value))}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30 mb-0.5">Meta</p>
              <p className="text-sm font-semibold text-white/60">{fmtBRL(Number(meta.target_value))}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
            <div
              className="h-full rounded-full relative overflow-hidden transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
                boxShadow: `0 0 8px ${theme.glow}`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s infinite",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          {(daysLeft !== null || meta.suggested_contribution) && (
            <div className="flex items-center justify-between">
              {daysLeft !== null && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} style={{ color: theme.from }} />
                  <span className="text-[11px] text-white/50">
                    {daysLeft === 0 ? "Hoje é o prazo" : `${daysLeft}d restantes`}
                  </span>
                </div>
              )}
              {meta.suggested_contribution && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <ArrowUp size={10} style={{ color: theme.to }} />
                  <span className="text-[11px]" style={{ color: theme.to }}>
                    {fmtBRL(Number(meta.suggested_contribution))}/mês
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Goal Detail Panel ─────────────────────────────────────────────────────────

function GoalDetailPanel({
  meta, themeIdx, onClose, isShared = false,
}: {
  meta: FinancialGoal; themeIdx: number; onClose: () => void; isShared?: boolean
}) {
  const theme = getTheme(themeIdx)
  const addMut = useAddContribution()
  const { data: contributions = [], isLoading: loadingContrib } = useGoalContributions(meta.id)
  const [aportValue, setAportValue] = useState("")
  const [aportSent, setAportSent] = useState(false)

  const pct = Number(meta.target_value) > 0
    ? Math.min(100, Math.round((Number(meta.current_value) / Number(meta.target_value)) * 100))
    : 0
  const faltam = Math.max(0, Number(meta.target_value) - Number(meta.current_value))
  const daysLeft = getDaysLeft(meta.deadline)
  const isComplete = pct >= 100

  const quickValues = [
    meta.suggested_contribution ? Number(meta.suggested_contribution) : null,
    faltam > 0 ? faltam : null,
    faltam > 0 ? Math.round(faltam / 2) : null,
  ].filter(Boolean) as number[]

  async function handleAport() {
    const v = parseFloat(aportValue.replace(",", "."))
    if (!v || v <= 0) return
    await addMut.mutateAsync({ goal_id: meta.id, value: v })
    setAportSent(true)
    setAportValue("")
    setTimeout(() => setAportSent(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
        <div
          className="pointer-events-auto w-full sm:max-w-lg max-h-[90svh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(10,10,25,0.98), rgba(20,10,40,0.99))",
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: `0 0 80px ${theme.glow}, 0 40px 80px rgba(0,0,0,0.8)`,
          }}
        >
          {/* Handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="shrink-0 px-6 pt-4 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] tracking-widest uppercase" style={{ color: theme.from }}>
                    {isComplete ? "✦ Meta Concluída" : "Meta Financeira"}
                  </p>
                  {isShared && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee" }}>
                      <Share2 size={9} /> compartilhada
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white truncate">{meta.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-5 mt-4">
              <div className="relative shrink-0">
                <ProgressRing pct={pct} size={80} theme={theme} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black text-white">{pct}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Acumulado</span>
                  <span className="font-bold text-white">{fmtBRLFull(Number(meta.current_value))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Meta</span>
                  <span className="font-bold" style={{ color: theme.to }}>{fmtBRLFull(Number(meta.target_value))}</span>
                </div>
                {faltam > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Faltam</span>
                    <span className="text-white/60">{fmtBRLFull(faltam)}</span>
                  </div>
                )}
                {daysLeft !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Prazo</span>
                    <span className="text-white/60">
                      {daysLeft === 0 ? "Hoje" : `${daysLeft}d · ${meta.deadline ? fmtDate(meta.deadline) : ""}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Aporte — só para dono */}
            {!isShared && !isComplete && (
              <div>
                <p className="text-[11px] tracking-widest uppercase text-white/30 mb-3">Registrar Aporte</p>
                {quickValues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickValues.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setAportValue(String(v))}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: `linear-gradient(135deg, ${theme.from}20, ${theme.to}20)`,
                          border: `1px solid ${theme.from}30`,
                          color: theme.from,
                        }}
                      >
                        {fmtBRL(v)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={aportValue}
                    onChange={e => setAportValue(e.target.value)}
                    placeholder="Valor do aporte"
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onKeyDown={e => e.key === "Enter" && handleAport()}
                  />
                  <button
                    onClick={handleAport}
                    disabled={addMut.isPending || !aportValue}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                    style={{
                      background: aportSent
                        ? "linear-gradient(135deg, #10b981, #06b6d4)"
                        : `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                      boxShadow: `0 4px 20px ${theme.glow}`,
                    }}
                  >
                    {addMut.isPending ? <Loader2 size={14} className="animate-spin" /> :
                     aportSent ? <Check size={14} /> : "Aportar"}
                  </button>
                </div>
              </div>
            )}

            {/* Badge somente visualização para convidado */}
            {isShared && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs text-white/50"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Eye size={13} /> Somente visualização — meta compartilhada
              </div>
            )}

            {/* Histórico */}
            <div>
              <p className="text-[11px] tracking-widest uppercase text-white/30 mb-3">Histórico de Aportes</p>
              {loadingContrib ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-white/30" />
                </div>
              ) : contributions.length === 0 ? (
                <p className="text-center text-xs text-white/25 py-6">Nenhum aporte registrado</p>
              ) : (
                <div className="space-y-2">
                  {[...contributions].reverse().map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl px-4 py-2.5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div>
                        <p className="text-xs font-semibold text-white">{fmtBRLFull(Number(c.value))}</p>
                        <p className="text-[10px] text-white/35">
                          {new Date(c.contribution_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <ArrowUp size={14} style={{ color: theme.from }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Nova Meta Inline Sheet ────────────────────────────────────────────────────

function NovaMetaInline({ onClose }: { onClose: () => void }) {
  const createMut = useCreateGoal()
  const [title, setTitle] = useState("")
  const [target, setTarget] = useState("")
  const [current, setCurrent] = useState("")
  const [deadline, setDeadline] = useState("")
  const [suggested, setSuggested] = useState("")

  async function handleCreate() {
    if (!title.trim() || !target) return
    await createMut.mutateAsync({
      title: title.trim(),
      target_value: parseFloat(target),
      current_value: current ? parseFloat(current) : 0,
      deadline: deadline || undefined,
      suggested_contribution: suggested ? parseFloat(suggested) : undefined,
      status: "em_andamento",
    })
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "white",
    borderRadius: "0.75rem",
    padding: "0.625rem 1rem",
    fontSize: "0.875rem",
    outline: "none",
    width: "100%",
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4">
        <div
          className="pointer-events-auto w-full sm:max-w-md max-h-[90svh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(10,10,25,0.98), rgba(20,10,40,0.99))",
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.8)",
          }}
        >
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          <div className="shrink-0 flex items-center justify-between px-6 pt-4 pb-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[10px] tracking-widest uppercase text-indigo-400">Nova Meta</p>
              <h2 className="text-lg font-black text-white">Criar Objetivo</h2>
            </div>
            <button onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1.5">Nome da meta *</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Viagem para o Japão" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1.5">Valor alvo *</label>
                <input style={inputStyle} type="number" value={target} onChange={e => setTarget(e.target.value)}
                  placeholder="50000" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1.5">Acumulado</label>
                <input style={inputStyle} type="number" value={current} onChange={e => setCurrent(e.target.value)}
                  placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1.5">Prazo</label>
                <input style={{ ...inputStyle, colorScheme: "dark" }} type="date"
                  value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1.5">Aporte sugerido</label>
                <input style={inputStyle} type="number" value={suggested} onChange={e => setSuggested(e.target.value)}
                  placeholder="500" />
              </div>
            </div>
          </div>

          <div className="shrink-0 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={handleCreate}
              disabled={createMut.isPending || !title || !target}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
              }}
            >
              {createMut.isPending
                ? <Loader2 size={14} className="animate-spin mx-auto" />
                : <span className="flex items-center justify-center gap-2"><Sparkles size={14} /> Criar Meta</span>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-3xl h-48 animate-pulse"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <Sparkles size={32} className="text-indigo-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Nenhuma meta ainda</h3>
      <p className="text-sm text-white/35 mb-6 max-w-xs">
        Defina seus objetivos financeiros e acompanhe seu progresso em tempo real.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 8px 32px rgba(99,102,241,0.35)" }}
      >
        <Sparkles size={14} /> Criar primeira meta
      </button>
    </div>
  )
}

// ── Guest View ────────────────────────────────────────────────────────────────

function GuestMetasView() {
  const { data: sharedGoals = [], isLoading } = useSharedGoals(true)
  const [selected, setSelected] = useState<FinancialGoal | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mouseX, setMouseX] = useState(0.5)
  const [mouseY, setMouseY] = useState(0.5)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX / window.innerWidth)
    setMouseY(e.clientY / window.innerHeight)
  }, [])

  const ativas = sharedGoals.filter(g => g.status === "em_andamento")
  const concluidas = sharedGoals.filter(g => g.status === "concluida")
  const totalAlvo = ativas.reduce((s, g) => s + Number(g.target_value), 0)
  const totalAtual = ativas.reduce((s, g) => s + Number(g.current_value), 0)
  const progressoGeral = totalAlvo > 0 ? Math.round((totalAtual / totalAlvo) * 100) : 0

  return (
    <div className="relative min-h-screen" onMouseMove={handleMouseMove}>
      <AuroraBackground mouseX={mouseX} mouseY={mouseY} />

      <div className="relative z-10 px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-8 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="slide-up flex items-start justify-between">
          <div>
            <p className="text-[11px] tracking-widest uppercase text-cyan-400 mb-1 flex items-center gap-1.5">
              <Share2 size={10} /> Nossas Metas
            </p>
            <h1 className="text-2xl font-black text-white tracking-tight">Metas Financeiras</h1>
            {!isLoading && (
              <p className="text-xs text-white/30 mt-1">
                {sharedGoals.length} meta{sharedGoals.length !== 1 ? "s" : ""} compartilhada{sharedGoals.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-white/50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Eye size={12} /> Somente visualização
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : sharedGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
              <Share2 size={24} className="text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Nenhuma meta compartilhada</h3>
            <p className="text-sm text-white/35">O proprietário ainda não compartilhou nenhuma meta com você.</p>
          </div>
        ) : (
          <>
            {ativas.length > 0 && (
              <GlobalProgressArc
                pct={progressoGeral}
                totalAtual={totalAtual}
                totalAlvo={totalAlvo}
                ativasCount={ativas.length}
                concluidasCount={concluidas.length}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ativas.map((meta, i) => (
                <GoalOrb
                  key={meta.id}
                  meta={meta}
                  themeIdx={i}
                  onSelect={(m) => { setSelected(m); setSelectedIdx(i) }}
                  delay={i * 80}
                  isShared
                />
              ))}
            </div>

            {concluidas.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25 px-1">✦ Concluídas</p>
                <div className="space-y-2">
                  {concluidas.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelected(m); setSelectedIdx(ativas.length + i) }}
                      className="w-full flex items-center gap-4 rounded-2xl px-4 py-3 transition-all hover:scale-[1.01] active:scale-[0.99] slide-up"
                      style={{
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.15)",
                        animationDelay: `${(ativas.length + i) * 80}ms`,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(16,185,129,0.15)" }}>
                        <Check size={14} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-white/70 truncate">{m.title}</p>
                        <p className="text-xs text-emerald-400/70">{fmtBRL(Number(m.target_value))} · Concluída</p>
                      </div>
                      <ChevronRight size={14} className="text-white/20 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <GoalDetailPanel
          meta={selected}
          themeIdx={selectedIdx}
          onClose={() => setSelected(null)}
          isShared
        />
      )}
    </div>
  )
}

// ── Owner View ────────────────────────────────────────────────────────────────

function MetasOwnerView() {
  const { goals, ativas, concluidas, totalAlvo, totalAtual, progressoGeral, isLoading } = useGoals()
  const [newOpen, setNewOpen] = useState(false)
  const [selected, setSelected] = useState<FinancialGoal | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mouseX, setMouseX] = useState(0.5)
  const [mouseY, setMouseY] = useState(0.5)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX / window.innerWidth)
    setMouseY(e.clientY / window.innerHeight)
  }, [])

  return (
    <div className="relative min-h-screen" onMouseMove={handleMouseMove}>
      <AuroraBackground mouseX={mouseX} mouseY={mouseY} />

      <div className="relative z-10 px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-8 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="slide-up flex items-start justify-between">
          <div>
            <p className="text-[11px] tracking-widest uppercase text-indigo-400 mb-1">FinanceOS</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Metas Financeiras</h1>
            {!isLoading && (
              <p className="text-xs text-white/30 mt-1">
                {ativas.length} ativa{ativas.length !== 1 ? "s" : ""}
                {concluidas.length > 0 && ` · ${concluidas.length} conquista${concluidas.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(168,85,247,0.8))",
              border: "1px solid rgba(99,102,241,0.4)",
              boxShadow: "0 4px 20px rgba(99,102,241,0.25)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nova Meta</span>
          </button>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : ativas.length === 0 ? (
          <EmptyState onNew={() => setNewOpen(true)} />
        ) : (
          <>
            <GlobalProgressArc
              pct={progressoGeral}
              totalAtual={totalAtual}
              totalAlvo={totalAlvo}
              ativasCount={ativas.length}
              concluidasCount={concluidas.length}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ativas.map((meta, i) => (
                <GoalOrb
                  key={meta.id}
                  meta={meta}
                  themeIdx={i}
                  onSelect={(m) => { setSelected(m); setSelectedIdx(i) }}
                  delay={i * 80}
                />
              ))}
            </div>

            {concluidas.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25 px-1">✦ Conquistas</p>
                <div className="space-y-2">
                  {concluidas.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelected(m); setSelectedIdx(ativas.length + i) }}
                      className="w-full flex items-center gap-4 rounded-2xl px-4 py-3 transition-all hover:scale-[1.01] active:scale-[0.99] slide-up"
                      style={{
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.15)",
                        animationDelay: `${(ativas.length + i) * 80}ms`,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(16,185,129,0.15)" }}>
                        <Check size={14} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-white/70 truncate">{m.title}</p>
                        <p className="text-xs text-emerald-400/70">{fmtBRL(Number(m.target_value))} · Concluída</p>
                      </div>
                      <ChevronRight size={14} className="text-white/20 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {newOpen && <NovaMetaInline onClose={() => setNewOpen(false)} />}
      {selected && (
        <GoalDetailPanel
          meta={selected}
          themeIdx={selectedIdx}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

function MetasPage() {
  const { isGuest } = useUserContext()

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      {isGuest ? <GuestMetasView /> : <MetasOwnerView />}
    </>
  )
}

export default MetasPage