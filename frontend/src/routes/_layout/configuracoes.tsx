import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, Pencil, Trash2, Check, X, Tag, Layers, TrendingUp, DollarSign, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useTransactionTypes, useCreateTransactionType, useUpdateTransactionType, useDeleteTransactionType,
  useTransactionCategories, useCreateTransactionCategory, useUpdateTransactionCategory, useDeleteTransactionCategory,
  useInvestmentTypes, useCreateInvestmentType, useUpdateInvestmentType, useDeleteInvestmentType,
  useIncomeTypes, useCreateIncomeType, useUpdateIncomeType, useDeleteIncomeType,
} from "@/hooks/api/useCategorias"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({ meta: [{ title: "Configurações Financeiras" }] }),
})

type Tab = "tx-tipos" | "tx-categorias" | "inv-tipos" | "inc-tipos"

// IDs de tipos do sistema (Saída / Entrada / Investimento) — protegidos no backend (HTTP 403)
const PROTECTED_TYPE_IDS = new Set([7, 8, 9])

// ── Componente genérico de linha editável ─────────────────────────────────────

function EditableRow({ children, onSave, onCancel, saving }: {
  children: React.ReactNode; onSave: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      {children}
      <button onClick={onSave} disabled={saving}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-500/10 disabled:opacity-50">
        <Check size={14} />
      </button>
      <button onClick={onCancel}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
        <X size={14} />
      </button>
    </div>
  )
}

// ── Componente genérico para listas simples (só description) ──────────────────

