import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, Pencil, Trash2, Check, X, Tag, Layers, TrendingUp, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useTransactionTypes, useCreateTransactionType, useUpdateTransactionType, useDeleteTransactionType,
  useTransactionCategories, useCreateTransactionCategory, useUpdateTransactionCategory, useDeleteTransactionCategory,
  useInvestmentTypes, useCreateInvestmentType, useUpdateInvestmentType, useDeleteInvestmentType,
  useIncomeTypes, useCreateIncomeType, useUpdateIncomeType, useDeleteIncomeType,
  type TransactionType, type TransactionCategory, type InvestmentType, type IncomeType,
} from "@/hooks/api/useCategorias"

export const Route = createFileRoute("/_layout/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({ meta: [{ title: "Configurações Financeiras" }] }),
})

type Tab = "tx-tipos" | "tx-categorias" | "inv-tipos" | "inc-tipos"

// ── Componente genérico de linha editável ─────────────────────────────────────

function EditableRow({ children, onSave, onCancel, saving }: {
  children: React.ReactNode; onSave: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div className="flex items-center gap-2 flex-1">
      {children}
      <button onClick={onSave} disabled={saving}
        className="flex size-7 items-center justify-center rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 shrink-0">
        <Check size={14} />
      </button>
      <button onClick={onCancel}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

// ── Componente genérico para listas simples (só description) ──────────────────

function SimpleList({ icon: Icon, items, isLoading, placeholder, onAdd, onUpdate, onDelete, adding }: {
  icon: React.ElementType
  items: { id: number; description: string }[]
  isLoading: boolean
  placeholder: string
  onAdd: (desc: string) => void
  onUpdate: (id: number, desc: string) => void
  onDelete: (id: number) => void
  adding: boolean
}) {
  const [newDesc, setNewDesc] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDesc, setEditDesc] = useState("")

  if (isLoading) return (
    <div className="space-y-2 py-4">
      {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder={placeholder} value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          onKeyDown={e => e.key === "Enter" && newDesc.trim() && (onAdd(newDesc.trim()), setNewDesc(""))}
          className="h-9 text-sm" />
        <Button size="sm" onClick={() => { onAdd(newDesc.trim()); setNewDesc("") }}
          disabled={!newDesc.trim() || adding} className="gap-1.5 shrink-0">
          <Plus size={14} /> Adicionar
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {items.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhum item cadastrado ainda.</div>
        )}
        {items.map(item => (
          <div key={item.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(item.id); setEditDesc(item.description) }}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(item.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
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
      {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <Input placeholder="Descrição (ex: Alimentação)" value={newForm.description}
          onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && newForm.description.trim() && newForm.acronym.trim() &&
            createMut.mutate({ description: newForm.description.trim(), acronym: newForm.acronym.trim().toUpperCase().slice(0,4) },
              { onSuccess: () => setNewForm({ description: "", acronym: "" }) })}
          className="h-9 text-sm" />
        <Input placeholder="Sigla (ALM)" value={newForm.acronym}
          onChange={e => setNewForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0,4) }))}
          className="h-9 text-sm w-28 shrink-0" maxLength={4} />
        <Button size="sm"
          disabled={!newForm.description.trim() || !newForm.acronym.trim() || createMut.isPending}
          onClick={() => createMut.mutate(
            { description: newForm.description.trim(), acronym: newForm.acronym.trim().toUpperCase().slice(0,4) },
            { onSuccess: () => setNewForm({ description: "", acronym: "" }) })}
          className="gap-1.5 shrink-0">
          <Plus size={14} /> Adicionar
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {categorias.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</div>
        )}
        {categorias.map(cat => (
          <div key={cat.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
              <Tag size={14} className="text-muted-foreground" />
            </div>
            {editingId === cat.id ? (
              <EditableRow
                onSave={() => updateMut.mutate({ id: cat.id, data: { description: editForm.description.trim(), acronym: editForm.acronym.trim().toUpperCase().slice(0,4) } }, { onSuccess: () => setEditingId(null) })}
                onCancel={() => setEditingId(null)} saving={updateMut.isPending}>
                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="h-7 text-sm" placeholder="Descrição" autoFocus />
                <Input value={editForm.acronym} onChange={e => setEditForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0,4) }))}
                  className="h-7 text-sm w-24 shrink-0" placeholder="Sigla" maxLength={4} />
              </EditableRow>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cat.description}</p>
                  <p className="text-xs text-muted-foreground">{cat.acronym}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(cat.id); setEditForm({ description: cat.description, acronym: cat.acronym }) }}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteMut.mutate(cat.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
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
      {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Form de criação */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Novo tipo</p>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Input placeholder="Descrição (ex: Tesouro Direto)" value={newForm.description}
            onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
            className="h-9 text-sm" />
          <Input placeholder="Sigla (TD)" value={newForm.acronym}
            onChange={e => setNewForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0, 10) }))}
            className="h-9 text-sm w-28 shrink-0" maxLength={10} />
          <Input placeholder="IR (%)" value={newForm.ir_discount} type="number" step="0.01"
            onChange={e => setNewForm(f => ({ ...f, ir_discount: e.target.value }))}
            className="h-9 text-sm w-24 shrink-0" />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={newForm.fixed_income}
              onChange={e => setNewForm(f => ({ ...f, fixed_income: e.target.checked }))}
              className="rounded" />
            Renda Fixa
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={newForm.daily_liquidity}
              onChange={e => setNewForm(f => ({ ...f, daily_liquidity: e.target.checked }))}
              className="rounded" />
            Liquidez Diária
          </label>
          <Button size="sm" onClick={handleCreate}
            disabled={!newForm.description.trim() || !newForm.acronym.trim() || createMut.isPending}
            className="gap-1.5 ml-auto shrink-0">
            <Plus size={14} /> Adicionar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {tipos.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhum tipo cadastrado ainda.</div>
        )}
        {tipos.map(tipo => (
          <div key={tipo.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
              <TrendingUp size={14} />
            </div>
            {editingId === tipo.id ? (
              <EditableRow onSave={() => handleUpdate(tipo.id)} onCancel={() => setEditingId(null)} saving={updateMut.isPending}>
                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="h-7 text-sm" autoFocus />
                <Input value={editForm.acronym} onChange={e => setEditForm(f => ({ ...f, acronym: e.target.value.toUpperCase().slice(0,10) }))}
                  className="h-7 text-sm w-24 shrink-0" maxLength={10} />
                <Input value={editForm.ir_discount} type="number" step="0.01" placeholder="IR %"
                  onChange={e => setEditForm(f => ({ ...f, ir_discount: e.target.value }))}
                  className="h-7 text-sm w-20 shrink-0" />
              </EditableRow>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tipo.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{tipo.acronym}</span>
                    {tipo.fixed_income && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-medium">Renda Fixa</span>}
                    {tipo.daily_liquidity && <span className="text-[10px] bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded-full font-medium">Liq. Diária</span>}
                    {tipo.ir_discount && <span className="text-[10px] text-muted-foreground">IR: {tipo.ir_discount}%</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(tipo.id); setEditForm({ description: tipo.description, acronym: tipo.acronym, fixed_income: tipo.fixed_income, daily_liquidity: tipo.daily_liquidity, ir_discount: tipo.ir_discount?.toString() ?? "" }) }}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteMut.mutate(tipo.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
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
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Configurações Financeiras</h1>
        <p className="text-xs text-muted-foreground sm:text-sm mt-0.5">
          Gerencie os tipos e categorias usados em transações e investimentos
        </p>
      </div>

      {/* Tabs — scroll horizontal no mobile */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit min-w-full sm:min-w-0">
          {TABS.map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0",
                activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
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