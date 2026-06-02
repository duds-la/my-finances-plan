import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Plus, X, Loader2, Pencil, Trash2, PackageOpen, Banknote } from "lucide-react"
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReserveEnriched {
  id: number
  user_id: number
  category_id: number
  category_name: string
  category_acronym: string
  reserved_value: number
  spent_value: number
  available_value: number
  spent_percentage: number
  note: string | null
}

interface ReserveSummary {
  total_reserved: number
  total_spent: number
  total_available: number
  free_balance: number
  reserves: ReserveEnriched[]
}

interface ReserveCreate {
  category_id: number
  reserved_value: number
  note?: string
}

interface ReserveUpdate {
  reserved_value?: number
  note?: string
}

// ── Query keys ────────────────────────────────────────────────────────────────

const reserveKeys = {
  all: ["category_reserves"] as const,
  summary: (m: number, y: number) => ["category_reserves", "summary", m, y] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useSummary(month: number, year: number) {
  return useQuery<ReserveSummary>({
    queryKey: reserveKeys.summary(month, year),
    queryFn: () =>
      api
        .get(`${BASE}/category_reserve/summary?month=${month}&year=${year}`)
        .then((r) => r.data),
  })
}

function useCreateReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ReserveCreate) =>
      api.post(`${BASE}/category_reserve/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reserveKeys.all }),
  })
}

function useUpdateReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReserveUpdate }) =>
      api.patch(`${BASE}/category_reserve/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reserveKeys.all }),
  })
}

