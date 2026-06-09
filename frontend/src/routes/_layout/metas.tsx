// frontend/src/routes/_layout/metas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useRef, useCallback } from "react"
import { Plus, X, Loader2, Check, Sparkles, TrendingUp, Calendar, Target, ChevronRight, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useGoals, useCreateGoal, useAddContribution, useGoalContributions,
  type FinancialGoal, type GoalContribution,
} from "@/hooks/api/useGoals"

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
  new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

// Orb color palettes — each has gradient stops + glow
const ORB_THEMES = [
  { id: "blue",   from: "#0ea5e9", to: "#6366f1", glow: "rgba(99,102,241,0.6)",  particle: "#a5b4fc" },
  { id: "purple", from: "#a855f7", to: "#ec4899", glow: "rgba(168,85,247,0.6)", particle: "#f0abfc" },
  { id: "emerald",from: "#10b981", to: "#06b6d4", glow: "rgba(16,185,129,0.6)", particle: "#6ee7b7" },
  { id: "amber",  from: "#f59e0b", to: "#ef4444", glow: "rgba(245,158,11,0.6)", particle: "#fcd34d" },
  { id: "rose",   from: "#f43f5e", to: "#fb923c", glow: "rgba(244,63,94,0.6)",  particle: "#fda4af" },
]

function getTheme(idx: number) { return ORB_THEMES[idx % ORB_THEMES.length] }

function getDaysLeft(deadline?: string) {
  if (!deadline) return null
  const d = new Date(deadline + "T00:00:00")
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000))
}

function getMonthsLeft(deadline?: string) {
  if (!deadline) return null
  const days = getDaysLeft(deadline)!
  return Math.round(days / 30)
}

// ── Aurora Background ─────────────────────────────────────────────────────────

function AuroraBackground({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base dark */}
      <div className="absolute inset-0 bg-[#050508]" />

      {/* Aurora layer 1 — mouse-reactive */}
      <div
        className="absolute inset-0 opacity-30 transition-transform duration-700 ease-out"
        style={{
          background: `radial-gradient(ellipse 80% 60% at ${40 + mouseX * 20}% ${30 + mouseY * 15}%, 
            rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)`,
        }}
      />

      {/* Aurora layer 2 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 60% 50% at ${70 - mouseX * 10}% ${60 + mouseY * 10}%, 
            rgba(6,182,212,0.5) 0%, rgba(16,185,129,0.2) 50%, transparent 70%)`,
          animation: "aurora2 12s ease-in-out infinite",
        }}
      />

      {/* Aurora layer 3 */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background: `radial-gradient(ellipse 90% 40% at 20% 80%, 
            rgba(244,63,94,0.3) 0%, rgba(251,146,60,0.15) 50%, transparent 70%)`,
          animation: "aurora3 18s ease-in-out infinite",
        }}
      />

      {/* Noise grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <style>{`
        @keyframes aurora2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.1); }
          66% { transform: translate(20px, -15px) scale(0.95); }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(40px, -30px); }
        }
        @keyframes float-orb {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(1deg); }
          66% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(-18px) rotate(-1.5deg); }
          70% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes particle-orbit {
          from { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes morphIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes celebration-burst {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ring-fill {
          from { stroke-dashoffset: var(--ring-full); }
          to { stroke-dashoffset: var(--ring-offset); }
        }
        .orb-float { animation: float-orb var(--float-duration, 6s) ease-in-out infinite; }
        .orb-float-2 { animation: float-orb-2 var(--float-duration, 8s) ease-in-out infinite; }
        .slide-up { animation: slide-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .morph-in { animation: morphIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  )
}

// ── Liquid Progress Ring ──────────────────────────────────────────────────────

function ProgressRing({
  pct, size = 120, stroke = 8, theme, animate = true
}: {
  pct: number; size?: number; stroke?: number;
  theme: typeof ORB_THEMES[0]; animate?: boolean
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const id = `grad-${theme.id}-${size}`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.from} />
          <stop offset="100%" stopColor={theme.to} />
        </linearGradient>
        <filter id={`glow-${theme.id}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        filter={`url(#glow-${theme.id})`}
        style={animate ? {
          transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        } : undefined}
      />
      {/* Pulse dot at end of arc */}
      {pct > 2 && pct < 100 && (
        <circle
          cx={size / 2 + r * Math.cos(2 * Math.PI * (pct / 100) - Math.PI / 2)}
          cy={size / 2 + r * Math.sin(2 * Math.PI * (pct / 100) - Math.PI / 2)}
          r={stroke / 2 + 1}
          fill={theme.to}
          style={{ filter: `drop-shadow(0 0 4px ${theme.glow})` }}
        />
      )}
    </svg>
  )
}

