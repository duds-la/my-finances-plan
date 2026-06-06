import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, Calculator, TrendingUp, Target, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useSimulations, useCreateSimulation, useDeleteSimulation } from "@/hooks/api/useSimulations"
import type { Simulation } from "@/hooks/api/useSimulations"

export const Route = createFileRoute("/_layout/simulacoes")({
  component: SimulacoesPage,
  head: () => ({ meta: [{ title: "Simulações — FinanceOS" }] }),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })

const TIPOS: Record<string, { label: string; icon: React.ElementType; cor: string }> = {
  juros_compostos:         { label: "Juros Compostos", icon: TrendingUp,  cor: "#4ade80" },
  prazo_meta:              { label: "Prazo para Meta", icon: Target,       cor: "#a78bfa" },
  comparacao_investimento: { label: "Comparação",      icon: Calculator,   cor: "#22d3ee" },
}

// ── Calculadoras ──────────────────────────────────────────────────────────────

function calcJurosCompostos(params: Record<string, number>) {
  const { principal, taxa_mensal, meses, aporte_mensal = 0 } = params
  const r = taxa_mensal / 100
  let montante = principal
  const historico: number[] = [principal]
  for (let i = 0; i < meses; i++) {
    montante = montante * (1 + r) + aporte_mensal
    historico.push(Math.round(montante * 100) / 100)
  }
  const total_investido = principal + aporte_mensal * meses
  const juros_ganhos = montante - total_investido
  return {
    montante_final: Math.round(montante * 100) / 100,
    total_investido: Math.round(total_investido * 100) / 100,
    juros_ganhos: Math.round(juros_ganhos * 100) / 100,
    historico,
  }
}

function calcPrazoMeta(params: Record<string, number>) {
  const { valor_alvo, valor_atual, aporte_mensal, taxa_mensal = 0 } = params
  const r = taxa_mensal / 100
  let saldo = valor_atual
  let meses = 0
  while (saldo < valor_alvo && meses < 600) {
    saldo = saldo * (1 + r) + aporte_mensal
    meses++
  }
  return {
    meses_total: meses,
    anos: Math.floor(meses / 12),
    meses_restantes: meses % 12,
    saldo_final: Math.round(saldo * 100) / 100,
    total_aportado: Math.round(valor_atual + aporte_mensal * meses),
  }
}

function calcComparacao(params: Record<string, number>) {
  const { principal, meses, taxa_a, taxa_b } = params
  const ra = taxa_a / 100
  const rb = taxa_b / 100
  const montante_a = principal * Math.pow(1 + ra, meses)
  const montante_b = principal * Math.pow(1 + rb, meses)
  const diferenca = Math.abs(montante_a - montante_b)
  return {
    montante_a: Math.round(montante_a * 100) / 100,
    montante_b: Math.round(montante_b * 100) / 100,
    diferenca: Math.round(diferenca * 100) / 100,
    melhor: montante_a >= montante_b ? "Opção A" : "Opção B",
    rendimento_a: Math.round((montante_a - principal) * 100) / 100,
    rendimento_b: Math.round((montante_b - principal) * 100) / 100,
  }
}

// ── Formulários ───────────────────────────────────────────────────────────────

