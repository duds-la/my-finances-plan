import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Users, Plus, Trash2, Pencil, Eye, EyeOff, Check, X,
  Target, TrendingUp, Shield, UserCheck, Copy, RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useGuestAccess, type GuestAccess, type GuestAccessCreate, type GuestAccessUpdate } from "@/hooks/api/useGuestAccess"
import { useGoals } from "@/hooks/api/useGoals"
import { useInvestments } from "@/hooks/api/useInvestments"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/convidados")({
  component: ConvidadosPage,
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

const MODULE_OPTIONS = [
  { key: "metas",         label: "Metas",         icon: Target,     color: "#22d3ee" },
  { key: "investimentos", label: "Investimentos",  icon: TrendingUp, color: "#a78bfa" },
]

// ── Modal: Criar / Editar Convidado ───────────────────────────────────────────

interface GuestModalProps {
  editing?: GuestAccess | null
  onClose: () => void
}

function GuestModal({ editing, onClose }: GuestModalProps) {
  const { goals } = useGoals()
  const { investments } = useInvestments()
  const { createGuest, updateGuest, isCreating, isUpdating } = useGuestAccess()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const [name, setName] = useState(editing?.guest.name ?? "")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [selectedModules, setSelectedModules] = useState<string[]>(
    editing?.allowed_modules ?? ["metas", "investimentos"]
  )
  const [selectedGoals, setSelectedGoals] = useState<number[]>(
    editing?.shared_goal_ids ?? []
  )
  const [selectedInvs, setSelectedInvs] = useState<number[]>(
    editing?.shared_investment_ids ?? []
  )

  const ativas = goals.filter(g => g.status === "em_andamento")
  const invAtivos = investments.filter(i => i.status === "ativo")

  const toggleModule = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }
  const toggleGoal = (id: number) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }
  const toggleInv = (id: number) => {
    setSelectedInvs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const isBusy = isCreating || isUpdating

  async function handleSave() {
    try {
      if (editing) {
        const payload: GuestAccessUpdate = {
          allowed_modules:       selectedModules,
          shared_goal_ids:       selectedGoals,
          shared_investment_ids: selectedInvs,
        }
        if (password.trim()) payload.guest_password = password.trim()
        await updateGuest({ id: editing.id, data: payload })
        showSuccessToast("Convidado atualizado com sucesso")
      } else {
        if (!name.trim() || !password.trim()) {
          showErrorToast(new Error("Preencha nome de usuário e senha"))
          return
        }
        const payload: GuestAccessCreate = {
          guest_name:            name.trim(),
          guest_password:        password.trim(),
          allowed_modules:       selectedModules,
          shared_goal_ids:       selectedGoals,
          shared_investment_ids: selectedInvs,
        }
        await createGuest(payload)
        showSuccessToast("Convidado criado com sucesso")
      }
      onClose()
    } catch (err: any) {
      showErrorToast(err)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-[61] w-full sm:max-w-lg max-h-[90svh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <UserCheck size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {editing ? "Editar Convidado" : "Novo Convidado"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {editing ? `Editando @${editing.guest.name}` : "Crie um acesso somente leitura"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Credenciais */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credenciais</p>
            <div className="space-y-2">
              <Input
                placeholder="Nome de usuário (login)"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!!editing}
                className="h-9 text-sm"
              />
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder={editing ? "Nova senha (deixe em branco para manter)" : "Senha do convidado"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Módulos */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Módulos permitidos</p>
            <div className="flex gap-2">
              {MODULE_OPTIONS.map(m => {
                const Icon = m.icon
                const active = selectedModules.includes(m.key)
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleModule(m.key)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    )}
                  >
                    <Icon size={15} />
                    {m.label}
                    {active && <Check size={13} className="text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Metas compartilhadas */}
          {selectedModules.includes("metas") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Metas visíveis ({selectedGoals.length} selecionada{selectedGoals.length !== 1 ? "s" : ""})
              </p>
              {ativas.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma meta ativa</p>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
                  {ativas.map(g => {
                    const pct = g.target_value > 0
                      ? Math.round((Number(g.current_value) / Number(g.target_value)) * 100)
                      : 0
                    const sel = selectedGoals.includes(g.id)
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          sel ? "bg-primary/5" : "hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                          sel ? "border-primary bg-primary" : "border-border"
                        )}>
                          {sel && <Check size={11} className="text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{g.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtBRL(Number(g.current_value))} / {fmtBRL(Number(g.target_value))} · {pct}%
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Investimentos compartilhados */}
          {selectedModules.includes("investimentos") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Investimentos visíveis ({selectedInvs.length} selecionado{selectedInvs.length !== 1 ? "s" : ""})
              </p>
              {invAtivos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum investimento ativo</p>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
                  {invAtivos.map(inv => {
                    const sel = selectedInvs.includes(inv.id)
                    return (
                      <button
                        key={inv.id}
                        onClick={() => toggleInv(inv.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          sel ? "bg-primary/5" : "hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                          sel ? "border-primary bg-primary" : "border-border"
                        )}>
                          {sel && <Check size={11} className="text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {inv.finalidade ? `[${inv.finalidade}] ` : ""}{fmtBRL(Number(inv.current_value ?? inv.invested_value))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Aplicado em {new Date(inv.application_date + "T00:00:00").toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 shrink-0 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isBusy} className="flex-1">
            {isBusy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {editing ? "Salvar alterações" : "Criar convidado"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Card de convidado ─────────────────────────────────────────────────────────

function GuestCard({ access }: { access: GuestAccess }) {
  const { deleteGuest, isDeleting } = useGuestAccess()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { showSuccessToast } = useCustomToast()

  function copyLogin() {
    navigator.clipboard.writeText(access.guest.name)
    showSuccessToast("Login copiado!")
  }

  return (
    <>
      {editing && <GuestModal editing={access} onClose={() => setEditing(false)} />}

      <div className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-3 transition-opacity",
        !access.is_active && "opacity-60"
      )}>
        {/* Header do card */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">@{access.guest.name}</p>
              {!access.is_active && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Inativo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Criado em {new Date(access.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={copyLogin}
              title="Copiar login"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Pencil size={13} />
            </button>
            {confirming ? (
              <div className="flex gap-1">
                <button
                  onClick={() => { deleteGuest(access.id); setConfirming(false) }}
                  disabled={isDeleting}
                  className="flex size-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Módulos */}
        <div className="flex flex-wrap gap-1.5">
          {MODULE_OPTIONS.map(m => {
            const Icon = m.icon
            const active = access.allowed_modules.includes(m.key)
            if (!active) return null
            return (
              <span
                key={m.key}
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: `${m.color}20`, color: m.color }}
              >
                <Icon size={11} />
                {m.label}
              </span>
            )
          })}
        </div>

        {/* Resumo dos itens */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-muted-foreground">Metas</p>
            <p className="font-semibold">{access.shared_goal_ids.length} compartilhada{access.shared_goal_ids.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-muted-foreground">Investimentos</p>
            <p className="font-semibold">{access.shared_investment_ids.length} compartilhado{access.shared_investment_ids.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ConvidadosPage() {
  const { guests, isLoading } = useGuestAccess()
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {modalOpen && <GuestModal onClose={() => setModalOpen(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Convidados</h1>
          <p className="text-xs text-muted-foreground">
            {guests.length} convidado{guests.length !== 1 ? "s" : ""} · acesso somente leitura
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Novo Convidado
        </Button>
      </div>

      {/* Aviso informativo */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Shield size={16} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">Acesso seguro e controlado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Convidados só visualizam os dados que você liberar. Eles não podem criar, editar ou apagar nada.
          </p>
        </div>
      </div>

      {/* Lista */}
      {guests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <Users size={32} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum convidado ainda</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Crie um acesso para compartilhar metas e investimentos específicos
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Criar primeiro convidado
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {guests.map(g => <GuestCard key={g.id} access={g} />)}
        </div>
      )}
    </div>
  )
}