function useDeleteReserve() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`${BASE}/category_reserve/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reserveKeys.all }),
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

const COLORS = [
  "#4ade80", "#22d3ee", "#a78bfa", "#fbbf24",
  "#f87171", "#fb923c", "#38bdf8", "#f472b6",
  "#34d399", "#818cf8",
]

// ── Modal: Nova / Editar Caixinha ─────────────────────────────────────────────

function ReserveModal({
  editing,
  onClose,
}: {
  editing?: ReserveEnriched
  onClose: () => void
}) {
  const { data: categorias = [] } = useTransactionCategories()
  const createMut = useCreateReserve()
  const updateMut = useUpdateReserve()

  const [form, setForm] = useState({
    category_id: editing ? String(editing.category_id) : "",
    reserved_value: editing ? String(editing.reserved_value) : "",
    note: editing?.note ?? "",
  })

  const isEdit = !!editing
  const isValid = form.category_id !== "" && form.reserved_value.trim() !== ""
  const isPending = createMut.isPending || updateMut.isPending

  const handleSubmit = () => {
    if (!isValid || isPending) return

    const value = Number(form.reserved_value.replace(",", "."))

    if (isEdit) {
      updateMut.mutate(
        {
          id: editing.id,
          data: { reserved_value: value, note: form.note || undefined },
        },
        { onSuccess: onClose },
      )
    } else {
      createMut.mutate(
        {
          category_id: Number(form.category_id),
          reserved_value: value,
          note: form.note || undefined,
        },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-scale-in w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Editar Caixinha" : "Nova Caixinha"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Categoria — só na criação */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Categoria
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Valor reservado */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Valor Reservado (R$)
            </label>
            <Input
              placeholder="0,00"
              type="number"
              step="0.01"
              min="0"
              value={form.reserved_value}
              onChange={(e) => setForm((f) => ({ ...f, reserved_value: e.target.value }))}
              className="h-10 text-sm"
              autoFocus
            />
          </div>

          {/* Nota */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Observação (opcional)
            </label>
            <Input
              placeholder="Ex: parcelas do cartão, reserva viagem..."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="h-10 text-sm"
            />
          </div>

          <Button
            className="w-full h-10 text-sm font-medium"
            disabled={!isValid || isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin mr-2" />
            ) : null}
            {isEdit ? "Salvar alterações" : "Criar caixinha"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Card de caixinha ───────────────────────────────────────────────────────────

function ReserveCard({
  reserve,
  color,
  onEdit,
  onDelete,
}: {
  reserve: ReserveEnriched
  color: string
  onEdit: () => void
  onDelete: () => void
}) {
  const pct = Math.min(reserve.spent_percentage, 100)
  const isOver = reserve.spent_percentage > 100

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* barra de cor no topo */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
        style={{ background: color }}
      />

      {/* header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            style={{ background: `${color}20`, color }}
          >
            {reserve.category_acronym}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">
              {reserve.category_name}
            </p>
            {reserve.note && (
              <p className="truncate text-[11px] text-muted-foreground">
                {reserve.note}
              </p>
            )}
          </div>
        </div>

        {/* ações */}
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* valores */}
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Reservado
          </p>
          <p className="text-lg font-semibold leading-tight">
            {fmtBRL(reserve.reserved_value)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Disponível
          </p>
          <p
            className={cn(
              "text-base font-semibold leading-tight",
              isOver ? "text-rose-500" : "text-emerald-500",
            )}
          >
            {fmtBRL(reserve.available_value)}
          </p>
        </div>
      </div>

      {/* barra de progresso */}
      <div className="mb-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOver
              ? "bg-rose-500"
              : pct >= 80
                ? "bg-amber-400"
                : "bg-emerald-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Gasto: {fmtBRL(reserve.spent_value)}</span>
        <span
          className={cn(
            "font-medium",
            isOver
              ? "text-rose-500"
              : pct >= 80
                ? "text-amber-500"
                : "text-emerald-500",
          )}
        >
          {reserve.spent_percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiBox({
  label,
  value,
  accent,
  sub,
}: {
  label: string
  value: string
  accent: string
  sub?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
        style={{ background: accent }}
      />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CaixinhasPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ReserveEnriched | undefined>()

  const { data: summary, isLoading } = useSummary(month, year)
  const deleteMut = useDeleteReserve()

  const reserves = summary?.reserves ?? []

  const pieData = reserves.map((r) => ({
    name: r.category_name,
    value: r.reserved_value,
  }))

  // saldo livre pode ser negativo se os reservados somam mais que o saldo total
  const freeIsNegative = (summary?.free_balance ?? 0) < 0

  return (
    <div className="space-y-5 p-4 pb-20 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Caixinhas
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dinheiro alocado por categoria — tudo rendendo junto, separado na visão
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor mês/ano */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => {
              setEditing(undefined)
              setModal(true)
            }}
          >
            <Plus size={13} />
            Nova Caixinha
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiBox
          label="Total Reservado"
          value={fmtBRL(summary?.total_reserved ?? 0)}
          accent="#a78bfa"
          sub="soma das caixinhas"
        />
        <KpiBox
          label="Já Gasto"
          value={fmtBRL(summary?.total_spent ?? 0)}
          accent="#f87171"
          sub={`em ${MONTHS[month - 1]} ${year}`}
        />
        <KpiBox
          label="Disponível nas Caixinhas"
          value={fmtBRL(summary?.total_available ?? 0)}
          accent="#4ade80"
          sub="reservado - gasto"
        />
        <KpiBox
          label="Saldo Livre"
          value={fmtBRL(summary?.free_balance ?? 0)}
          accent={freeIsNegative ? "#f87171" : "#22d3ee"}
          sub="saldo total - reservado"
        />
      </div>

      {/* Corpo */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : reserves.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <PackageOpen size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhuma caixinha criada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Clique em "Nova Caixinha" para separar o seu dinheiro por categoria
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          {/* Cards */}
          <div className="grid gap-3 sm:grid-cols-2 content-start">
            {reserves.map((r, i) => (
              <ReserveCard
                key={r.id}
                reserve={r}
                color={COLORS[i % COLORS.length]}
                onEdit={() => {
                  setEditing(r)
                  setModal(true)
                }}
                onDelete={() => {
                  if (confirm(`Remover caixinha "${r.category_name}"?`)) {
                    deleteMut.mutate(r.id)
                  }
                }}
              />
            ))}
          </div>

          {/* Gráfico de pizza + legenda */}
          <div className="rounded-xl border border-border bg-card p-4 h-fit">
            <p className="mb-3 text-sm font-medium">Distribuição</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => fmtBRL(Number(v))}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda */}
            <div className="mt-2 space-y-1.5">
              {reserves.map((r, i) => {
                const totalReserved = summary?.total_reserved ?? 0
                const pct =
                  totalReserved > 0
                    ? Math.round((r.reserved_value / totalReserved) * 100)
                    : 0
                return (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <div
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="flex-1 truncate text-muted-foreground">
                      {r.category_name}
                    </span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                )
              })}
            </div>

            {/* Saldo livre em destaque */}
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Banknote size={13} className="text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Saldo livre
                </span>
              </div>
              <p
                className={cn(
                  "text-base font-semibold",
                  freeIsNegative ? "text-rose-500" : "text-emerald-500",
                )}
              >
                {fmtBRL(summary?.free_balance ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                não alocado em nenhuma caixinha
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ReserveModal
          editing={editing}
          onClose={() => {
            setModal(false)
            setEditing(undefined)
          }}
        />
      )}
    </div>
  )
}