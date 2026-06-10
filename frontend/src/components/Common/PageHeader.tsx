import { cn } from "@/lib/utils"

/**
 * PageHeader — cabeçalho cinematográfico padrão das páginas.
 *
 * Uso:
 *   <PageHeader
 *     eyebrow="Visão geral"
 *     title="Olá, Eduardo"
 *     subtitle="Resumo financeiro de junho de 2026"
 *     action={<Button>Nova transação</Button>}
 *   />
 *
 * - `eyebrow`: rótulo pequeno em caps acima do título (contexto da seção)
 * - `gradient`: aplica o gradiente animado no título (default: true)
 */
type PageHeaderProps = {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  gradient?: boolean
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  gradient = true,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "animate-fade-up flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="status-dot inline-block size-1.5 rounded-full bg-primary" />
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "font-display text-2xl font-bold tracking-tight sm:text-3xl",
            gradient && "text-gradient",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export default PageHeader