// frontend/src/routes/_layout/metas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState, useCallback, useEffect, useRef } from "react"
import {
  Plus, X, Loader2, Check, Sparkles, Calendar,
  ChevronRight, ArrowUp, Share2, Eye, Zap,
} from "lucide-react"
import {
  useGoals, useCreateGoal, useAddContribution, useGoalContributions,
  type FinancialGoal,
} from "@/hooks/api/useGoals"
import { useSharedGoals } from "@/hooks/api/useGuestAccess"
import { useUserContext } from "@/contexts/UserContext"

export const Route = createFileRoute("/_layout/metas")({
  component: MetasPage,
  head: () => ({ meta: [{ title: "Metas — FinanceOS" }] }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const fmtBRLFull = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

function getDaysLeft(deadline?: string) {
  if (!deadline) return null
  return Math.max(0, Math.ceil((new Date(deadline + "T00:00:00").getTime() - Date.now()) / 86400000))
}

const THEMES = [
  { id: "blue",    from: "#38bdf8", to: "#818cf8", glow: "rgba(129,140,248,0.7)",  ring: "rgba(99,102,241,0.9)"  },
  { id: "violet",  from: "#c084fc", to: "#f472b6", glow: "rgba(192,132,252,0.7)", ring: "rgba(168,85,247,0.9)"  },
  { id: "emerald", from: "#34d399", to: "#22d3ee", glow: "rgba(52,211,153,0.7)",  ring: "rgba(16,185,129,0.9)"  },
  { id: "amber",   from: "#fbbf24", to: "#f87171", glow: "rgba(251,191,36,0.7)",  ring: "rgba(245,158,11,0.9)"  },
  { id: "rose",    from: "#fb7185", to: "#fb923c", glow: "rgba(251,113,133,0.7)", ring: "rgba(244,63,94,0.9)"   },
]
const T = (i: number) => THEMES[i % THEMES.length]

// ─────────────────────────────────────────────────────────────────────────────
// Global CSS — injected once, cinematic keyframes
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
  /* ── Entrance ── */
  @keyframes fade-up   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fade-in   { from{opacity:0} to{opacity:1} }
  @keyframes scale-in  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }

  /* ── Aurora layers ── */
  @keyframes aurora-drift {
    0%,100%{transform:translate(0,0) scale(1)}
    33%     {transform:translate(4%,-3%) scale(1.08)}
    66%     {transform:translate(-3%,4%) scale(.96)}
  }
  @keyframes aurora-pulse {
    0%,100%{opacity:.18}
    50%     {opacity:.32}
  }

  /* ── Card shimmer ── */
  @keyframes shimmer {
    0%  {background-position:-200% 0}
    100%{background-position:200% 0}
  }

  /* ── Progress ring draw ── */
  @keyframes ring-draw {
    from{stroke-dashoffset:var(--dash-total)}
    to  {stroke-dashoffset:var(--dash-offset)}
  }

  /* ── Float ── */
  @keyframes float {
    0%,100%{transform:translateY(0)}
    50%    {transform:translateY(-5px)}
  }

  /* ── Particle orbit ── */
  @keyframes orbit {
    from{transform:rotate(0deg) translateX(var(--r)) rotate(0deg)}
    to  {transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)}
  }

  /* ── Celebration burst ── */
  @keyframes burst {
    0%  {transform:scale(0) rotate(0deg); opacity:1}
    80% {transform:scale(1.4) rotate(180deg); opacity:.6}
    100%{transform:scale(1.6) rotate(220deg); opacity:0}
  }

  /* ── Glow pulse on complete ── */
  @keyframes glow-pulse {
    0%,100%{box-shadow:0 0 20px var(--glow)}
    50%    {box-shadow:0 0 48px var(--glow), 0 0 80px var(--glow)}
  }

  /* ── Slide tokens ── */
  .m-fade-up  { animation: fade-up  .55s cubic-bezier(.22,1,.36,1) both }
  .m-fade-in  { animation: fade-in  .4s ease both }
  .m-scale-in { animation: scale-in .45s cubic-bezier(.22,1,.36,1) both }

  /* ── Shimmer bar ── */
  .shimmer-bar {
    background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,.35) 50%,transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 2.2s linear infinite;
  }

  /* ── Float card ── */
  .m-float { animation: float 5s ease-in-out infinite }

  /* ── Tap feedback ── */
  .tap-scale { transition: transform .12s; }
  .tap-scale:active { transform: scale(.97) }