function SimpleList({ icon: Icon, items, isLoading, placeholder, onAdd, onUpdate, onDelete, adding, protectedIds }: {
  icon: React.ElementType
  items: { id: number; description: string }[]
  isLoading: boolean
  placeholder: string
  onAdd: (desc: string) => void
  onUpdate: (id: number, desc: string) => void
  onDelete: (id: number) => void
  adding: boolean
  protectedIds?: Set<number>
}) {
  const [newDesc, setNewDesc] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDesc, setEditDesc] = useState("")

  if (isLoading) return (
    <div className="space-y-2 py-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
    </div>
  )

  return (
    <div className="animate-fade-up space-y-3">
      <div className="flex gap-2">
        <Input placeholder={placeholder} value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          onKeyDown={e => e.key === "Enter" && newDesc.trim() && (onAdd(newDesc.trim()), setNewDesc(""))}
          className="glass-card h-9 border-border/60 text-sm" />
        <Button size="sm" onClick={() => { onAdd(newDesc.trim()); setNewDesc("") }}
          disabled={!newDesc.trim() || adding} className="glow-primary shrink-0 gap-1.5">
          <Plus size={14} /> Adicionar
        </Button>
      </div>
      <div className="glass-card divide-y divide-border/50 overflow-hidden rounded-xl">
        {items.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhum item cadastrado ainda.</div>
        )}
        {items.map(item => {
          const isProtected = protectedIds?.has(item.id) ?? false
          return (
            <div key={item.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                style={{ boxShadow: "0 0 12px -6px var(--glow-primary)" }}>
                <Icon size={14} />
              </div>
              {editingId === item.id ? (
                <EditableRow onSave={() => { onUpdate(item.id, editDesc); setEditingId(null) }}
                  onCancel={() => setEditingId(null)} saving={false}>
                  <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (onUpdate(item.id, editDesc), setEditingId(null))}
                    className="h-7 text-sm" autoFocus />
                </EditableRow>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{item.description}</span>
                  {isProtected ? (
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Lock size={9} /> Sistema
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => { setEditingId(item.id); setEditDesc(item.description) }}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(item.id)}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Aba: Tipos de Transação ───────────────────────────────────────────────────

function TxTiposTab() {
  const { data: tipos = [], isLoading } = useTransactionTypes()
  const createMut = useCreateTransactionType()
  const updateMut = useUpdateTransactionType()
  const deleteMut = useDeleteTransactionType()
  return (
    <SimpleList icon={Layers} items={tipos} isLoading={isLoading}
      placeholder="Nome do tipo (ex: Entrada, Saída...)"
      adding={createMut.isPending}
      protectedIds={PROTECTED_TYPE_IDS}
      onAdd={desc => createMut.mutate({ description: desc })}
      onUpdate={(id, desc) => updateMut.mutate({ id, data: { description: desc } })}
      onDelete={id => deleteMut.mutate(id)} />
  )
}

// ── Aba: Categorias de Transação ──────────────────────────────────────────────

function TxCategoriasTab() {
  const { data: categorias = [], isLoading } = useTransactionCategories()
  const createMut = useCreateTransactionCategory()
  const updateMut = useUpdateTransactionCategory()
  const deleteMut = useDeleteTransactionCategory()

  const [newForm, setNewForm] = useState({ description: "", acronym: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ description: "", acronym: "" })

  if (isLoading) return (
    <div className="space-y-2 py-4">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
    </div>
  )

  return (
    <div className="animate-fade-up space-y-3">
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <Input placeholder="Descrição (ex: Alimentação)" value={newForm.description}
          onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && newForm.description.trim() && newForm.acronym.trim() &&
            createMut.mutate({ description: newForm.description.trim(), acronym: newForm.acronym.trim().toUpperCase().slice(0,4) },
              { onSuccess: () => setNewForm({ description: "", acronym: "" }) })}
          className="glass-card h-9 border-border/60 text-sm" />
        <Input placeholder="Sigla (ALM)" value={newForm.acronym}
          onChange={e => setNewForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0,4) }))}
          className="glass-card h-9 w-28 shrink-0 border-border/60 text-sm" maxLength={4} />
        <Button size="sm"
          disabled={!newForm.description.trim() || !newForm.acronym.trim() || createMut.isPending}
          onClick={() => createMut.mutate(
            { description: newForm.description.trim(), acronym: newForm.acronym.trim().toUpperCase().slice(0,4) },
            { onSuccess: () => setNewForm({ description: "", acronym: "" }) })}
          className="glow-primary shrink-0 gap-1.5">
          <Plus size={14} /> Adicionar
        </Button>
      </div>
      <div className="glass-card divide-y divide-border/50 overflow-hidden rounded-xl">
        {categorias.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</div>
        )}
        {categorias.map(cat => (
          <div key={cat.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Tag size={14} className="text-muted-foreground" />
            </div>
            {editingId === cat.id ? (
              <EditableRow
                onSave={() => updateMut.mutate({ id: cat.id, data: { description: editForm.description.trim(), acronym: editForm.acronym.trim().toUpperCase().slice(0,4) } }, { onSuccess: () => setEditingId(null) })}
                onCancel={() => setEditingId(null)} saving={updateMut.isPending}>
                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="h-7 text-sm" placeholder="Descrição" autoFocus />
                <Input value={editForm.acronym} onChange={e => setEditForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0,4) }))}
                  className="h-7 w-24 shrink-0 text-sm" placeholder="Sigla" maxLength={4} />
              </EditableRow>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cat.description}</p>
                  <p className="text-xs text-muted-foreground">{cat.acronym}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => { setEditingId(cat.id); setEditForm({ description: cat.description, acronym: cat.acronym }) }}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteMut.mutate(cat.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Aba: Tipos de Investimento ────────────────────────────────────────────────

function InvTiposTab() {
  const { data: tipos = [], isLoading } = useInvestmentTypes()
  const createMut = useCreateInvestmentType()
  const updateMut = useUpdateInvestmentType()
  const deleteMut = useDeleteInvestmentType()

  const [newForm, setNewForm] = useState({ description: "", acronym: "", fixed_income: false, daily_liquidity: false, ir_discount: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ description: "", acronym: "", fixed_income: false, daily_liquidity: false, ir_discount: "" })

  const handleCreate = () => {
    if (!newForm.description.trim() || !newForm.acronym.trim()) return
    createMut.mutate({
      description: newForm.description.trim(),
      acronym: newForm.acronym.trim().toUpperCase().slice(0, 10),
      fixed_income: newForm.fixed_income,
      daily_liquidity: newForm.daily_liquidity,
      ir_discount: newForm.ir_discount ? Number(newForm.ir_discount) : undefined,
    }, { onSuccess: () => setNewForm({ description: "", acronym: "", fixed_income: false, daily_liquidity: false, ir_discount: "" }) })
  }

  const handleUpdate = (id: number) => {
    if (!editForm.description.trim() || !editForm.acronym.trim()) return
    updateMut.mutate({
      id,
      data: {
        description: editForm.description.trim(),
        acronym: editForm.acronym.trim().toUpperCase().slice(0, 10),
        fixed_income: editForm.fixed_income,
        daily_liquidity: editForm.daily_liquidity,
        ir_discount: editForm.ir_discount ? Number(editForm.ir_discount) : undefined,
      },
    }, { onSuccess: () => setEditingId(null) })
  }

  if (isLoading) return (
    <div className="space-y-2 py-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
    </div>
  )

  return (
    <div className="animate-fade-up space-y-3">
      {/* Form de criação */}
      <div className="glass-card space-y-3 rounded-xl p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Novo tipo</p>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Input placeholder="Descrição (ex: Tesouro Direto)" value={newForm.description}
            onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
            className="h-9 text-sm" />
          <Input placeholder="Sigla (TD)" value={newForm.acronym}
            onChange={e => setNewForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0, 10) }))}
            className="h-9 w-28 shrink-0 text-sm" maxLength={10} />
          <Input placeholder="IR (%)" value={newForm.ir_discount} type="number" step="0.01"
            onChange={e => setNewForm(f => ({ ...f, ir_discount: e.target.value }))}
            className="font-numeric h-9 w-24 shrink-0 text-sm" />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input type="checkbox" checked={newForm.fixed_income}
              onChange={e => setNewForm(f => ({ ...f, fixed_income: e.target.checked }))}
              className="rounded" />
            Renda Fixa
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input type="checkbox" checked={newForm.daily_liquidity}
              onChange={e => setNewForm(f => ({ ...f, daily_liquidity: e.target.checked }))}
              className="rounded" />
            Liquidez Diária
          </label>
          <Button size="sm" onClick={handleCreate}
            disabled={!newForm.description.trim() || !newForm.acronym.trim() || createMut.isPending}
            className="glow-primary ml-auto shrink-0 gap-1.5">
            <Plus size={14} /> Adicionar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="glass-card divide-y divide-border/50 overflow-hidden rounded-xl">
        {tipos.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhum tipo cadastrado ainda.</div>
        )}
        {tipos.map(tipo => (
          <div key={tipo.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400"
              style={{ boxShadow: "0 0 12px -6px rgba(167,139,250,.7)" }}>
              <TrendingUp size={14} />
            </div>
            {editingId === tipo.id ? (
              <EditableRow onSave={() => handleUpdate(tipo.id)} onCancel={() => setEditingId(null)} saving={updateMut.isPending}>
                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="h-7 text-sm" autoFocus />
                <Input value={editForm.acronym} onChange={e => setEditForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0,10) }))}
                  className="h-7 w-24 shrink-0 text-sm" maxLength={10} />
                <Input value={editForm.ir_discount} type="number" step="0.01" placeholder="IR %"
                  onChange={e => setEditForm(f => ({ ...f, ir_discount: e.target.value }))}
                  className="font-numeric h-7 w-20 shrink-0 text-sm" />
              </EditableRow>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tipo.description}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{tipo.acronym}</span>
                    {tipo.fixed_income && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">Renda Fixa</span>}
                    {tipo.daily_liquidity && <span className="rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-500">Liq. Diária</span>}
                    {tipo.ir_discount && <span className="font-numeric text-[10px] text-muted-foreground">IR: {tipo.ir_discount}%</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => { setEditingId(tipo.id); setEditForm({ description: tipo.description, acronym: tipo.acronym, fixed_income: tipo.fixed_income, daily_liquidity: tipo.daily_liquidity, ir_discount: tipo.ir_discount?.toString() ?? "" }) }}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteMut.mutate(tipo.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Aba: Tipos de Rendimento ──────────────────────────────────────────────────

function IncTiposTab() {
  const { data: tipos = [], isLoading } = useIncomeTypes()
  const createMut = useCreateIncomeType()
  const updateMut = useUpdateIncomeType()
  const deleteMut = useDeleteIncomeType()
  return (
    <SimpleList icon={DollarSign} items={tipos} isLoading={isLoading}
      placeholder="Nome do rendimento (ex: Juros, Dividendo...)"
      adding={createMut.isPending}
      onAdd={desc => createMut.mutate({ description: desc })}
      onUpdate={(id, desc) => updateMut.mutate({ id, data: { description: desc } })}
      onDelete={id => deleteMut.mutate(id)} />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "tx-tipos",      label: "Tipos de Transação",    icon: <Layers size={13} /> },
  { key: "tx-categorias", label: "Categorias",            icon: <Tag size={13} /> },
  { key: "inv-tipos",     label: "Tipos de Investimento", icon: <TrendingUp size={13} /> },
  { key: "inc-tipos",     label: "Tipos de Rendimento",   icon: <DollarSign size={13} /> },
]

function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tx-tipos")

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Configurações Financeiras"
        subtitle="Gerencie os tipos e categorias usados em transações e investimentos"
      />

      {/* Tabs — scroll horizontal no mobile */}
      <div className="animate-fade-up delay-1 overflow-x-auto pb-1 opacity-0">
        <div className="glass-card flex w-fit min-w-full gap-1 rounded-xl p-1 sm:min-w-0">
          {TABS.map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "glow-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "tx-tipos"      && <TxTiposTab />}
      {activeTab === "tx-categorias" && <TxCategoriasTab />}
      {activeTab === "inv-tipos"     && <InvTiposTab />}
      {activeTab === "inc-tipos"     && <IncTiposTab />}
    </div>
  )
}