// ── Orb Particles ─────────────────────────────────────────────────────────────

function OrbParticles({ theme, size = 160 }: { theme: typeof ORB_THEMES[0]; size?: number }) {
  const particles = [
    { orbit: size * 0.38, duration: "4s", delay: "0s", dotSize: 3 },
    { orbit: size * 0.44, duration: "7s", delay: "-2s", dotSize: 2 },
    { orbit: size * 0.3, duration: "5.5s", delay: "-1s", dotSize: 2 },
  ]
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map((p, i) => (
        <div key={i}
          className="absolute"
          style={{
            width: p.dotSize * 2, height: p.dotSize * 2,
            "--orbit-r": `${p.orbit}px`,
            animation: `particle-orbit ${p.duration} linear ${p.delay} infinite`,
          } as React.CSSProperties}>
          <div
            style={{
              width: p.dotSize * 2, height: p.dotSize * 2,
              borderRadius: "50%",
              background: theme.particle,
              boxShadow: `0 0 6px ${theme.particle}`,
            }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Goal Orb Card ─────────────────────────────────────────────────────────────

function GoalOrb({
  meta, themeIdx, onSelect, delay = 0
}: {
  meta: FinancialGoal; themeIdx: number; onSelect: (m: FinancialGoal) => void; delay?: number
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
            background: `linear-gradient(135deg, rgba(10,10,20,0.95), rgba(15,15,30,0.98))`,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Top: Title + status */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium tracking-widest uppercase mb-1"
                style={{ color: theme.from }}>
                {isComplete ? "✦ Conquistada" : "Em andamento"}
              </p>
              <h3 className="text-base font-semibold text-white leading-tight truncate pr-2">
                {meta.title}
              </h3>
            </div>
            <div
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: `${theme.from}20` }}
            >
              <ChevronRight size={14} style={{ color: theme.from }} />
            </div>
          </div>

          {/* Center: Ring + percentage */}
          <div className="flex items-center gap-5">
            <div
              className="relative shrink-0"
              style={{
                "--float-duration": `${5 + themeIdx}s`,
              } as React.CSSProperties}
            >
              {/* Orb glow pulse */}
              {isComplete && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
                    animation: "pulse-ring 2s ease-out infinite",
                    transform: "scale(1.3)",
                  }}
                />
              )}
              <ProgressRing pct={pct} size={80} stroke={6} theme={theme} />
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{pct}<span className="text-xs">%</span></span>
              </div>
            </div>

            {/* Values */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Acumulado</p>
                <p className="text-sm font-bold text-white">{fmtBRL(Number(meta.current_value))}</p>
              </div>
              <div className="h-px" style={{ background: `linear-gradient(90deg, ${theme.from}30, transparent)` }} />
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Objetivo</p>
                <p className="text-sm font-medium text-white/70">{fmtBRL(Number(meta.target_value))}</p>
              </div>
            </div>
          </div>

          {/* Liquid progress bar */}
          <div className="space-y-1.5">
            <div className="h-1 rounded-full bg-white/5 overflow-hidden relative">
              <div
                className="h-full rounded-full relative overflow-hidden transition-all duration-1000"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
                  boxShadow: `0 0 8px ${theme.glow}`,
                }}
              >
                {/* Shimmer */}
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

// ── Goal Detail Panel (morphing full view) ────────────────────────────────────

