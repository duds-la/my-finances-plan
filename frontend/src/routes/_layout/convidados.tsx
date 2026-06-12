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
import { CineCard } from "@/components/Common/CineCard"
import { PageHeader } from "@/components/Common/PageHeader"

export const Route = createFileRoute("/_layout/convidados")({
  component: ConvidadosPage,
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

const MODULE_OPTIONS = [
  { key: "metas",         label: "Metas",         icon: Target,     color: "#22d3ee" },
  { key: "investimentos", label: "Investimentos", icon: TrendingUp, color: "#a78bfa" },
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="glass-card animate-fade-up relative z-[61] flex max-h-[90svh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="divider-glow shrink-0" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="glow-primary flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <UserCheck size={16} />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold">
                {editing ? "Editar Convidado" : "Novo Convidado"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {editing ? `Editando @${editing.guest.name}` : "Crie um acesso somente leitura"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

          {/* Credenciais */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credenciais</p>
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
                  className="h-9 pr-9 text-sm"
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulos permitidos</p>
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
                    style={active ? { boxShadow: "0 0 18px -6px var(--glow-primary)" } : undefined}
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Metas visíveis ({selectedGoals.length} selecionada{selectedGoals.length !== 1 ? "s" : ""})
              </p>
              {ativas.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma meta ativa</p>
              ) : (
                <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-muted/20">
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{g.title}</p>
                          <p className="font-numeric text-xs text-muted-foreground">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Investimentos visíveis ({selectedInvs.length} selecionado{selectedInvs.length !== 1 ? "s" : ""})
              </p>
              {invAtivos.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhum investimento ativo</p>
              ) : (
                <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-muted/20">
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
                        <div className="min-w-0 flex-1">
                          <p className="font-numeric truncate text-sm font-medium">
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
        <div className="flex shrink-0 gap-2 border-t border-border/50 px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isBusy} className="glow-primary flex-1 gap-1.5">
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

      <CineCard
        accent="#22d3ee"
        interactive={access.is_active}
        className={cn("space-y-3 p-4", !access.is_active && "opacity-60 saturate-50")}
      >
        {/* Header do card */}
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
            style={{
              background: "linear-gradient(135deg, var(--finance-green), var(--finance-cyan))",
              boxShadow: "0 0 16px -4px var(--glow-primary)",
            }}
          >
            <Users size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">@{access.guest.name}</p>
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
          <div className="flex shrink-0 gap-1">
            <button
              onClick={copyLogin}
              title="Copiar login"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil size={13} />
            </button>
            {confirming ? (
              <div className="flex gap-1">
                <button
                  onClick={() => { deleteGuest(access.id); setConfirming(false) }}
                  disabled={isDeleting}
                  className="flex size-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/20"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
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
                style={{ backgroundColor: `${m.color}20`, color: m.color, boxShadow: `0 0 12px -6px ${m.color}` }}
              >
                <Icon size={11} />
                {m.label}
              </span>
            )
          })}
        </div>

        {/* Resumo dos itens */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border/40 bg-muted/40 px-3 py-2">
            <p className="text-muted-foreground">Metas</p>
            <p className="font-numeric font-semibold">{access.shared_goal_ids.length} compartilhada{access.shared_goal_ids.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/40 px-3 py-2">
            <p className="text-muted-foreground">Investimentos</p>
            <p className="font-numeric font-semibold">{access.shared_investment_ids.length} compartilhado{access.shared_investment_ids.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </CineCard>
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
        <div className="skeleton h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {modalOpen && <GuestModal onClose={() => setModalOpen(false)} />}

      <PageHeader
        eyebrow="Acesso compartilhado"
        title="Convidados"
        subtitle={`${guests.length} convidado${guests.length !== 1 ? "s" : ""} · acesso somente leitura`}
        action={
          <Button size="sm" className="glow-primary gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Novo Convidado
          </Button>
        }
      />

      {/* Aviso informativo */}
      <div className="glass-card animate-fade-up delay-1 flex items-start gap-3 rounded-xl border-primary/20 p-4 opacity-0">
        <div className="glow-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Shield size={14} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">Acesso seguro e controlado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Convidados só visualizam os dados que você liberar. Eles não podem criar, editar ou apagar nada.
          </p>
        </div>
      </div>

      {/* Lista */}
      {guests.length === 0 ? (
        <div className="glass-card animate-fade-up rounded-xl border border-dashed border-border py-16 text-center">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum convidado ainda</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Crie um acesso para compartilhar metas e investimentos específicos
          </p>
          <Button size="sm" className="glow-primary mt-4 gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Criar primeiro convidado
          </Button>
        </div>
      ) : (
        <div className="stagger-children grid gap-3 sm:grid-cols-2">
          {guests.map(g => <GuestCard key={g.id} access={g} />)}
        </div>
      )}
    </div>
  )
}