`

// ─────────────────────────────────────────────────────────────────────────────
// Aurora — fixed, z-[-1], no layout interference
// ─────────────────────────────────────────────────────────────────────────────

function Aurora({ mx, my }: { mx: number; my: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {/* base dark */}
      <div className="absolute inset-0" style={{ background: "#06060f" }} />

      {/* layer 1 — mouse-reactive indigo/violet */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 90% 70% at ${38 + mx * 24}% ${28 + my * 18}%,
          rgba(99,102,241,.45) 0%, rgba(168,85,247,.22) 42%, transparent 68%)`,
        opacity: .28,
        transition: "background .6s ease-out",
      }} />

      {/* layer 2 — animated cyan/teal */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 65% 55% at ${68 - mx * 12}% ${62 + my * 12}%,
          rgba(6,182,212,.55) 0%, rgba(16,185,129,.2) 48%, transparent 70%)`,
        animation: "aurora-drift 14s ease-in-out infinite, aurora-pulse 7s ease-in-out infinite",
        opacity: .22,
      }} />

      {/* layer 3 — animated rose/amber accent */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 100% 45% at 18% 85%,
          rgba(244,63,94,.28) 0%, rgba(251,146,60,.14) 52%, transparent 72%)`,
        animation: "aurora-drift 20s ease-in-out infinite reverse, aurora-pulse 9s ease-in-out infinite 2s",
        opacity: .18,
      }} />

      {/* subtle vignette */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 40%, rgba(0,0,0,.55) 100%)",
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Ring — SVG with animated draw
// ─────────────────────────────────────────────────────────────────────────────