function GoalDetailPanel({
  meta, themeIdx, onClose
}: {
  meta: FinancialGoal; themeIdx: number; onClose: () => void
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
    faltam > 0 ? Math.round(faltam / 12) : null,
  ].filter((v): v is number => v !== null && v > 0)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 3)

  const sorted = [...contributions].sort(
    (a, b) => new Date(b.contribution_date).getTime() - new Date(a.contribution_date).getTime()
  )

  const handleAport = () => {
    const val = Number(aportValue.replace(",", "."))
    if (!val || val <= 0) return
    addMut.mutate({ goal_id: meta.id, value: val }, {
      onSuccess: () => {
        setAportSent(true)
        setAportValue("")
        setTimeout(() => setAportSent(false), 2000)
      },
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[61] pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden morph-in"
          style={{
            background: "linear-gradient(160deg, rgba(12,12,24,0.98), rgba(8,8,18,0.99))",
            border: `1px solid ${theme.from}30`,
            boxShadow: `0 0 80px ${theme.glow}, 0 40px 80px rgba(0,0,0,0.8)`,
            maxHeight: "92svh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full" style={{ background: `${theme.from}40` }} />
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] tracking-widest uppercase mb-1.5" style={{ color: theme.from }}>
                    Meta Financeira
                  </p>
                  <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <X size={16} className="text-white/60" />
                </button>
              </div>

              {/* Big ring + stats */}
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  {/* Celebration pulse for complete goals */}
                  {isComplete && (
                    <div className="absolute inset-0 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
                        animation: "pulse-ring 1.5s ease-out infinite",
                        transform: "scale(1.4)",
                      }} />
                  )}
                  <ProgressRing pct={pct} size={120} stroke={10} theme={theme} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">{pct}</span>
                    <span className="text-xs text-white/40">%</span>
                  </div>
                  <OrbParticles theme={theme} size={120} />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl p-3" style={{ background: `${theme.from}10` }}>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Acumulado</p>
                    <p className="text-xl font-bold text-white">{fmtBRLFull(Number(meta.current_value))}</p>
                  </div>
                  <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Faltam</p>
                    <p className="text-lg font-semibold" style={{ color: theme.to }}>
                      {fmtBRLFull(faltam)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Meta info chips */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3 space-y-1" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-1.5">
                    <Target size={11} style={{ color: theme.from }} />
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Objetivo Total</p>
                  </div>
                  <p className="text-sm font-bold text-white">{fmtBRLFull(Number(meta.target_value))}</p>
                </div>
                {daysLeft !== null ? (
                  <div className="rounded-2xl p-3 space-y-1" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} style={{ color: theme.to }} />
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Prazo</p>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {daysLeft === 0 ? "Hoje" : `${daysLeft} dias`}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-3 space-y-1" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={11} style={{ color: theme.to }} />
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Status</p>
                    </div>
                    <p className="text-sm font-bold text-white">Sem prazo</p>
                  </div>
                )}
              </div>

              {/* AI insight */}
              {meta.suggested_contribution && faltam > 0 && (
                <div
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{
                    background: `linear-gradient(135deg, ${theme.from}12, ${theme.to}08)`,
                    border: `1px solid ${theme.from}20`,
                  }}
                >
                  <Sparkles size={16} style={{ color: theme.from, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-xs font-semibold text-white/80 mb-1">Sugestão inteligente</p>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      Aportando{" "}
                      <span className="font-bold" style={{ color: theme.from }}>
                        {fmtBRL(Number(meta.suggested_contribution))}/mês
                      </span>
                      {daysLeft !== null && daysLeft > 0
                        ? ` você alcança o objetivo em ${Math.ceil(daysLeft / 30)} meses.`
                        : " você acelera significativamente o progresso."}
                    </p>
                  </div>
                </div>
              )}

              {/* Aporte section */}
              {!isComplete && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    Registrar Aporte
                  </p>

                  {/* Quick values */}
                  {quickValues.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {quickValues.map((v) => (
                        <button
                          key={v}
                          onClick={() => setAportValue(String(v))}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                          style={{
                            background: aportValue === String(v) ? `${theme.from}30` : "rgba(255,255,255,0.06)",
                            border: `1px solid ${aportValue === String(v) ? theme.from + "60" : "rgba(255,255,255,0.1)"}`,
                            color: aportValue === String(v) ? theme.from : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {fmtBRL(v)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-medium">R$</span>
                      <input
                        type="number"
                        placeholder="0,00"
                        value={aportValue}
                        onChange={(e) => setAportValue(e.target.value)}
                        className="w-full rounded-2xl pl-9 pr-4 py-3 text-sm font-semibold text-white placeholder:text-white/20 outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid ${aportValue ? theme.from + "50" : "rgba(255,255,255,0.08)"}`,
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleAport()}
                      />
                    </div>
                    <button
                      onClick={handleAport}
                      disabled={!aportValue || addMut.isPending}
                      className="rounded-2xl px-5 flex items-center gap-2 text-sm font-semibold transition-all duration-200 disabled:opacity-40 hover:scale-105 active:scale-95"
                      style={{
                        background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                        color: "#fff",
                        boxShadow: aportValue ? `0 4px 20px ${theme.glow}` : "none",
                      }}
                    >
                      {addMut.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : aportSent ? (
                        <Check size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      {aportSent ? "Feito!" : "Aportar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Contribution history */}
              {sorted.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    Histórico
                  </p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {sorted.map((c: GoalContribution) => (
                      <div key={c.id}
                        className="flex items-center justify-between rounded-2xl px-4 py-2.5"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.from }} />
                          <span className="text-xs text-white/40">{fmtDate(c.contribution_date)}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: theme.from }}>
                          +{fmtBRLFull(Number(c.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed celebration */}
              {isComplete && (
                <div
                  className="rounded-2xl p-5 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${theme.from}15, ${theme.to}10)`,
                    border: `1px solid ${theme.from}30`,
                  }}
                >
                  <p className="text-2xl mb-2">🏆</p>
                  <p className="text-sm font-bold text-white">Meta Conquistada</p>
                  <p className="text-xs text-white/40 mt-1">Você alcançou {fmtBRL(Number(meta.target_value))} nesta meta.</p>
                </div>
              )}

              <div className="h-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Nova Meta Form (inline, morphing) ─────────────────────────────────────────

function NovaMetaInline({ onClose }: { onClose: () => void }) {
  const createMut = useCreateGoal()
  const [form, setForm] = useState({
    title: "", target_value: "", current_value: "",
    deadline: "", suggested_contribution: "",
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = () => {
    const target = parseFloat(form.target_value.replace(",", "."))
    if (!form.title.trim() || !target) return
    createMut.mutate(
      {
        title: form.title.trim(),
        target_value: target,
        current_value: form.current_value ? parseFloat(form.current_value.replace(",", ".")) : 0,
        deadline: form.deadline || undefined,
        suggested_contribution: form.suggested_contribution
          ? parseFloat(form.suggested_contribution.replace(",", "."))
          : undefined,
      },
      { onSuccess: onClose }
    )
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "12px 16px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s",
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[61] pointer-events-none">
        <div
          className="pointer-events-auto w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl morph-in"
          style={{
            background: "linear-gradient(160deg, rgba(12,12,24,0.99), rgba(8,8,18,1))",
            border: "1px solid rgba(99,102,241,0.3)",
            boxShadow: "0 0 60px rgba(99,102,241,0.3), 0 40px 80px rgba(0,0,0,0.8)",
          }}
        >
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-white/10" />
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] tracking-widest uppercase text-indigo-400 mb-1">Nova Meta</p>
                <h2 className="text-xl font-bold text-white">Defina seu objetivo</h2>
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <X size={15} className="text-white/50" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 pl-1">Nome da meta</p>
                <input
                  style={inputStyle}
                  placeholder="Ex: Casa própria, Viagem, Carro..."
                  value={form.title}
                  onChange={set("title")}
                  onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 pl-1">Valor objetivo (R$)</p>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="0,00"
                    value={form.target_value}
                    onChange={set("target_value")}
                    onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 pl-1">Já tenho (R$)</p>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="0,00"
                    value={form.current_value}
                    onChange={set("current_value")}
                    onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 pl-1">Prazo</p>
                  <input
                    style={{ ...inputStyle, colorScheme: "dark" }}
                    type="date"
                    value={form.deadline}
                    onChange={set("deadline")}
                    onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 pl-1">Aporte/mês (R$)</p>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="Sugestão"
                    value={form.suggested_contribution}
                    onChange={set("suggested_contribution")}
                    onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.target_value || createMut.isPending}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                boxShadow: form.title && form.target_value ? "0 8px 32px rgba(99,102,241,0.4)" : "none",
              }}
            >
              {createMut.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Criando...</>
                : <><Sparkles size={14} /> Criar Meta</>}
            </button>

            <div className="h-1" />
          </div>
        </div>
      </div>
    </>
  )
}

// ── Overall Progress Arc ──────────────────────────────────────────────────────

function GlobalProgressArc({
  pct, totalAtual, totalAlvo, ativasCount, concluidasCount
}: {
  pct: number; totalAtual: number; totalAlvo: number; ativasCount: number; concluidasCount: number
}) {
  const size = 200
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div
      className="slide-up rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(12,12,28,0.9), rgba(8,8,20,0.95))",
        border: "1px solid rgba(99,102,241,0.2)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Subtle glow */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)" }} />

      <div className="flex items-center gap-8">
        {/* Arc */}
        <div className="relative shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
              <linearGradient id="global-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <filter id="global-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Track */}
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            {/* Progress */}
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke="url(#global-grad)" strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
              filter="url(#global-glow)"
              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)" }}
            />
            {/* Inner text */}
            <text x={size/2} y={size/2 - 10} textAnchor="middle"
              fill="white" fontSize="36" fontWeight="800" fontFamily="system-ui">
              {pct}
            </text>
            <text x={size/2} y={size/2 + 12} textAnchor="middle"
              fill="rgba(255,255,255,0.4)" fontSize="12" fontFamily="system-ui">
              % concluído
            </text>
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Total acumulado</p>
            <p className="text-2xl font-black text-white leading-none">{fmtBRL(totalAtual)}</p>
          </div>
          <div className="h-px bg-white/5" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Objetivo total</p>
            <p className="text-lg font-bold text-white/60">{fmtBRL(totalAlvo)}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl px-3 py-1.5" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <p className="text-xs font-bold text-indigo-400">{ativasCount} ativas</p>
            </div>
            {concluidasCount > 0 && (
              <div className="rounded-xl px-3 py-1.5" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="text-xs font-bold text-emerald-400">{concluidasCount} conquistas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Loading State ─────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-[220px] rounded-3xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[240px] rounded-3xl animate-pulse"
            style={{ background: "rgba(255,255,255,0.03)", animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="slide-up flex flex-col items-center justify-center py-20 gap-6">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 40% 40%, rgba(99,102,241,0.2), rgba(168,85,247,0.1))",
          border: "1px solid rgba(99,102,241,0.2)",
          boxShadow: "0 0 40px rgba(99,102,241,0.15)",
        }}
      >
        <Target size={36} style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-white mb-2">Nenhuma meta definida</p>
        <p className="text-sm text-white/30 max-w-64">Defina objetivos financeiros e acompanhe seu progresso em tempo real.</p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
        }}
      >
        <Sparkles size={14} />
        Criar primeira meta
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MetasPage() {
  const { goals, ativas, concluidas, totalAlvo, totalAtual, progressoGeral, isLoading } = useGoals()
  const [newOpen, setNewOpen] = useState(false)
  const [selected, setSelected] = useState<FinancialGoal | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mouseX, setMouseX] = useState(0.5)
  const [mouseY, setMouseY] = useState(0.5)

  // Mouse tracking for aurora
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX / window.innerWidth)
    setMouseY(e.clientY / window.innerHeight)
  }, [])

  const handleSelect = (meta: FinancialGoal, idx: number) => {
    setSelected(meta)
    setSelectedIdx(idx)
  }

  return (
    <div
      className="relative min-h-screen"
      onMouseMove={handleMouseMove}
    >
      <AuroraBackground mouseX={mouseX} mouseY={mouseY} />

      {/* Content */}
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
            {/* Global Progress */}
            <GlobalProgressArc
              pct={progressoGeral}
              totalAtual={totalAtual}
              totalAlvo={totalAlvo}
              ativasCount={ativas.length}
              concluidasCount={concluidas.length}
            />

            {/* Goal Orbs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ativas.map((meta, i) => (
                <GoalOrb
                  key={meta.id}
                  meta={meta}
                  themeIdx={i}
                  onSelect={(m) => handleSelect(m, i)}
                  delay={i * 80}
                />
              ))}
            </div>

            {/* Completed goals */}
            {concluidas.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25 px-1">
                  ✦ Conquistas
                </p>
                <div className="space-y-2">
                  {concluidas.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m, ativas.length + i)}
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

      {/* Overlays */}
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