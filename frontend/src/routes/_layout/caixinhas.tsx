// frontend/src/routes/_layout/caixinhas.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Plus, X, Loader2, PackageOpen, Pencil, Trash2, ChevronLeft, ChevronRight, Copy, CheckCircle2, AlertCircle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, BASE } from "@/lib/api"
import { useTransactionCategories } from "@/hooks/api/useCategorias"
import { CineCard } from "@/components/Common/CineCard"
import { CountUp } from "@/components/Common/CountUp"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/caixinhas")({
  component: CaixinhasPage,
  head: () => ({ meta: [{ title: "Caixinhas — FinanceOS" }] }),
})

interface ReserveEnriched {
  id: number; user_id: number; category_id: number
  category_name: string; category_acronym: string
  month: number; year: number
  reserved_value: number; spent_value: number; committed_value: number
  available_value: number; spent_percentage: number; committed_percentage: number
  note?: string
}
interface ReserveSummary {
  total_reserved: number; total_spent: number; total_committed: number
  total_available: number; free_balance: number; reserves: ReserveEnriched[]
}
interface ReserveCreate {
  category_id: number; month: number; year: number
  reserved_value: number; note?: string
}
interface ReserveUpdate { reserved_value?: number; note?: string }
interface CopyResult { created: number; skipped: number }

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
]
const COLORS = ["#34d399","#22d3ee","#a78bfa","#fbbf24","#fb7185","#fb923c","#38bdf8","#f472b6","#4ade80","#818cf8"]
const fmtBRL = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const reserveKeys = {
  all:     ["category_reserves"] as const,
  summary: (m: number, y: number) => ["category_reserves", "summary", m, y] as const,
}

