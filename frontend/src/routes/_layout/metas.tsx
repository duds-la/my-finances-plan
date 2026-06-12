// frontend/src/routes/_layout/metas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState, useCallback } from "react"
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
import { CountUp } from "@/components/Common/CountUp"

export const Route = createFileRoute("/_layout/metas")({
  component: MetasPage,
  head: () => ({ meta: [{ title: "Metas — FinanceOS" }] }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const fmtBRLFull = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
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
// CSS local — keyframes com prefixo mg- para NÃO conflitar com o index.css
// (o `shimmer` global do skeleton era sobrescrito pela versão antiga daqui)
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes mg-fade-up  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes mg-fade-in  { from{opacity:0} to{opacity:1} }
  @keyframes mg-scale-in { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }

  @keyframes mg-aurora-drift {
    0%,100%{transform:translate(0,0) scale(1)}
    33%     {transform:translate(4%,-3%) scale(1.08)}
    66%     {transform:translate(-3%,4%) scale(.96)}
  }
  @keyframes mg-aurora-pulse {
    0%,100%{opacity:.18}
    50%     {opacity:.32}
  }

  @keyframes mg-shimmer {
    0%  {background-position:-200% 0}
    100%{background-position:200% 0}
  }

  @keyframes mg-ring-draw {
    from{stroke-dashoffset:var(--dash-total)}
    to  {stroke-dashoffset:var(--dash-offset)}
  }

  @keyframes mg-orbit {
    from{transform:rotate(0deg) translateX(var(--r)) rotate(0deg)}
    to  {transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)}
  }

  .m-fade-up  { animation: mg-fade-up  .55s cubic-bezier(.22,1,.36,1) both }
  .m-fade-in  { animation: mg-fade-in  .4s ease both }
  .m-scale-in { animation: mg-scale-in .45s cubic-bezier(.22,1,.36,1) both }

  .shimmer-bar {
    background-image: linear-gradient(90deg,transparent 0%,rgba(255,255,255,.35) 50%,transparent 100%);
    background-size: 200% 100%;
    animation: mg-shimmer 2.2s linear infinite;
  }

  .tap-scale { transition: transform .12s; }
  .tap-scale:active { transform: scale(.97) }
`

// ─────────────────────────────────────────────────────────────────────────────
// Aurora local — camada EXTRA reativa ao mouse, por cima da aurora global.
// Sem base escura nem vinheta (isso agora é do AnimatedBackground do _layout),
// então o light mode volta a funcionar.
// ─────────────────────────────────────────────────────────────────────────────

function Aurora({ mx, my }: { mx: number; my: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: -1 }}>
      {/* layer 1 — mouse-reactive indigo/violet */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 90% 70% at ${38 + mx * 24}% ${28 + my * 18}%,
          rgba(99,102,241,.45) 0%, rgba(168,85,247,.22) 42%, transparent 68%)`,
        opacity: .2,
        transition: "background .6s ease-out",
      }} />

      {/* layer 2 — animated cyan/teal */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 65% 55% at ${68 - mx * 12}% ${62 + my * 12}%,
          rgba(6,182,212,.55) 0%, rgba(16,185,129,.2) 48%, transparent 70%)`,
        animation: "mg-aurora-drift 14s ease-in-out infinite, mg-aurora-pulse 7s ease-in-out infinite",
        opacity: .16,
      }} />

      {/* layer 3 — animated rose/amber accent */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 100% 45% at 18% 85%,
          rgba(244,63,94,.28) 0%, rgba(251,146,60,.14) 52%, transparent 72%)`,
        animation: "mg-aurora-drift 20s ease-in-out infinite reverse, mg-aurora-pulse 9s ease-in-out infinite 2s",
        opacity: .13,
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Ring — SVG com draw animado
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
        stroke="var(--border)" strokeOpacity={0.6} strokeWidth={6} />

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
          animation: "mg-ring-draw 1.2s cubic-bezier(.22,1,.36,1) .3s both",
        } as React.CSSProperties : { strokeDashoffset: offset }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Arc — card de progresso geral
// ─────────────────────────────────────────────────────────────────────────────

