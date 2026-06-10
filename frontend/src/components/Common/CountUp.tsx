import { useEffect, useRef, useState } from "react"

/**
 * CountUp — anima um número até o valor final (efeito "ticker" financeiro).
 *
 * Uso:
 *   <CountUp value={patrimonio} format={fmtBRL} />
 *   <CountUp value={score} format={(v) => v.toFixed(0)} duration={800} />
 *
 * - Re-anima quando `value` muda (do valor anterior para o novo)
 * - Easing easeOutExpo (acelera no início, assenta suave no final)
 * - Respeita prefers-reduced-motion (mostra o valor direto)
 */
type CountUpProps = {
  value: number
  format?: (v: number) => string
  duration?: number
  className?: string
}

const easeOutExpo = (t: number) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t)

export function CountUp({
  value,
  format = (v) => v.toLocaleString("pt-BR"),
  duration = 1100,
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      fromRef.current = value
      setDisplay(value)
      return
    }

    const from = fromRef.current
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = easeOutExpo(t)
      setDisplay(from + (value - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = value
    }
  }, [value, duration])

  return (
    <span className={["font-numeric", className].filter(Boolean).join(" ")}>
      {format(display)}
    </span>
  )
}

export default CountUp