function useSummary(month: number, year: number) {
  return useQuery<ReserveSummary>({
    queryKey: reserveKeys.summary(month, year),
    queryFn: () => api.get(`${BASE}/category_reserve/summary?month=${month}&year=${year}`).then(r => r.data),
  })
}
function useCreateReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ReserveCreate) => api.post(`${BASE}/category_reserve/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reserveKeys.all }),
  })
}
function useUpdateReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReserveUpdate }) =>
      api.patch(`${BASE}/category_reserve/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reserveKeys.all }),
  })
}
function useDeleteReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`${BASE}/category_reserve/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reserveKeys.all }),
  })
}
function useCopyReserves() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { from_month: number; from_year: number; to_month: number; to_year: number }) =>
      api.post(`${BASE}/category_reserve/copy`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reserveKeys.all }),
  })
}

// ── Bottom sheet em vidro (padrão da página) ──────────────────────────────────

function GlassSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-card animate-fade-up fixed inset-x-0 bottom-0 z-[61] flex max-h-[90svh] flex-col rounded-t-2xl border-t">
        <div className="divider-glow shrink-0" />
        {children}
      </div>
    </>
  )
}

// ── Modal criar / editar ──────────────────────────────────────────────────────

function ReserveModal({ editing, month, year, onClose }: {
  editing?: ReserveEnriched; month: number; year: number; onClose: () => void
}) {
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreateReserve()
  const updateMut = useUpdateReserve()
  const [form, setForm] = useState({
    category_id:    editing ? String(editing.category_id) : "",
    reserved_value: editing ? String(editing.reserved_value) : "",
    note:           editing?.note ?? "",
  })
  const isEdit    = !!editing
  const isValid   = form.category_id !== "" && form.reserved_value.trim() !== ""
  const isPending = createMut.isPending || updateMut.isPending

  const handleSubmit = () => {
    if (!isValid || isPending) return
    const value = Number(form.reserved_value.replace(",", "."))
    if (isEdit) {
      updateMut.mutate(
        { id: editing.id, data: { reserved_value: value, note: form.note || undefined } },
        { onSuccess: onClose },
      )
    } else {
      createMut.mutate(
        { category_id: Number(form.category_id), month, year, reserved_value: value, note: form.note || undefined },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <GlassSheet onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
        <div>
          <h2 className="font-display text-sm font-semibold">{isEdit ? "Editar Caixinha" : "Nova Caixinha"}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {!isEdit && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categoria</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecione...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valor Reservado (R$)</label>
          <Input placeholder="0,00" type="number" step="0.01" min="0"
            value={form.reserved_value} onChange={e => setForm(f => ({ ...f, reserved_value: e.target.value }))}
            className="font-numeric h-10 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observação (opcional)</label>
          <Input placeholder="Ex: reserva viagem..." value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="h-10 text-sm" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border/50 px-5 pb-5 pt-3">
        <Button variant="outline" className="h-10 flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="glow-primary h-10 flex-1" disabled={!isValid || isPending} onClick={handleSubmit}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : isEdit ? "Salvar" : "Criar caixinha"}
        </Button>
      </div>
    </GlassSheet>
  )
}

// ── Modal copiar caixinhas ────────────────────────────────────────────────────

function CopiarCaixinhasModal({ fromMonth, fromYear, reserves, onClose }: {
  fromMonth: number; fromYear: number; reserves: ReserveEnriched[]; onClose: () => void
}) {
  const createMut = useCreateReserve()
  const qc = useQueryClient()

  const defaultToMonth = fromMonth === 12 ? 1  : fromMonth + 1
  const defaultToYear  = fromMonth === 12 ? fromYear + 1 : fromYear

  const [toMonth,       setToMonth]       = useState(defaultToMonth)
  const [toYear,        setToYear]        = useState(defaultToYear)
  const [useAvailable,  setUseAvailable]  = useState(true)
  const [result,        setResult]        = useState<CopyResult | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  const { data: destSummary } = useSummary(toMonth, toYear)
  const destCatIds = new Set((destSummary?.reserves ?? []).map(r => r.category_id))

  const navigateTo = (dir: -1 | 1) => {
    let m = toMonth + dir; let y = toYear
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    if (y < fromYear || (y === fromYear && m <= fromMonth)) return
    setToMonth(m); setToYear(y)
    setResult(null); setError(null)
  }
  const canNavigatePrev = !(toMonth === defaultToMonth && toYear === defaultToYear)

  const preview = reserves.map(r => ({
    ...r,
    valueToUse: useAvailable ? Math.max(0, r.available_value) : r.reserved_value,
    willSkip:   destCatIds.has(r.category_id),
  }))
  const toCreate = preview.filter(p => !p.willSkip && p.valueToUse > 0)
  const toSkip   = preview.filter(p => p.willSkip || p.valueToUse === 0)

  const handleCopy = async () => {
    setError(null)
    let created = 0
    const errors: string[] = []
    for (const item of toCreate) {
      try {
        await createMut.mutateAsync({
          category_id: item.category_id, month: toMonth, year: toYear,
          reserved_value: item.valueToUse, note: item.note,
        })
        created++
      } catch (e: any) {
        errors.push(e?.response?.data?.detail ?? `Erro em ${item.category_name}`)
      }
    }
    qc.invalidateQueries({ queryKey: reserveKeys.all })
    if (errors.length > 0) setError(errors.join(" · "))
    else setResult({ created, skipped: toSkip.length })
  }

  return (
    <GlassSheet onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
        <h2 className="font-display text-sm font-semibold">Copiar Caixinhas</h2>
        <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {/* Origem → Destino */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">De</p>
            <p className="font-display text-sm font-semibold">{MONTH_NAMES[fromMonth - 1]}</p>
            <p className="text-xs text-muted-foreground">{fromYear}</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-primary">
            <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1 rounded-xl border border-primary/40 bg-primary/5 p-3 glow-primary">
            <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Para</p>
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => navigateTo(-1)} disabled={!canNavigatePrev}
                className={cn("rounded p-0.5 transition-colors", canNavigatePrev
                  ? "text-muted-foreground hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/20")}>
                <ChevronLeft size={14} />
              </button>
              <div className="text-center">
                <p className="font-display text-sm font-semibold">{MONTH_NAMES[toMonth - 1]}</p>
                <p className="text-xs text-muted-foreground">{toYear}</p>
              </div>
              <button onClick={() => navigateTo(1)} className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Opção de valor */}
        {!result && (
          <div className="overflow-hidden rounded-xl border border-border">
            {[
              { value: true,  label: "Saldo real (recomendado)", desc: "Copia o disponível após gastos e parcelas" },
              { value: false, label: "Valor original reservado",  desc: "Copia o valor sem considerar o que foi gasto" },
            ].map(opt => (
              <button key={String(opt.value)} onClick={() => setUseAvailable(opt.value)}
                className={cn("flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0",
                  useAvailable === opt.value ? "bg-primary/5" : "hover:bg-muted/40")}>
                <div className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  useAvailable === opt.value ? "border-primary" : "border-muted-foreground/40")}>
                  {useAvailable === opt.value && <div className="size-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        {!result && toCreate.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {toCreate.length} caixinha{toCreate.length > 1 ? "s" : ""} serão criadas:
            </p>
            <div className="max-h-44 space-y-1.5 overflow-y-auto">
              {toCreate.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="size-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 5px ${COLORS[i % COLORS.length]}` }} />
                    <span className="truncate text-xs">{item.category_name}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-numeric text-xs font-medium text-emerald-400">{fmtBRL(item.valueToUse)}</span>
                    {useAvailable && item.valueToUse !== item.reserved_value && (
                      <span className="font-numeric ml-1 text-[10px] text-muted-foreground line-through">{fmtBRL(item.reserved_value)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {toSkip.length > 0 && (
              <p className="border-t border-border pt-1 text-[11px] text-muted-foreground">
                {toSkip.length} pulada{toSkip.length > 1 ? "s" : ""} (já existem no destino ou saldo zero)
              </p>
            )}
          </div>
        )}

        {!result && toCreate.length === 0 && reserves.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Todas as caixinhas já existem em {MONTH_NAMES[toMonth - 1]} ou têm saldo zero.
            </p>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="animate-scale-in space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={16} />
              <p className="text-sm font-semibold">Caixinhas copiadas!</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { label: "Criadas", value: result.created, color: "text-emerald-400" },
                { label: "Puladas", value: result.skipped, color: "text-muted-foreground" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-border bg-card py-2">
                  <p className={cn("font-numeric text-lg font-bold", color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
            <p className="text-xs text-rose-400">{error}</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border/50 px-5 pb-5 pt-3">
        <Button variant="outline" className="h-10 flex-1" onClick={onClose}>
          {result ? "Fechar" : "Cancelar"}
        </Button>
        {!result && (
          <Button className="glow-primary h-10 flex-1 gap-1.5" onClick={handleCopy}
            disabled={toCreate.length === 0 || createMut.isPending}>
            {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            Copiar {toCreate.length > 0 ? `(${toCreate.length})` : ""}
          </Button>
        )}
      </div>
    </GlassSheet>
  )
}

// ── Card de Caixinha ──────────────────────────────────────────────────────────

function ReserveCard({ reserve, color, onEdit, onDelete }: {
  reserve: ReserveEnriched; color: string; onEdit: () => void; onDelete: () => void
}) {
  const reserved     = reserve.reserved_value
  const spent        = reserve.spent_value
  const committed    = reserve.committed_value
  const available    = reserve.available_value
  const isOver       = spent + committed > reserved
  const spentPct     = Math.min(reserve.spent_percentage, 100)
  const committedPct = Math.min(reserve.committed_percentage, Math.max(0, 100 - spentPct))

  return (
    <CineCard
      accent={isOver ? "#fb7185" : color}
      className={cn("p-4", isOver && "border-rose-500/30")}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            style={{ background: `${color}20`, color, boxShadow: `0 0 12px -4px ${color}` }}>
            {reserve.category_acronym}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{reserve.category_name}</p>
            {reserve.note && <p className="truncate text-[11px] text-muted-foreground">{reserve.note}</p>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reservado</p>
          <p className="font-numeric text-lg font-semibold leading-tight">{fmtBRL(reserved)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponível</p>
          <p className={cn("font-numeric text-base font-semibold leading-tight", isOver ? "text-rose-500" : "text-emerald-500")}>
            {fmtBRL(available)}
          </p>
        </div>
      </div>

      {/* Barra dupla gasto + parcelas */}
      <div className="mb-3 space-y-1.5">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-l-full transition-all duration-700"
            style={{
              width: `${spentPct}%`,
              background: isOver ? "#fb7185" : `linear-gradient(90deg, ${color}90, ${color})`,
              boxShadow: `0 0 8px ${isOver ? "#fb7185" : color}`,
            }} />
          {committedPct > 0 && (
            <div className="h-full transition-all duration-700" style={{
              width: `${committedPct}%`,
              backgroundColor: isOver ? "#fda4af" : `${color}70`,
              backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)`,
            }} />
          )}
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Gasto real</span>
            <span className="font-numeric font-medium">{fmtBRL(spent)} ({spentPct.toFixed(0)}%)</span>
          </div>
          {committed > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Parcelas</span>
              <span className="font-numeric font-medium text-amber-500">{fmtBRL(committed)}</span>
            </div>
          )}
        </div>
      </div>

      {isOver && <p className="text-[11px] font-medium text-rose-500">⚠ Reserva insuficiente</p>}
    </CineCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CaixinhasPage() {
  const now = new Date()
  const [month,     setMonth]     = useState(now.getMonth() + 1)
  const [year,      setYear]      = useState(now.getFullYear())
  const [modal,     setModal]     = useState(false)
  const [copyModal, setCopyModal] = useState(false)
  const [editing,   setEditing]   = useState<ReserveEnriched | undefined>()
  const deleteMut = useDeleteReserve()

  const { data: summary, isLoading } = useSummary(month, year)
  const reserves  = summary?.reserves ?? []
  const pieData   = reserves.map(r => ({ name: r.category_name, value: r.reserved_value }))
  const freeIsNeg = (summary?.free_balance ?? 0) < 0

  const navigateMonth = (dir: -1 | 1) => {
    let m = month + dir; let y = year
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    setMonth(m); setYear(y)
  }

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Envelopes do mês"
        title="Caixinhas"
        subtitle={isLoading ? "Carregando..." : `${reserves.length} caixinha${reserves.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex gap-2">
            {reserves.length > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyModal(true)}>
                <Copy size={14} />
                <span className="hidden sm:inline">Copiar para...</span>
              </Button>
            )}
            <Button size="sm" className="glow-primary gap-1.5" onClick={() => { setEditing(undefined); setModal(true) }}>
              <Plus size={14} /> Nova
            </Button>
          </div>
        }
      />

      {/* ── Navegação de mês ────────────────────────────────────────────────── */}
      <div className="glass-card animate-fade-up delay-1 flex items-center justify-between rounded-xl px-4 py-2.5 opacity-0">
        <button onClick={() => navigateMonth(-1)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronLeft size={16} />
        </button>
        <p className="font-display text-sm font-semibold">{MONTH_NAMES[month - 1]} {year}</p>
        <button onClick={() => navigateMonth(1)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── KPIs com parcelas ───────────────────────────────────────────────── */}
      <div className="stagger-children grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "Reservado",  value: summary?.total_reserved  ?? 0, accent: "#a78bfa" },
          { label: "Gasto",      value: summary?.total_spent     ?? 0, accent: "#fb7185" },
          { label: "Parcelas",   value: summary?.total_committed ?? 0, accent: "#fbbf24" },
          { label: "Disponível", value: summary?.total_available ?? 0, accent: freeIsNeg ? "#fb7185" : "#34d399" },
        ].map(({ label, value, accent }) => (
          <CineCard key={label} accent={accent} className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="font-numeric mt-1 text-sm font-bold sm:text-base" style={{ color: accent }}>
              {isLoading ? "—" : <CountUp value={Number(value)} format={fmtBRL} />}
            </p>
          </CineCard>
        ))}
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3].map(i => <div key={i} className="skeleton h-44 rounded-xl" />)}
        </div>
      ) : reserves.length === 0 ? (
        <div className="glass-card animate-fade-up rounded-xl border border-dashed border-border py-20 text-center">
          <PackageOpen size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhuma caixinha em {MONTH_NAMES[month - 1]}</p>
          <p className="mt-1 text-xs text-muted-foreground">Clique em "Nova" para separar o seu dinheiro por categoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="stagger-children grid gap-3 sm:grid-cols-2">
            {reserves.map((r, i) => (
              <ReserveCard key={r.id} reserve={r} color={COLORS[i % COLORS.length]}
                onEdit={() => { setEditing(r); setModal(true) }}
                onDelete={() => { if (confirm(`Remover caixinha "${r.category_name}"?`)) deleteMut.mutate(r.id) }}
              />
            ))}
          </div>

          {pieData.length > 0 && (
            <CineCard accent="#a78bfa" className="animate-fade-up p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Distribuição</p>
              <div className="flex items-center gap-4">
                <div className="h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48} strokeWidth={0}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => fmtBRL(Number(v ?? 0))}
                        contentStyle={{
                          background: "var(--popover)", border: "1px solid var(--border)",
                          borderRadius: 12, fontSize: 12, color: "var(--popover-foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {reserves.map((r, i) => {
                    const total = summary?.total_reserved ?? 0
                    return (
                      <div key={r.id} className="flex items-center gap-2">
                        <div className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 5px ${COLORS[i % COLORS.length]}` }} />
                        <span className="flex-1 truncate text-xs text-muted-foreground">{r.category_name}</span>
                        <span className="font-numeric shrink-0 text-xs font-medium">
                          {total > 0 ? Math.round((r.reserved_value / total) * 100) : 0}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CineCard>
          )}
        </div>
      )}

      {modal && (
        <ReserveModal editing={editing} month={month} year={year}
          onClose={() => { setModal(false); setEditing(undefined) }} />
      )}
      {copyModal && (
        <CopiarCaixinhasModal fromMonth={month} fromYear={year} reserves={reserves}
          onClose={() => setCopyModal(false)} />
      )}
    </div>
  )
}