function HeroArc({ pct, totalAtual, totalAlvo, ativasCount, concluidasCount, isShared = false }: {
  pct: number; totalAtual: number; totalAlvo: number
  ativasCount: number; concluidasCount: number; isShared?: boolean
}) {
  const theme = THEMES[0]
  return (
    <div className="m-fade-up glass-card relative overflow-hidden rounded-3xl"
      style={{
        animationDelay: ".1s",
        border: "1px solid rgba(99,102,241,.3)",
        boxShadow: `0 8px 32px rgba(0,0,0,.25), 0 0 48px rgba(99,102,241,.1)`,
      }}>

      {/* glow top-left accent */}
      <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full"
        style={{ background: `radial-gradient(circle, ${theme.from}30 0%, transparent 70%)` }} />

      <div className="relative flex items-center gap-4 p-4 sm:p-5">
        {/* Ring */}
        <div className="relative flex shrink-0 items-center justify-center" style={{ width: 76, height: 76 }}>
          <Ring pct={pct} sz={76} theme={theme} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-numeric text-[17px] font-black tracking-tight text-foreground">{pct}%</span>
          </div>
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[.18em]"
            style={{ color: isShared ? "#22d3ee" : theme.from }}>
            {isShared ? "✦ Nossas Metas" : "✦ Progresso Geral"}
          </p>
          <p className="font-display text-[22px] font-black leading-none tracking-tight text-foreground">
            <CountUp value={totalAtual} format={fmtBRL} duration={1400} />
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            de {fmtBRL(totalAlvo)} · {ativasCount} ativa{ativasCount !== 1 ? "s" : ""}
            {concluidasCount > 0 && ` · ${concluidasCount} concluída${concluidasCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* animated progress bar at bottom */}
      <div className="h-[2px] w-full bg-muted">
        <div className="shimmer-bar h-full"
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
// Goal Card
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
      className="m-fade-up tap-scale w-full text-left"
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
            : `linear-gradient(135deg, ${th.from}30, ${th.to}30)`,
          boxShadow: pressed
            ? `0 0 32px ${th.glow}, 0 16px 48px rgba(0,0,0,.35)`
            : `0 8px 28px rgba(0,0,0,.2)`,
        }}>
        <div className="glass-card relative overflow-hidden rounded-[22px]">

          {/* card inner glow top-right */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
            style={{ background: `radial-gradient(circle, ${th.to}22 0%, transparent 70%)` }} />

          <div className="relative p-4">
            {/* row 1: label + badge + ring */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[.15em]"
                    style={{ color: th.from }}>
                    {done ? "✦ Concluída" : "Em andamento"}
                  </span>
                  {isShared && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-[2px] text-[9px] font-semibold"
                      style={{ background: "rgba(34,211,238,.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,.2)" }}>
                      <Share2 size={7} /> compartilhada
                    </span>
                  )}
                </div>
                <p className="truncate text-[15px] font-bold leading-snug text-foreground">{meta.title}</p>
              </div>

              {/* ring */}
              <div className="relative flex shrink-0 items-center justify-center" style={{ width: 54, height: 54 }}>
                <Ring pct={pct} sz={54} theme={th} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-numeric text-[11px] font-black" style={{ color: th.from }}>{pct}%</span>
                </div>
              </div>
            </div>

            {/* row 2: values */}
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="mb-0.5 text-[10px] text-muted-foreground">Acumulado</p>
                <p className="font-numeric text-[18px] font-black leading-none text-foreground">{fmtBRL(Number(meta.current_value))}</p>
              </div>
              <div className="text-right">
                <p className="mb-0.5 text-[10px] text-muted-foreground">Meta</p>
                <p className="font-numeric text-[13px] font-semibold" style={{ color: th.to }}>{fmtBRL(Number(meta.target_value))}</p>
              </div>
            </div>

            {/* row 3: progress bar */}
            <div className="mb-3 h-[5px] overflow-hidden rounded-full bg-muted">
              <div className="shimmer-bar relative h-full rounded-full"
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
                    <span className="text-[11px] text-muted-foreground">
                      {daysLeft === 0 ? "Hoje é o prazo" : `${daysLeft}d restantes`}
                    </span>
                  </div>
                )}
                {meta.suggested_contribution && (
                  <div className="ml-auto flex items-center gap-1">
                    <ArrowUp size={9} style={{ color: th.to }} />
                    <span className="font-numeric text-[11px] font-semibold" style={{ color: th.to }}>
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
// Detail Panel — bottom sheet / modal central
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
        className="m-fade-in fixed inset-0"
        style={{ zIndex: 60, background: "rgba(0,0,0,.6)", backdropFilter: "blur(14px)" }}
        onClick={onClose}
      />

      {/* sheet */}
      <div
        className="m-scale-in fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
        style={{ zIndex: 61, pointerEvents: "none" }}>
        <div
          className="glass-card pointer-events-auto flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[28px] sm:max-w-lg sm:rounded-[28px]"
          style={{
            border: "1px solid rgba(99,102,241,.3)",
            boxShadow: `0 0 80px ${th.glow}, 0 -4px 60px rgba(0,0,0,.4)`,
          }}>

          {/* drag handle — mobile */}
          <div className="flex shrink-0 justify-center pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* header */}
          <div className="shrink-0 border-b border-border/50 px-5 pb-4 pt-4">
            <div className="flex items-start gap-3">
              {/* ring */}
              <div className="relative flex shrink-0 items-center justify-center" style={{ width: 72, height: 72 }}>
                <Ring pct={pct} sz={72} theme={th} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-numeric text-base font-black text-foreground">{pct}%</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[.18em]"
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
                <p className="font-display truncate text-lg font-black text-foreground">{meta.title}</p>
              </div>

              <button onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-colors hover:bg-muted">
                <X size={15} />
              </button>
            </div>

            {/* stats row */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: "Acumulado", value: fmtBRLFull(Number(meta.current_value)), color: "text-foreground" },
                { label: "Meta", value: fmtBRLFull(Number(meta.target_value)), color: "", style: { color: th.to } },
                faltam > 0 ? { label: "Faltam", value: fmtBRLFull(faltam), color: "text-muted-foreground" } : null,
                daysLeft !== null ? { label: "Prazo", value: daysLeft === 0 ? "Hoje!" : `${daysLeft}d · ${fmtDate(meta.deadline!)}`, color: "text-muted-foreground" } : null,
              ].filter(Boolean).map((s: any, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="mb-0.5 text-[10px] text-muted-foreground">{s.label}</p>
                  <p className={`font-numeric text-sm font-bold ${s.color}`} style={s.style}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* scrollable body */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

            {/* aporte — somente dono */}
            {!isShared && !done && (
              <div>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                  Registrar Aporte
                </p>
                {quickVals.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {quickVals.map((v, i) => (
                      <button key={i} onClick={() => setVal(String(v))}
                        className="tap-scale font-numeric rounded-xl px-3 py-1.5 text-xs font-semibold"
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
                    className="font-numeric flex-1 rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    onKeyDown={e => e.key === "Enter" && handleAport()}
                  />
                  <button
                    onClick={handleAport}
                    disabled={addMut.isPending || !val}
                    className="tap-scale rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                    style={{
                      background: sent
                        ? "linear-gradient(135deg,#10b981,#06b6d4)"
                        : `linear-gradient(135deg,${th.from},${th.to})`,
                      boxShadow: `0 4px 18px ${th.glow}`,
                      minWidth: 80,
                    }}>
                    {addMut.isPending
                      ? <Loader2 size={14} className="mx-auto animate-spin" />
                      : sent ? <Check size={14} className="mx-auto" />
                      : "Aportar"}
                  </button>
                </div>
              </div>
            )}

            {/* read-only badge */}
            {isShared && (
              <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                <Eye size={12} /> Somente visualização — meta compartilhada
              </div>
            )}

            {/* histórico */}
            <div>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Histórico de Aportes
              </p>
              {loadingC
                ? <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-muted-foreground/50" /></div>
                : contribs.length === 0
                  ? <p className="py-6 text-center text-xs text-muted-foreground/60">Nenhum aporte ainda</p>
                  : (
                    <div className="space-y-2">
                      {[...contribs].reverse().map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5">
                          <div>
                            <p className="font-numeric text-sm font-bold text-foreground">{fmtBRLFull(Number(c.value))}</p>
                            <p className="text-[10px] text-muted-foreground">
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

const inputClass =
  "w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"

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

  return (
    <>
      <div className="m-fade-in fixed inset-0"
        style={{ zIndex: 60, background: "rgba(0,0,0,.6)", backdropFilter: "blur(14px)" }}
        onClick={onClose} />

      <div className="m-scale-in fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
        style={{ zIndex: 61, pointerEvents: "none" }}>
        <div className="glass-card pointer-events-auto flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[28px] sm:max-w-md sm:rounded-[28px]"
          style={{
            border: "1px solid rgba(99,102,241,.3)",
            boxShadow: "0 0 60px rgba(99,102,241,.25), 0 -4px 60px rgba(0,0,0,.4)",
          }}>

          <div className="flex shrink-0 justify-center pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 pb-4 pt-4">
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-[.18em] text-indigo-400">Novo Objetivo</p>
              <h2 className="font-display text-lg font-black text-foreground">Criar Meta</h2>
            </div>
            <button onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-colors hover:bg-muted">
              <X size={15} />
            </button>
          </div>

          {/* body */}
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Nome *</label>
              <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Viagem para o Japão" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Valor alvo *</label>
                <input className={`${inputClass} font-numeric`} type="number" inputMode="decimal"
                  value={target} onChange={e => setTarget(e.target.value)} placeholder="50000" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Acumulado</label>
                <input className={`${inputClass} font-numeric`} type="number" inputMode="decimal"
                  value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Prazo</label>
                <input className={inputClass} type="date"
                  value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Aporte/mês</label>
                <input className={`${inputClass} font-numeric`} type="number" inputMode="decimal"
                  value={suggested} onChange={e => setSuggested(e.target.value)} placeholder="500" />
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="shrink-0 border-t border-border/50 px-5 py-4">
            <button onClick={handleCreate}
              disabled={createMut.isPending || !title || !target}
              className="tap-scale w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg,#6366f1,#a855f7)",
                boxShadow: "0 8px 28px rgba(99,102,241,.4)",
              }}>
              {createMut.isPending
                ? <Loader2 size={15} className="mx-auto animate-spin" />
                : <span className="flex items-center justify-center gap-2"><Sparkles size={13} /> Criar Meta</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton + Empty
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-[88px] rounded-3xl" />
      {[1, 2].map(i => (
        <div key={i} className="skeleton h-[148px] rounded-3xl" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  )
}

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="m-fade-up flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{ background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", boxShadow: "0 0 32px rgba(99,102,241,.15)" }}>
        <Zap size={30} className="text-indigo-400" />
      </div>
      <h3 className="font-display mb-2 text-lg font-bold text-foreground">Nenhuma meta criada</h3>
      <p className="mb-7 max-w-[240px] text-sm text-muted-foreground">
        Defina seus objetivos e acompanhe seu progresso aqui.
      </p>
      <button onClick={onNew}
        className="tap-scale flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white"
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
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[.2em] text-indigo-400">FinanceOS</p>
            <h1 className="font-display text-[22px] font-black leading-tight tracking-tight text-foreground">Metas Financeiras</h1>
            {!isLoading && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ativas.length} ativa{ativas.length !== 1 ? "s" : ""}
                {concluidas.length > 0 && ` · ${concluidas.length} conquista${concluidas.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="tap-scale flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg,rgba(99,102,241,.75),rgba(168,85,247,.75))",
              border: "1px solid rgba(99,102,241,.35)",
              boxShadow: "0 4px 18px rgba(99,102,241,.28)",
              backdropFilter: "blur(12px)",
            }}>
            <Plus size={14} /> <span className="hidden sm:inline">Nova Meta</span>
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
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground/60">✦ Conquistas</p>
                {concluidas.map((m, i) => (
                  <button key={m.id} onClick={() => { setSel(m); setSelIdx(ativas.length + i) }}
                    className="m-fade-up tap-scale flex w-full items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
                    style={{ animationDelay: `${(ativas.length + i) * 90}ms` }}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check size={13} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-foreground/80">{m.title}</p>
                      <p className="font-numeric text-xs text-emerald-500/80">{fmtBRL(Number(m.target_value))} · Concluída</p>
                    </div>
                    <ChevronRight size={13} className="shrink-0 text-muted-foreground/40" />
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
            <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-400">
              <Share2 size={9} /> Nossas Metas
            </p>
            <h1 className="font-display text-[22px] font-black leading-tight tracking-tight text-foreground">Metas Financeiras</h1>
            {!isLoading && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {goals.length} meta{goals.length !== 1 ? "s" : ""} compartilhada{goals.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            <Eye size={11} /> Somente visualização
          </div>
        </div>

        {isLoading ? <Skeleton /> : goals.length === 0 ? (
          <div className="m-fade-up flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(34,211,238,.1)", border: "1px solid rgba(34,211,238,.25)" }}>
              <Share2 size={22} className="text-cyan-400" />
            </div>
            <h3 className="font-display mb-2 text-base font-bold text-foreground">Nenhuma meta compartilhada</h3>
            <p className="max-w-[240px] text-sm text-muted-foreground">O proprietário ainda não compartilhou nenhuma meta com você.</p>
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
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground/60">✦ Concluídas</p>
                {concluidas.map((m, i) => (
                  <button key={m.id} onClick={() => { setSel(m); setSelIdx(ativas.length + i) }}
                    className="m-fade-up tap-scale flex w-full items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
                    style={{ animationDelay: `${(ativas.length + i) * 90}ms` }}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check size={13} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-foreground/80">{m.title}</p>
                      <p className="font-numeric text-xs text-emerald-500/80">{fmtBRL(Number(m.target_value))} · Concluída</p>
                    </div>
                    <ChevronRight size={13} className="shrink-0 text-muted-foreground/40" />
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
        Sem fundo sólido próprio: a página agora fica transparente sobre o
        AnimatedBackground global do _layout, e a Aurora local (reativa ao
        mouse) entra como camada extra de atmosfera por cima dele.
      */}
      <div className="mx-auto max-w-xl space-y-0 pb-28 md:pb-10">
        {isGuest ? <GuestView /> : <OwnerView />}
      </div>
    </>
  )
}