function FormJurosCompostos({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ principal: "", taxa_mensal: "", meses: "", aporte_mensal: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))
  const calcular = () => {
    const params = {
      principal: parseFloat(f.principal) || 0,
      taxa_mensal: parseFloat(f.taxa_mensal) || 0,
      meses: parseInt(f.meses) || 0,
      aporte_mensal: parseFloat(f.aporte_mensal) || 0,
    }
    if (!params.principal || !params.taxa_mensal || !params.meses) return
    onSave(params, calcJurosCompostos(params))
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Capital inicial (R$) *</label>
          <Input type="number" placeholder="1000" value={f.principal} onChange={set("principal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa mensal (%) *</label>
          <Input type="number" placeholder="1.0" step="0.01" value={f.taxa_mensal} onChange={set("taxa_mensal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período (meses) *</label>
          <Input type="number" placeholder="12" value={f.meses} onChange={set("meses")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Aporte mensal (R$)</label>
          <Input type="number" placeholder="0" value={f.aporte_mensal} onChange={set("aporte_mensal")} />
        </div>
      </div>
      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.principal || !f.taxa_mensal || !f.meses}>
        Calcular e salvar
      </Button>
    </div>
  )
}

function FormPrazoMeta({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ valor_alvo: "", valor_atual: "", aporte_mensal: "", taxa_mensal: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))
  const calcular = () => {
    const params = {
      valor_alvo: parseFloat(f.valor_alvo) || 0,
      valor_atual: parseFloat(f.valor_atual) || 0,
      aporte_mensal: parseFloat(f.aporte_mensal) || 0,
      taxa_mensal: parseFloat(f.taxa_mensal) || 0,
    }
    if (!params.valor_alvo || !params.aporte_mensal) return
    onSave(params, calcPrazoMeta(params))
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor alvo (R$) *</label>
          <Input type="number" placeholder="50000" value={f.valor_alvo} onChange={set("valor_alvo")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Já tenho (R$)</label>
          <Input type="number" placeholder="0" value={f.valor_atual} onChange={set("valor_atual")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Aporte mensal (R$) *</label>
          <Input type="number" placeholder="500" value={f.aporte_mensal} onChange={set("aporte_mensal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa mensal (%)</label>
          <Input type="number" placeholder="0.8" step="0.01" value={f.taxa_mensal} onChange={set("taxa_mensal")} />
        </div>
      </div>
      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.valor_alvo || !f.aporte_mensal}>
        Calcular e salvar
      </Button>
    </div>
  )
}

function FormComparacao({ onSave }: { onSave: (p: Record<string, number>, r: Record<string, unknown>) => void }) {
  const [f, setF] = useState({ principal: "", meses: "", taxa_a: "", taxa_b: "" })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))
  const calcular = () => {
    const params = {
      principal: parseFloat(f.principal) || 0,
      meses: parseInt(f.meses) || 0,
      taxa_a: parseFloat(f.taxa_a) || 0,
      taxa_b: parseFloat(f.taxa_b) || 0,
    }
    if (!params.principal || !params.meses || !params.taxa_a || !params.taxa_b) return
    onSave(params, calcComparacao(params))
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Capital (R$) *</label>
          <Input type="number" placeholder="10000" value={f.principal} onChange={set("principal")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período (meses) *</label>
          <Input type="number" placeholder="12" value={f.meses} onChange={set("meses")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa A (% a.m.) *</label>
          <Input type="number" placeholder="1.0" step="0.01" value={f.taxa_a} onChange={set("taxa_a")} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Taxa B (% a.m.) *</label>
          <Input type="number" placeholder="0.8" step="0.01" value={f.taxa_b} onChange={set("taxa_b")} />
        </div>
      </div>
      <Button size="sm" className="w-full" onClick={calcular}
        disabled={!f.principal || !f.meses || !f.taxa_a || !f.taxa_b}>
        Calcular e salvar
      </Button>
    </div>
  )
}

// ── Card de resultado salvo ───────────────────────────────────────────────────

function ResultCard({ sim, onDelete }: { sim: Simulation; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const tipo = TIPOS[sim.simulation_type]
  const Icon = tipo?.icon ?? Calculator
  const cor = tipo?.cor ?? "#94a3b8"
  const r = sim.result ?? {}
  const p = sim.parameters ?? {}

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cor}20` }}>
            <Icon size={14} style={{ color: cor }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{tipo?.label ?? sim.simulation_type}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(sim.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(v => !v)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parâmetros</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(p).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                  <span className="font-medium">
                    {typeof v === "number" && k.includes("taxa") ? `${v}%` :
                     typeof v === "number" && (k.includes("valor") || k.includes("principal") || k.includes("aporte") || k.includes("capital"))
                       ? fmtBRL(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {Object.keys(r).length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: `${cor}40`, background: `${cor}08` }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>Resultado</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(r).filter(([k]) => k !== "historico").map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold">
                      {typeof v === "number" && !k.includes("mes") && !k.includes("ano")
                        ? fmtBRL(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal nova simulação — CORRIGIDO para mobile ──────────────────────────────

function NovaSimulacaoModal({ onClose }: { onClose: () => void }) {
  const [tipo, setTipo] = useState<string | null>(null)
  const createMut = useCreateSimulation()

  const handleSave = (params: Record<string, number>, result: Record<string, unknown>) => {
    if (!tipo) return
    createMut.mutate({ simulation_type: tipo, parameters: params, result }, { onSuccess: onClose })
  }

  return (
    <>
      {/* Backdrop — z-[60] fica acima da bottom nav (z-50) */}
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md flex flex-col max-h-[90svh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl">

          {/* Handle mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold">
              {tipo ? TIPOS[tipo]?.label : "Nova Simulação"}
            </h2>
            <div className="flex items-center gap-2">
              {tipo && (
                <button
                  onClick={() => setTipo(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Voltar
                </button>
              )}
              <button
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body com scroll — crítico para formulários longos */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!tipo ? (
              <div className="space-y-2">
                {Object.entries(TIPOS).map(([key, { label, icon: Icon, cor }]) => (
                  <button
                    key={key}
                    onClick={() => setTipo(key)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: `${cor}20` }}>
                      <Icon size={14} style={{ color: cor }} />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            ) : createMut.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : tipo === "juros_compostos" ? (
              <FormJurosCompostos onSave={handleSave} />
            ) : tipo === "prazo_meta" ? (
              <FormPrazoMeta onSave={handleSave} />
            ) : (
              <FormComparacao onSave={handleSave} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SimulacoesPage() {
  const { simulations, isLoading } = useSimulations()
  const deleteMut = useDeleteSimulation()
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {modalOpen && <NovaSimulacaoModal onClose={() => setModalOpen(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Simulações</h1>
          <p className="text-xs text-muted-foreground">
            {simulations.length} simulação{simulations.length !== 1 ? "ões" : ""} salva{simulations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Nova Simulação
        </Button>
      </div>

      {/* Cards de tipos disponíveis */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(TIPOS).map(([, { label, icon: Icon, cor }]) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center">
            <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: `${cor}20` }}>
              <Icon size={14} style={{ color: cor }} />
            </div>
            <span className="text-[11px] font-medium leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Simulações salvas */}
      {simulations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma simulação salva ainda.</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Criar primeira simulação
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salvas</h2>
          {[...simulations]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map(sim => (
              <ResultCard key={sim.id} sim={sim} onDelete={() => deleteMut.mutate(sim.id)} />
            ))}
        </div>
      )}
    </div>
  )
}