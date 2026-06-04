/**
 * useSimulations.ts
 *
 * Endpoints consumidos:
 *   GET    /api/v1/simulation/           → lista simulações do usuário
 *   POST   /api/v1/simulation/           → cria simulação
 *   GET    /api/v1/simulation/filter?simulation_type=X → filtra por tipo
 *   DELETE /api/v1/simulation/{id}       → remove simulação
 *
 * Schemas:
 *   Simulation_Schema_Response:
 *     id, user_id, simulation_type, parameters (JSON), result (JSON|null), created_at
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Simulation {
  id: number
  user_id: number
  simulation_type: string
  parameters: Record<string, unknown>
  result: Record<string, unknown> | null
  created_at: string
}

export interface SimulationCreate {
  simulation_type: string
  parameters: Record<string, unknown>
  result?: Record<string, unknown>
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const simulationKeys = {
  all: ["simulations"] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useSimulations() {
  const { data: simulations = [], isLoading } = useQuery({
    queryKey: simulationKeys.all,
    queryFn: async (): Promise<Simulation[]> => {
      const { data } = await api.get(`${BASE}/simulation/`)
      return data
    },
  })

  return { simulations, isLoading }
}

export function useCreateSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SimulationCreate) =>
      api.post(`${BASE}/simulation/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: simulationKeys.all }),
  })
}

export function useDeleteSimulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete(`${BASE}/simulation/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: simulationKeys.all }),
  })
}