function Ring({ pct, sz, theme, animate = true }: {
  pct: number; sz: number; theme: typeof THEMES[0]; animate?: boolean
}) {
  const r = (sz - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ

  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
      style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
      <defs>
        <linearGradient id={`rg-${theme.id}-${sz}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.from} />
          <stop offset="100%" stopColor={theme.to} />
        </linearGradient>
        <filter id={`glow-${theme.id}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* track */}
      <circle cx={sz/2} cy={sz/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.07)" strokeWidth={6} />

      {/* fill */}
      <circle cx={sz/2} cy={sz/2} r={r} fill="none"
        stroke={`url(#rg-${theme.id}-${sz})`}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={animate ? offset : circ}
        filter={`url(#glow-${theme.id})`}
        style={animate ? {
          "--dash-total": circ,
          "--dash-offset": offset,
          animation: "ring-draw 1.2s cubic-bezier(.22,1,.36,1) .3s both",
        } as React.CSSProperties : { strokeDashoffset: offset }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Orbit particles (decorative, only on desktop/hover)
// ─────────────────────────────────────────────────────────────────────────────

function Particles({ theme }: { theme: typeof THEMES[0] }) {
  const dots = [
    { r: 44, dur: "4.5s", del: "0s",   sz: 3 },
    { r: 56, dur: "7s",   del: "-2.2s", sz: 2 },
    { r: 36, dur: "5.8s", del: "-1s",   sz: 2 },
  ]
  return (
    <div className="absolute inset-0 pointer-events-none hidden sm:block">
      {dots.map((d, i) => (
        <div key={i} className="absolute inset-0 flex items-center justify-center">
          <div style={{
            width: d.sz * 2, height: d.sz * 2,
            "--r": `${d.r}px`,
            animation: `orbit ${d.dur} linear ${d.del} infinite`,
          } as React.CSSProperties}>
            <div style={{
              width: d.sz * 2, height: d.sz * 2,
              borderRadius: "50%",
              background: theme.from,
              boxShadow: `0 0 6px 2px ${theme.from}`,
              opacity: .7,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Progress Arc — cinematic hero card
// ─────────────────────────────────────────────────────────────────────────────

function HeroArc({ pct, totalAtual, totalAlvo, ativasCount, concluidasCount, isShared = false }: {
  pct: number; totalAtual: number; totalAlvo: number
  ativasCount: number; concluidasCount: number; isShared?: boolean
}) {
  const theme = THEMES[0]
  return (
    <div className="m-fade-up relative overflow-hidden rounded-3xl"
      style={{
        animationDelay: ".1s",
        background: "linear-gradient(140deg, rgba(15,12,40,.96) 0%, rgba(8,8,22,.98) 100%)",
        border: "1px solid rgba(99,102,241,.25)",
        boxShadow: `0 0 0 1px rgba(255,255,255,.04) inset, 0 32px 64px rgba(0,0,0,.6), 0 0 48px rgba(99,102,241,.12)`,
      }}>

      {/* glow top-left accent */}
      <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${theme.from}30 0%, transparent 70%)` }} />

      <div className="relative flex items-center gap-4 p-4 sm:p-5">
        {/* Ring */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: 76, height: 76 }}>
          <Ring pct={pct} sz={76} theme={theme} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[17px] font-black text-white tracking-tight">{pct}%</span>
          </div>
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold tracking-[.18em] uppercase mb-0.5"
            style={{ color: isShared ? "#22d3ee" : theme.from }}>
            {isShared ? "✦ Nossas Metas" : "✦ Progresso Geral"}
          </p>
          <p className="text-[22px] font-black text-white leading-none tracking-tight">
            {fmtBRL(totalAtual)}
          </p>
          <p className="text-xs text-white/38 mt-1 truncate">
            de {fmtBRL(totalAlvo)} · {ativasCount} ativa{ativasCount !== 1 ? "s" : ""}
            {concluidasCount > 0 && ` · ${concluidasCount} concluída${concluidasCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* animated progress bar at bottom */}
      <div className="h-[2px] w-full" style={{ background: "rgba(255,255,255,.05)" }}>
        <div className="h-full shimmer-bar"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
            transition: "width 1.4s cubic-bezier(.22,1,.36,1)",
          }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal Card — cinematic, mobile-first
// ─────────────────────────────────────────────────────────────────────────────

function GoalCard({ meta, themeIdx, onSelect, delay = 0, isShared = false }: {
  meta: FinancialGoal; themeIdx: number
  onSelect: (m: FinancialGoal) => void
  delay?: number; isShared?: boolean
}) {
  const th = T(themeIdx)
  const pct = Number(meta.target_value) > 0
    ? Math.min(100, Math.round((Number(meta.current_value) / Number(meta.target_value)) * 100))
    : 0
  const daysLeft = getDaysLeft(meta.deadline)
  const done = pct >= 100
  const [pressed, setPressed] = useState(false)

  return (
    <button
      className="w-full text-left tap-scale m-fade-up"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => onSelect(meta)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* outer gradient border */}
      <div
        className="rounded-3xl p-[1.5px] transition-all duration-300"
        style={{
          background: pressed
            ? `linear-gradient(135deg, ${th.from}80, ${th.to}80)`
            : `linear-gradient(135deg, ${th.from}28, ${th.to}28)`,
          boxShadow: pressed
            ? `0 0 32px ${th.glow}, 0 16px 48px rgba(0,0,0,.55)`
            : `0 8px 28px rgba(0,0,0,.45)`,
        }}>
        <div
          className="relative rounded-[22px] overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(12,11,28,.97) 0%, rgba(8,7,20,.99) 100%)",
            "--glow": th.glow,
          } as React.CSSProperties}>

          {/* card inner glow top-right */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${th.to}22 0%, transparent 70%)` }} />

          <div className="relative p-4">
            {/* row 1: label + badge + ring */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                {/* status line */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[10px] font-semibold tracking-[.15em] uppercase"
                    style={{ color: th.from }}>
                    {done ? "✦ Concluída" : "Em andamento"}
                  </span>
                  {isShared && (
                    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-[2px] text-[9px] font-semibold shrink-0"
                      style={{ background: "rgba(34,211,238,.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.2)" }}>
                      <Share2 size={7} /> compartilhada
                    </span>
                  )}
                </div>
                {/* title */}
                <p className="text-[15px] font-bold text-white truncate leading-snug">{meta.title}</p>
              </div>

              {/* ring */}
              <div className="relative shrink-0 flex items-center justify-center" style={{ width: 54, height: 54 }}>
                <Ring pct={pct} sz={54} theme={th} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-black" style={{ color: th.from }}>{pct}%</span>
                </div>
              </div>
            </div>

            {/* row 2: values */}
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] text-white/32 mb-0.5">Acumulado</p>
                <p className="text-[18px] font-black text-white leading-none">{fmtBRL(Number(meta.current_value))}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/32 mb-0.5">Meta</p>
                <p className="text-[13px] font-semibold" style={{ color: th.to }}>{fmtBRL(Number(meta.target_value))}</p>
              </div>
            </div>

            {/* row 3: progress bar */}
            <div className="h-[5px] rounded-full overflow-hidden mb-3"
              style={{ background: "rgba(255,255,255,.06)" }}>
              <div className="h-full rounded-full shimmer-bar relative"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${th.from}, ${th.to})`,
                  boxShadow: `0 0 10px ${th.glow}`,
                  transition: "width 1.3s cubic-bezier(.22,1,.36,1)",
                }} />
            </div>

            {/* row 4: meta / prazo */}
            {(daysLeft !== null || meta.suggested_contribution) && (
              <div className="flex items-center justify-between">
                {daysLeft !== null && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={10} style={{ color: th.from }} />
                    <span className="text-[11px] text-white/42">
                      {daysLeft === 0 ? "Hoje é o prazo" : `${daysLeft}d restantes`}
                    </span>
                  </div>
                )}
                {meta.suggested_contribution && (
                  <div className="flex items-center gap-1 ml-auto">
                    <ArrowUp size={9} style={{ color: th.to }} />
                    <span className="text-[11px] font-semibold" style={{ color: th.to }}>
                      {fmtBRL(Number(meta.suggested_contribution))}/mês
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* bottom border glow */}
          <div className="h-[1px]"
            style={{ background: `linear-gradient(90deg, transparent, ${th.from}40, ${th.to}40, transparent)` }} />
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Panel — bottom sheet / centered modal
// ─────────────────────────────────────────────────────────────────────────────

function DetailPanel({ meta, themeIdx, onClose, isShared = false }: {
  meta: FinancialGoal; themeIdx: number; onClose: () => void; isShared?: boolean
}) {
  const th = T(themeIdx)
  const addMut = useAddContribution()
  const { data: contribs = [], isLoading: loadingC } = useGoalContributions(meta.id)
  const [val, setVal] = useState("")
  const [sent, setSent] = useState(false)

  const pct = Number(meta.target_value) > 0
    ? Math.min(100, Math.round((Number(meta.current_value) / Number(meta.target_value)) * 100))
    : 0
  const faltam = Math.max(0, Number(meta.target_value) - Number(meta.current_value))
  const daysLeft = getDaysLeft(meta.deadline)
  const done = pct >= 100

  const quickVals = [
    meta.suggested_contribution ? Number(meta.suggested_contribution) : null,
    faltam > 0 ? faltam : null,
    faltam > 0 ? Math.round(faltam / 2) : null,
  ].filter(Boolean) as number[]

  async function handleAport() {
    const v = parseFloat(val.replace(",", "."))
    if (!v || v <= 0) return
    await addMut.mutateAsync({ goal_id: meta.id, value: v })
    setSent(true); setVal("")
    setTimeout(() => setSent(false), 2200)
  }

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 m-fade-in"
        style={{ zIndex: 60, background: "rgba(0,0,0,.72)", backdropFilter: "blur(14px)" }}
        onClick={onClose}
      />

      {/* sheet */}
      <div
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4 m-scale-in"
        style={{ zIndex: 61, pointerEvents: "none" }}>
        <div
          className="pointer-events-auto w-full sm:max-w-lg max-h-[92svh] flex flex-col rounded-t-[28px] sm:rounded-[28px] overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(12,10,32,.99) 0%, rgba(7,6,18,1) 100%)",
            border: "1px solid rgba(99,102,241,.22)",
            boxShadow: `0 0 80px ${th.glow}, 0 -4px 60px rgba(0,0,0,.7)`,
          }}>

          {/* drag handle — mobile */}
          <div className="flex justify-center pt-3 shrink-0 sm:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,.18)" }} />
          </div>

          {/* header */}
          <div className="shrink-0 px-5 pt-4 pb-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <div className="flex items-start gap-3">
              {/* ring */}
              <div className="relative shrink-0 flex items-center justify-center" style={{ width: 72, height: 72 }}>
                <Ring pct={pct} sz={72} theme={th} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-black text-white">{pct}%</span>
                </div>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-semibold tracking-[.18em] uppercase"
                    style={{ color: done ? "#34d399" : th.from }}>
                    {done ? "✦ Concluída" : "Meta Financeira"}
                  </span>
                  {isShared && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: "rgba(34,211,238,.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.2)" }}>
                      <Share2 size={9} /> compartilhada
                    </span>
                  )}
                </div>
                <p className="text-lg font-black text-white truncate">{meta.title}</p>
              </div>

              <button onClick={onClose}
                className="shrink-0 flex size-8 items-center justify-center rounded-xl text-white/35 transition-colors"
                style={{ background: "rgba(255,255,255,.06)" }}>
                <X size={15} />
              </button>
            </div>

            {/* stats row */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: "Acumulado", value: fmtBRLFull(Number(meta.current_value)), color: "text-white" },
                { label: "Meta", value: fmtBRLFull(Number(meta.target_value)), color: "", style: { color: th.to } },
                faltam > 0 ? { label: "Faltam", value: fmtBRLFull(faltam), color: "text-white/55" } : null,
                daysLeft !== null ? { label: "Prazo", value: daysLeft === 0 ? "Hoje!" : `${daysLeft}d · ${fmtDate(meta.deadline!)}`, color: "text-white/55" } : null,
              ].filter(Boolean).map((s: any, i) => (
                <div key={i} className="rounded-xl px-3 py-2"
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <p className="text-[10px] text-white/35 mb-0.5">{s.label}</p>
                  <p className={`text-sm font-bold ${s.color}`} style={s.style}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* aporte — owner only */}
            {!isShared && !done && (
              <div>
                <p className="text-[10px] font-semibold tracking-[.16em] uppercase text-white/32 mb-2.5">
                  Registrar Aporte
                </p>
                {quickVals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickVals.map((v, i) => (
                      <button key={i} onClick={() => setVal(String(v))}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold tap-scale"
                        style={{
                          background: `linear-gradient(135deg, ${th.from}18, ${th.to}18)`,
                          border: `1px solid ${th.from}38`,
                          color: th.from,
                        }}>
                        {fmtBRL(v)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    placeholder="R$ valor do aporte"
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    style={{
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.1)",
                    }}
                    onKeyDown={e => e.key === "Enter" && handleAport()}
                  />
                  <button
                    onClick={handleAport}
                    disabled={addMut.isPending || !val}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-white tap-scale disabled:opacity-40"
                    style={{
                      background: sent
                        ? "linear-gradient(135deg,#10b981,#06b6d4)"
                        : `linear-gradient(135deg,${th.from},${th.to})`,
                      boxShadow: `0 4px 18px ${th.glow}`,
                      minWidth: 80,
                    }}>
                    {addMut.isPending
                      ? <Loader2 size={14} className="animate-spin mx-auto" />
                      : sent ? <Check size={14} className="mx-auto" />
                      : "Aportar"}
                  </button>
                </div>
              </div>
            )}

            {/* read-only badge */}
            {isShared && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs text-white/42"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                <Eye size={12} /> Somente visualização — meta compartilhada
              </div>
            )}

            {/* history */}
            <div>
              <p className="text-[10px] font-semibold tracking-[.16em] uppercase text-white/32 mb-2.5">
                Histórico de Aportes
              </p>
              {loadingC
                ? <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-white/25" /></div>
                : contribs.length === 0
                  ? <p className="text-center text-xs text-white/22 py-6">Nenhum aporte ainda</p>
                  : (
                    <div className="space-y-2">
                      {[...contribs].reverse().map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-xl px-4 py-2.5"
                          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                          <div>
                            <p className="text-sm font-bold text-white">{fmtBRLFull(Number(c.value))}</p>
                            <p className="text-[10px] text-white/32">
                              {new Date(c.contribution_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <ArrowUp size={13} style={{ color: th.from }} />
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

// ─────────────────────────────────────────────────────────────────────────────
// Nova Meta Sheet
// ─────────────────────────────────────────────────────────────────────────────

function NovaMetaSheet({ onClose }: { onClose: () => void }) {
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

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 12,
    padding: "10px 16px",
    fontSize: 14,
    color: "white",
    outline: "none",
    width: "100%",
  }

  return (
    <>
      <div className="fixed inset-0 m-fade-in"
        style={{ zIndex: 60, background: "rgba(0,0,0,.72)", backdropFilter: "blur(14px)" }}
        onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4 m-scale-in"
        style={{ zIndex: 61, pointerEvents: "none" }}>
        <div className="pointer-events-auto w-full sm:max-w-md max-h-[92svh] flex flex-col rounded-t-[28px] sm:rounded-[28px] overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(12,10,32,.99), rgba(7,6,18,1))",
            border: "1px solid rgba(99,102,241,.22)",
            boxShadow: "0 0 60px rgba(99,102,241,.25), 0 -4px 60px rgba(0,0,0,.7)",
          }}>

          <div className="flex justify-center pt-3 shrink-0 sm:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,.18)" }} />
          </div>

          {/* header */}
          <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <div>
              <p className="text-[10px] tracking-[.18em] uppercase text-indigo-400 mb-0.5">Novo Objetivo</p>
              <h2 className="text-lg font-black text-white">Criar Meta</h2>
            </div>
            <button onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl text-white/35"
              style={{ background: "rgba(255,255,255,.06)" }}>
              <X size={15} />
            </button>
          </div>

          {/* body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div>
              <label className="block text-[10px] text-white/38 uppercase tracking-widest mb-1.5">Nome *</label>
              <input style={inp} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Viagem para o Japão" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/38 uppercase tracking-widest mb-1.5">Valor alvo *</label>
                <input style={inp} type="number" inputMode="decimal"
                  value={target} onChange={e => setTarget(e.target.value)} placeholder="50000" />
              </div>
              <div>
                <label className="block text-[10px] text-white/38 uppercase tracking-widest mb-1.5">Acumulado</label>
                <input style={inp} type="number" inputMode="decimal"
                  value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/38 uppercase tracking-widest mb-1.5">Prazo</label>
                <input style={{ ...inp, colorScheme: "dark" }} type="date"
                  value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] text-white/38 uppercase tracking-widest mb-1.5">Aporte/mês</label>
                <input style={inp} type="number" inputMode="decimal"
                  value={suggested} onChange={e => setSuggested(e.target.value)} placeholder="500" />
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="shrink-0 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <button onClick={handleCreate}
              disabled={createMut.isPending || !title || !target}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white tap-scale disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg,#6366f1,#a855f7)",
                boxShadow: "0 8px 28px rgba(99,102,241,.4)",
              }}>
              {createMut.isPending
                ? <Loader2 size={15} className="animate-spin mx-auto" />
                : <span className="flex items-center justify-center gap-2"><Sparkles size={13} /> Criar Meta</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeletons
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl h-[88px] animate-pulse"
        style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.05)" }} />
      {[1, 2].map(i => (
        <div key={i} className="rounded-3xl h-[148px] animate-pulse"
          style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.05)", animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty
// ─────────────────────────────────────────────────────────────────────────────

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center m-fade-up">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", boxShadow: "0 0 32px rgba(99,102,241,.12)" }}>
        <Zap size={30} className="text-indigo-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Nenhuma meta criada</h3>
      <p className="text-sm text-white/35 mb-7 max-w-[240px]">
        Defina seus objetivos e acompanhe seu progresso aqui.
      </p>
      <button onClick={onNew}
        className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white tap-scale"
        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", boxShadow: "0 8px 28px rgba(99,102,241,.4)" }}>
        <Sparkles size={13} /> Criar primeira meta
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner views
// ─────────────────────────────────────────────────────────────────────────────

function OwnerView() {
  const { goals, ativas, concluidas, totalAlvo, totalAtual, progressoGeral, isLoading } = useGoals()
  const [newOpen, setNewOpen] = useState(false)
  const [sel, setSel] = useState<FinancialGoal | null>(null)
  const [selIdx, setSelIdx] = useState(0)
  const [mx, setMx] = useState(.5)
  const [my, setMy] = useState(.5)

  const onMove = useCallback((e: React.MouseEvent) => {
    setMx(e.clientX / window.innerWidth)
    setMy(e.clientY / window.innerHeight)
  }, [])

  return (
    <div onMouseMove={onMove}>
      <Aurora mx={mx} my={my} />

      <div className="space-y-4">
        {/* header */}
        <div className="m-fade-up flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-indigo-400 mb-0.5">FinanceOS</p>
            <h1 className="text-[22px] font-black text-white tracking-tight leading-tight">Metas Financeiras</h1>
            {!isLoading && (
              <p className="text-xs text-white/32 mt-0.5">
                {ativas.length} ativa{ativas.length !== 1 ? "s" : ""}
                {concluidas.length > 0 && ` · ${concluidas.length} conquista${concluidas.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>
          <button onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white tap-scale shrink-0"
            style={{
              background: "linear-gradient(135deg,rgba(99,102,241,.75),rgba(168,85,247,.75))",
              border: "1px solid rgba(99,102,241,.35)",
              boxShadow: "0 4px 18px rgba(99,102,241,.28)",
              backdropFilter: "blur(12px)",
            }}>
            <Plus size={14} /> Nova Meta
          </button>
        </div>

        {isLoading ? <Skeleton /> : ativas.length === 0 ? (
          <Empty onNew={() => setNewOpen(true)} />
        ) : (
          <>
            <HeroArc pct={progressoGeral} totalAtual={totalAtual} totalAlvo={totalAlvo}
              ativasCount={ativas.length} concluidasCount={concluidas.length} />

            <div className="space-y-3">
              {ativas.map((m, i) => (
                <GoalCard key={m.id} meta={m} themeIdx={i}
                  onSelect={m => { setSel(m); setSelIdx(i) }} delay={i * 90} />
              ))}
            </div>

            {concluidas.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-white/22 px-1">✦ Conquistas</p>
                {concluidas.map((m, i) => (
                  <button key={m.id} onClick={() => { setSel(m); setSelIdx(ativas.length + i) }}
                    className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 tap-scale m-fade-up"
                    style={{
                      background: "rgba(16,185,129,.07)",
                      border: "1px solid rgba(16,185,129,.18)",
                      animationDelay: `${(ativas.length + i) * 90}ms`,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(16,185,129,.18)" }}>
                      <Check size={13} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-white/65 truncate">{m.title}</p>
                      <p className="text-xs text-emerald-400/65">{fmtBRL(Number(m.target_value))} · Concluída</p>
                    </div>
                    <ChevronRight size={13} className="text-white/18 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {newOpen && <NovaMetaSheet onClose={() => setNewOpen(false)} />}
      {sel && <DetailPanel meta={sel} themeIdx={selIdx} onClose={() => setSel(null)} />}
    </div>
  )
}

function GuestView() {
  const { data: goals = [], isLoading } = useSharedGoals(true)
  const [sel, setSel] = useState<FinancialGoal | null>(null)
  const [selIdx, setSelIdx] = useState(0)
  const [mx, setMx] = useState(.5)
  const [my, setMy] = useState(.5)

  const onMove = useCallback((e: React.MouseEvent) => {
    setMx(e.clientX / window.innerWidth)
    setMy(e.clientY / window.innerHeight)
  }, [])

  const ativas = goals.filter(g => g.status === "em_andamento")
  const concluidas = goals.filter(g => g.status === "concluida")
  const totalAlvo = ativas.reduce((s, g) => s + Number(g.target_value), 0)
  const totalAtual = ativas.reduce((s, g) => s + Number(g.current_value), 0)
  const pct = totalAlvo > 0 ? Math.round((totalAtual / totalAlvo) * 100) : 0

  return (
    <div onMouseMove={onMove}>
      <Aurora mx={mx} my={my} />

      <div className="space-y-4">
        {/* header */}
        <div className="m-fade-up flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-cyan-400 mb-0.5 flex items-center gap-1.5">
              <Share2 size={9} /> Nossas Metas
            </p>
            <h1 className="text-[22px] font-black text-white tracking-tight leading-tight">Metas Financeiras</h1>
            {!isLoading && (
              <p className="text-xs text-white/32 mt-0.5">
                {goals.length} meta{goals.length !== 1 ? "s" : ""} compartilhada{goals.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] text-white/42 shrink-0 mt-1"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
            <Eye size={11} /> Somente visualização
          </div>
        </div>

        {isLoading ? <Skeleton /> : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center m-fade-up">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(34,211,238,.1)", border: "1px solid rgba(34,211,238,.2)" }}>
              <Share2 size={22} className="text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Nenhuma meta compartilhada</h3>
            <p className="text-sm text-white/35 max-w-[240px]">O proprietário ainda não compartilhou nenhuma meta com você.</p>
          </div>
        ) : (
          <>
            {ativas.length > 0 && (
              <HeroArc pct={pct} totalAtual={totalAtual} totalAlvo={totalAlvo}
                ativasCount={ativas.length} concluidasCount={concluidas.length} isShared />
            )}

            <div className="space-y-3">
              {ativas.map((m, i) => (
                <GoalCard key={m.id} meta={m} themeIdx={i}
                  onSelect={m => { setSel(m); setSelIdx(i) }} delay={i * 90} isShared />
              ))}
            </div>

            {concluidas.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-white/22 px-1">✦ Concluídas</p>
                {concluidas.map((m, i) => (
                  <button key={m.id} onClick={() => { setSel(m); setSelIdx(ativas.length + i) }}
                    className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 tap-scale m-fade-up"
                    style={{
                      background: "rgba(16,185,129,.07)",
                      border: "1px solid rgba(16,185,129,.18)",
                      animationDelay: `${(ativas.length + i) * 90}ms`,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(16,185,129,.18)" }}>
                      <Check size={13} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-white/65 truncate">{m.title}</p>
                      <p className="text-xs text-emerald-400/65">{fmtBRL(Number(m.target_value))} · Concluída</p>
                    </div>
                    <ChevronRight size={13} className="text-white/18 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {sel && <DetailPanel meta={sel} themeIdx={selIdx} onClose={() => setSel(null)} isShared />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

function MetasPage() {
  const { isGuest } = useUserContext()
  return (
    <>
      <style>{CSS}</style>
      {/*
        Negative margin + min-h para cobrir todo o espaço do _layout main,
        preservando o padding interno para o conteúdo.
        O Aurora usa position:fixed com z-index:-1 para ficar atrás de tudo
        sem interferir no layout box do _layout.
      */}
      <div className="-m-4 md:-m-8 min-h-[calc(100svh-4rem)]"
        style={{ background: "#06060f" }}>
        <div className="max-w-xl mx-auto px-4 pt-5 pb-28 md:px-8 md:pt-7 md:pb-10">
          {isGuest ? <GuestView /> : <OwnerView />}
        </div>
      </div>
    </>
  )
}

export default MetasPage