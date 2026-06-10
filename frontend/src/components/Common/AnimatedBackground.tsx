/**
 * AnimatedBackground — atmosfera cinematográfica global do FinanceOS.
 *
 * Camadas (de trás pra frente):
 *  1. Aurora: três orbes de luz (verde, ciano, violeta) com drift lento
 *  2. Grid sutil de linhas
 *  3. Noise (granulação de filme)
 *  4. Vinheta nas bordas
 *
 * Renderizada uma única vez no _layout, com position: fixed atrás de tudo.
 * Puramente decorativa (aria-hidden) e barata: só transform/opacity em CSS.
 */
export function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* ── Aurora ── */}
      <div
        className="absolute -top-[20%] -left-[10%] h-[70vh] w-[70vw] rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--aurora-1), transparent 70%)",
          animation: "auroraDrift1 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[30%] -right-[15%] h-[60vh] w-[55vw] rounded-full blur-[110px]"
        style={{
          background: "radial-gradient(circle, var(--aurora-2), transparent 70%)",
          animation: "auroraDrift2 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-[25%] left-[20%] h-[65vh] w-[60vw] rounded-full blur-[130px]"
        style={{
          background: "radial-gradient(circle, var(--aurora-3), transparent 70%)",
          animation: "auroraDrift3 38s ease-in-out infinite",
        }}
      />

      {/* ── Grid sutil ── */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in oklch, var(--foreground) 60%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in oklch, var(--foreground) 60%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
        }}
      />

      {/* ── Noise (granulação) ── */}
      <div
        className="absolute inset-0 opacity-[0.018] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Vinheta ── */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 120% 100% at 50% 40%, transparent 60%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  )
}

export default AnimatedBackground