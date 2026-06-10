import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * CineCard — card de vidro com spotlight que segue o mouse.
 *
 * Substitui o padrão `rounded-xl border border-border bg-card` das páginas.
 *
 * Uso:
 *   <CineCard>...</CineCard>
 *   <CineCard accent="#22d3ee" className="p-4">...</CineCard>
 *   <CineCard interactive={false}>conteúdo estático, sem spotlight</CineCard>
 *
 * - `accent`: cor do spotlight/borda no hover (default: verde primário)
 * - `interactive`: desliga o efeito de mouse (útil em listas longas / mobile)
 * - No touch (mobile) o spotlight simplesmente não dispara — sem custo
 */
type CineCardProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: string
  interactive?: boolean
}

export function CineCard({
  accent = "var(--finance-green)",
  interactive = true,
  className,
  children,
  ...props
}: CineCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`)
    el.style.setProperty("--my", `${e.clientY - rect.top}px`)
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={interactive ? handleMouseMove : undefined}
      className={cn(
        "group/cine relative overflow-hidden rounded-xl glass-card",
        "transition-all duration-300",
        interactive &&
          "hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]",
        className,
      )}
      style={
        {
          "--cine-accent": accent,
        } as React.CSSProperties
      }
      {...props}
    >
      {/* Spotlight que segue o mouse */}
      {interactive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/cine:opacity-100"
          style={{
            background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--cine-accent) 9%, transparent), transparent 65%)`,
          }}
        />
      )}

      {/* Borda superior iluminada no hover */}
      {interactive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover/cine:opacity-100"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--cine-accent) 60%, transparent), transparent)`,
          }}
        />
      )}

      <div className="relative">{children}</div>
    </div>
  )
}

export default CineCard