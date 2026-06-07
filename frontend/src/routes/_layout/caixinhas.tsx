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
const COLORS = ["#4ade80","#22d3ee","#a78bfa","#fbbf24","#f87171","#fb923c","#38bdf8","#f472b6","#34d399","#818cf8"]
const fmtBRL = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

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
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border bg-card max-h-[90svh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">{isEdit ? "Editar Caixinha" : "Nova Caixinha"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{MONTH_NAMES[month - 1]} {year}</p>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categoria</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valor Reservado (R$)</label>
            <Input placeholder="0,00" type="number" step="0.01" min="0"
              value={form.reserved_value} onChange={e => setForm(f => ({ ...f, reserved_value: e.target.value }))}
              className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observação (opcional)</label>
            <Input placeholder="Ex: reserva viagem..." value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="h-10 text-sm" />
          </div>
        </div>
        <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-10" disabled={!isValid || isPending} onClick={handleSubmit}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : isEdit ? "Salvar" : "Criar caixinha"}
          </Button>
        </div>
      </div>
    </>
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
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border bg-card max-h-[90svh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Copiar Caixinhas</h2>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Origem → Destino */}
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-border bg-muted/30 p-3 text-center">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">De</p>
              <p className="text-sm font-semibold">{MONTH_NAMES[fromMonth - 1]}</p>
              <p className="text-xs text-muted-foreground">{fromYear}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted-foreground shrink-0">
              <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="flex-1 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center mb-1">Para</p>
              <div className="flex items-center justify-between gap-1">
                <button onClick={() => navigateTo(-1)} disabled={!canNavigatePrev}
                  className={cn("rounded p-0.5 transition-colors", canNavigatePrev
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/20 cursor-not-allowed")}>
                  <ChevronLeft size={14} />
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold">{MONTH_NAMES[toMonth - 1]}</p>
                  <p className="text-xs text-muted-foreground">{toYear}</p>
                </div>
                <button onClick={() => navigateTo(1)} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Opção de valor */}
          {!result && (
            <div className="rounded-xl border border-border overflow-hidden">
              {[
                { value: true,  label: "Saldo real (recomendado)", desc: "Copia o disponível após gastos e parcelas" },
                { value: false, label: "Valor original reservado",  desc: "Copia o valor sem considerar o que foi gasto" },
              ].map(opt => (
                <button key={String(opt.value)} onClick={() => setUseAvailable(opt.value)}
                  className={cn("flex items-center gap-3 w-full px-4 py-3 text-left transition-colors border-b border-border last:border-0",
                    useAvailable === opt.value ? "bg-primary/5" : "hover:bg-muted/40")}>
                  <div className={cn("size-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                    useAvailable === opt.value ? "border-primary" : "border-muted-foreground/40")}>
                    {useAvailable === opt.value && <div className="size-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Preview */}
          {!result && toCreate.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {toCreate.length} caixinha{toCreate.length > 1 ? "s" : ""} serão criadas:
              </p>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {toCreate.map((item, i) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs truncate">{item.category_name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-medium text-emerald-400">{fmtBRL(item.valueToUse)}</span>
                      {useAvailable && item.valueToUse !== item.reserved_value && (
                        <span className="text-[10px] text-muted-foreground ml-1 line-through">{fmtBRL(item.reserved_value)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {toSkip.length > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
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
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={16} />
                <p className="text-sm font-semibold">Caixinhas copiadas!</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  { label: "Criadas", value: result.created, color: "text-emerald-400" },
                  { label: "Puladas", value: result.skipped, color: "text-muted-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-card border border-border py-2">
                    <p className={cn("text-lg font-bold", color)}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 px-5 pb-5 pt-3 border-t border-border">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button className="flex-1 h-10 gap-1.5" onClick={handleCopy}
              disabled={toCreate.length === 0 || createMut.isPending}>
              {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              Copiar {toCreate.length > 0 ? `(${toCreate.length})` : ""}
            </Button>
          )}
        </div>
      </div>
    </>
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
    <div className={cn("relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm",
      isOver ? "border-rose-500/30" : "border-border")}>
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ background: color }} />

      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            style={{ background: `${color}20`, color }}>
            {reserve.category_acronym}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{reserve.category_name}</p>
            {reserve.note && <p className="truncate text-[11px] text-muted-foreground">{reserve.note}</p>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reservado</p>
          <p className="text-lg font-semibold leading-tight">{fmtBRL(reserved)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponível</p>
          <p className={cn("text-base font-semibold leading-tight", isOver ? "text-rose-500" : "text-emerald-500")}>
            {fmtBRL(available)}
          </p>
        </div>
      </div>

      {/* Barra dupla gasto + parcelas */}
      <div className="space-y-1.5 mb-3">
        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
          <div className="h-full rounded-l-full transition-all"
            style={{ width: `${spentPct}%`, backgroundColor: isOver ? "#f87171" : color }} />
          {committedPct > 0 && (
            <div className="h-full transition-all" style={{
              width: `${committedPct}%`,
              backgroundColor: isOver ? "#fca5a5" : `${color}70`,
              backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)`,
            }} />
          )}
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Gasto real</span>
            <span className="font-medium">{fmtBRL(spent)} ({spentPct.toFixed(0)}%)</span>
          </div>
          {committed > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Parcelas</span>
              <span className="font-medium text-amber-500">{fmtBRL(committed)}</span>
            </div>
          )}
        </div>
      </div>

      {isOver && <p className="text-[11px] font-medium text-rose-500">⚠ Reserva insuficiente</p>}
    </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Caixinhas</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando..." : `${reserves.length} caixinha${reserves.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          {reserves.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyModal(true)}>
              <Copy size={14} />
              <span className="hidden sm:inline">Copiar para...</span>
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => { setEditing(undefined); setModal(true) }}>
            <Plus size={14} /> Nova
          </Button>
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
        <button onClick={() => navigateMonth(-1)} className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold">{MONTH_NAMES[month - 1]} {year}</p>
        <button onClick={() => navigateMonth(1)} className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* KPIs 2x2 com parcelas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "Reservado",  value: fmtBRL(summary?.total_reserved  ?? 0), accent: "#a78bfa" },
          { label: "Gasto",      value: fmtBRL(summary?.total_spent     ?? 0), accent: "#f87171" },
          { label: "Parcelas",   value: fmtBRL(summary?.total_committed ?? 0), accent: "#fbbf24" },
          { label: "Disponível", value: fmtBRL(summary?.total_available ?? 0), accent: freeIsNeg ? "#f87171" : "#4ade80" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-sm font-bold sm:text-base" style={{ color: accent }}>{value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3].map(i => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : reserves.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <PackageOpen size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhuma caixinha em {MONTH_NAMES[month - 1]}</p>
          <p className="mt-1 text-xs text-muted-foreground">Clique em "Nova" para separar o seu dinheiro por categoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {reserves.map((r, i) => (
              <ReserveCard key={r.id} reserve={r} color={COLORS[i % COLORS.length]}
                onEdit={() => { setEditing(r); setModal(true) }}
                onDelete={() => { if (confirm(`Remover caixinha "${r.category_name}"?`)) deleteMut.mutate(r.id) }}
              />
            ))}
          </div>

          {pieData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Distribuição</p>
              <div className="flex items-center gap-4">
                <div className="h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={48} strokeWidth={0}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtBRL(Number(v ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  {reserves.map((r, i) => {
                    const total = summary?.total_reserved ?? 0
                    return (
                      <div key={r.id} className="flex items-center gap-2">
                        <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-muted-foreground truncate flex-1">{r.category_name}</span>
                        <span className="text-xs font-medium shrink-0">
                          {total > 0 ? Math.round((r.reserved_value / total) * 100) : 0}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
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