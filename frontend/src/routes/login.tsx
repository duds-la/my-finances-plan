import { zodResolver } from "@hookform/resolvers/zod"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useEffect, useRef, useState } from "react"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
}) satisfies z.ZodType<AccessToken>

type FormData = z.infer<typeof formSchema>

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "FinanceOS — Entrar" }],
  }),
})

// ─── Animated canvas background ──────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Symbols that drift across the background
    const symbols = ["$", "€", "₿", "¥", "£", "%", "↑", "↓", "◆", "▲"]

    type Particle = {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      symbol: string
      rotation: number
      vr: number
    }

    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 14 + 8,
      opacity: Math.random() * 0.12 + 0.03,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.01,
    }))

    // Floating orbs / blobs
    type Orb = { x: number; y: number; r: number; vx: number; vy: number; hue: number }
    const orbs: Orb[] = Array.from({ length: 6 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 200 + 120,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      hue: Math.random() * 40 + 150, // teal-green range
    }))

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      bg.addColorStop(0, "#050d0f")
      bg.addColorStop(0.5, "#060e10")
      bg.addColorStop(1, "#040b0d")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Orbs
      for (const o of orbs) {
        o.x += o.vx
        o.y += o.vy
        if (o.x < -o.r) o.x = canvas.width + o.r
        if (o.x > canvas.width + o.r) o.x = -o.r
        if (o.y < -o.r) o.y = canvas.height + o.r
        if (o.y > canvas.height + o.r) o.y = -o.r

        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r)
        g.addColorStop(0, `hsla(${o.hue}, 80%, 45%, 0.07)`)
        g.addColorStop(1, `hsla(${o.hue}, 80%, 45%, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Grid lines (subtle)
      ctx.strokeStyle = "rgba(20, 200, 160, 0.025)"
      ctx.lineWidth = 1
      const step = 60
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.vr
        if (p.y < -30) { p.y = canvas.height + 30; p.x = Math.random() * canvas.width }
        if (p.x < -30) p.x = canvas.width + 30
        if (p.x > canvas.width + 30) p.x = -30

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = "#4eeacb"
        ctx.font = `${p.size}px 'Courier New', monospace`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(p.symbol, 0, 0)
        ctx.restore()
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  )
}

// ─── Animated number ticker (decoration) ─────────────────────────────────────
function TickerBar() {
  const items = [
    { label: "IBOV", value: "+1.23%", up: true },
    { label: "BTC", value: "+3.41%", up: true },
    { label: "USD/BRL", value: "R$5.72", up: false },
    { label: "SELIC", value: "10.50%", up: false },
    { label: "CDI", value: "10.40%", up: true },
    { label: "ETH", value: "+2.18%", up: true },
    { label: "OURO", value: "-0.32%", up: false },
  ]
  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-[#1a3535]" style={{ background: "rgba(4,14,16,0.8)" }}>
      <div
        className="inline-flex gap-10 px-6 py-1.5 text-xs font-mono"
        style={{
          animation: "ticker 28s linear infinite",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-[#5a7a7a]">{item.label}</span>
            <span className={item.up ? "text-emerald-400" : "text-rose-400"}>
              {item.up ? "▲" : "▼"} {item.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function Login() {
  const { loginMutation } = useAuth()
  const [focused, setFocused] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { username: "", password: "" },
  })

  const onSubmit = (data: FormData) => {
    if (loginMutation.isPending) return
    loginMutation.mutate(data)
  }

  return (
    <>
      {/* Global keyframes injected once */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(78,234,203,0.12), 0 0 60px rgba(78,234,203,0.04); }
          50%       { box-shadow: 0 0 30px rgba(78,234,203,0.22), 0 0 80px rgba(78,234,203,0.08); }
        }
        @keyframes borderSpin {
          to { --angle: 360deg; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes logoAppear {
          0%   { opacity: 0; letter-spacing: 0.3em; filter: blur(6px); }
          100% { opacity: 1; letter-spacing: 0.05em; filter: blur(0); }
        }
        @keyframes numberCount {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-glow {
          animation: glowPulse 4s ease-in-out infinite;
        }
        .form-appear {
          animation: fadeSlideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .logo-appear {
          animation: logoAppear 1s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .label-float {
          transition: all 0.2s ease;
        }
        .input-finance {
          background: rgba(10, 28, 30, 0.6) !important;
          border: 1px solid rgba(78, 234, 203, 0.15) !important;
          color: #d0f0ea !important;
          font-family: 'DM Sans', sans-serif !important;
          transition: all 0.25s ease !important;
          caret-color: #4eeacb;
        }
        .input-finance::placeholder {
          color: rgba(78, 180, 160, 0.3) !important;
        }
        .input-finance:focus {
          border-color: rgba(78, 234, 203, 0.5) !important;
          box-shadow: 0 0 0 2px rgba(78, 234, 203, 0.1),
                      inset 0 0 20px rgba(78, 234, 203, 0.03) !important;
          background: rgba(10, 35, 38, 0.8) !important;
          outline: none !important;
        }
        .btn-primary {
          background: linear-gradient(135deg, #0d9e85, #0bc4a0, #0d9e85) !important;
          background-size: 200% 100% !important;
          border: none !important;
          font-family: 'Space Mono', monospace !important;
          letter-spacing: 0.06em !important;
          font-size: 0.82rem !important;
          font-weight: 700 !important;
          color: #020d0c !important;
          transition: all 0.3s ease !important;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .btn-primary:hover::before {
          transform: translateX(100%);
        }
        .btn-primary:hover {
          background-position: right center !important;
          box-shadow: 0 0 24px rgba(11, 196, 160, 0.4) !important;
          transform: translateY(-1px) !important;
        }
        .stat-card {
          animation: numberCount 0.6s ease both;
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col"
        style={{ fontFamily: "'DM Sans', sans-serif", background: "#050d0f" }}
      >
        <ParticleCanvas />

        {/* Scanline overlay */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            zIndex: 1,
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          }}
        />

        {/* Ticker */}
        <div className="relative" style={{ zIndex: 10 }}>
          <TickerBar />
        </div>

        {/* Main content */}
        <div className="relative flex flex-1 items-center justify-center px-4 py-10" style={{ zIndex: 10 }}>
          <div className="w-full max-w-md">

            {/* Logo */}
            <div className="text-center mb-8 logo-appear">
              <div className="inline-flex items-center gap-2 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #0bc4a0, #0d7a65)",
                    boxShadow: "0 0 20px rgba(11,196,160,0.4)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17l5-5 4 4 9-9" stroke="#020d0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="20" cy="7" r="2" fill="#020d0c"/>
                  </svg>
                </div>
                <span
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    background: "linear-gradient(135deg, #4eeacb, #0bc4a0)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  FinanceOS
                </span>
              </div>
              <p className="text-xs font-mono tracking-widest" style={{ color: "#2a6656" }}>
                SISTEMA DE GESTÃO FINANCEIRA
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { label: "Patrimônio", value: "R$ ●●●", icon: "◈" },
                { label: "Metas ativas", value: "● / ●", icon: "◎" },
                { label: "Score", value: "●●●", icon: "◆" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="stat-card rounded-lg p-2.5 text-center"
                  style={{
                    animationDelay: `${i * 0.12}s`,
                    background: "rgba(10, 30, 32, 0.5)",
                    border: "1px solid rgba(78, 234, 203, 0.08)",
                  }}
                >
                  <div className="text-base mb-0.5" style={{ color: "#0bc4a0" }}>{s.icon}</div>
                  <div className="text-[10px] font-mono tracking-wider" style={{ color: "#2a6656" }}>{s.label}</div>
                  <div className="text-xs font-mono" style={{ color: "#1a4040" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Card */}
            <div
              className="card-glow rounded-2xl overflow-hidden form-appear"
              style={{
                background: "rgba(6, 18, 20, 0.75)",
                border: "1px solid rgba(78, 234, 203, 0.12)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              {/* Card header */}
              <div
                className="px-8 pt-7 pb-5"
                style={{ borderBottom: "1px solid rgba(78, 234, 203, 0.06)" }}
              >
                <h1
                  className="text-xl font-semibold mb-0.5"
                  style={{ color: "#c8ebe3", letterSpacing: "-0.01em" }}
                >
                  Bem-vindo de volta
                </h1>
                <p className="text-xs" style={{ color: "#2a6656" }}>
                  Acesse sua conta para continuar
                </p>
              </div>

              {/* Form */}
              <div className="px-8 py-6">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-5"
                  >
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            className="text-xs font-mono tracking-widest uppercase"
                            style={{ color: focused === "username" ? "#4eeacb" : "#2a6656", transition: "color 0.2s" }}
                          >
                            Username
                          </FormLabel>
                          <FormControl>
                            <Input
                              data-testid="email-input"
                              placeholder="username"
                              type="text"
                              className="input-finance h-11 rounded-lg text-sm"
                              onFocus={() => setFocused("username")}
                              onBlur={() => { setFocused(null); field.onBlur() }}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" style={{ color: "#f87171" }} />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel
                              className="text-xs font-mono tracking-widest uppercase"
                              style={{ color: focused === "password" ? "#4eeacb" : "#2a6656", transition: "color 0.2s" }}
                            >
                              Senha
                            </FormLabel>
                            <RouterLink
                              to="/recover-password"
                              className="text-xs hover:text-emerald-400 transition-colors"
                              style={{ color: "#1a5045", fontFamily: "'Space Mono', monospace" }}
                            >
                              Esqueceu?
                            </RouterLink>
                          </div>
                          <FormControl>
                            <PasswordInput
                              data-testid="password-input"
                              placeholder="••••••••"
                              className="input-finance h-11 rounded-lg text-sm"
                              onFocus={() => setFocused("password")}
                              onBlur={() => { setFocused(null); field.onBlur() }}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" style={{ color: "#f87171" }} />
                        </FormItem>
                      )}
                    />

                    <LoadingButton
                      type="submit"
                      loading={loginMutation.isPending}
                      className="btn-primary w-full h-11 rounded-lg mt-1"
                    >
                      {loginMutation.isPending ? "AUTENTICANDO..." : "ENTRAR"}
                    </LoadingButton>
                  </form>
                </Form>
              </div>

              {/* Card footer */}
              <div
                className="px-8 py-4 text-center"
                style={{ borderTop: "1px solid rgba(78, 234, 203, 0.06)" }}
              >
                <span className="text-xs" style={{ color: "#1e4040" }}>
                  Não tem conta?{" "}
                </span>
                <RouterLink
                  to="/signup"
                  className="text-xs font-semibold hover:text-emerald-300 transition-colors"
                  style={{ color: "#0bc4a0", fontFamily: "'Space Mono', monospace" }}
                >
                  Criar conta →
                </RouterLink>
              </div>
            </div>

            {/* Bottom label */}
            <p className="text-center mt-5 text-xs font-mono" style={{ color: "#0f2e2e", letterSpacing: "0.1em" }}>
              DADOS PROTEGIDOS · CRIPTOGRAFIA AES-256
            </p>
          </div>
        </div>
      </div>
    </>
  )
}