/**
 * useGuestAccess.ts
 *
 * Endpoints consumidos (dono):
 *   GET    /api/v1/guest_access/           → lista convidados
 *   POST   /api/v1/guest_access/           → cria convidado + permissões
 *   PATCH  /api/v1/guest_access/{id}       → atualiza permissões / senha
 *   DELETE /api/v1/guest_access/{id}       → remove convidado
 *
 * Endpoints consumidos (convidado):
 *   GET    /api/v1/guest_access/my-access          → permissões do convidado
 *   GET    /api/v1/guest_access/shared/metas        → metas compartilhadas
 *   GET    /api/v1/guest_access/shared/investimentos → investimentos compartilhados
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"
import type { FinancialGoal } from "./useGoals"
import type { Investment } from "./useInvestments"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestUser {
  id: number
  name: string
  is_guest: boolean
}

export interface GuestAccess {
  id: number
  owner_id: number
  guest_id: number
  guest: GuestUser
  allowed_modules: string[]
  shared_goal_ids: number[]
  shared_investment_ids: number[]
  is_active: boolean
  created_at: string
}

export interface GuestAccessCreate {
  guest_name: string
  guest_password: string
  allowed_modules: string[]
  shared_goal_ids: number[]
  shared_investment_ids: number[]
}

export interface GuestAccessUpdate {
  allowed_modules?: string[]
  shared_goal_ids?: number[]
  shared_investment_ids?: number[]
  is_active?: boolean
  guest_password?: string
}

export interface MyGuestAccess {
  allowed_modules: string[]
  shared_goal_ids: number[]
  shared_investment_ids: number[]
  owner_id: number
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const guestKeys = {
  all:           ["guest_access"] as const,
  myAccess:      ["guest_my_access"] as const,
  sharedGoals:   ["guest_shared_goals"] as const,
  sharedInvs:    ["guest_shared_investments"] as const,
}

// ── Hook: dono gerencia convidados ────────────────────────────────────────────

export function useGuestAccess() {
  const qc = useQueryClient()

  const { data: guests = [], isLoading } = useQuery({
    queryKey: guestKeys.all,
    queryFn: async (): Promise<GuestAccess[]> => {
      const { data } = await api.get(`${BASE}/guest_access/`)
      return data
    },
  })

  const createMut = useMutation({
    mutationFn: async (payload: GuestAccessCreate) => {
      const { data } = await api.post(`${BASE}/guest_access/`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: guestKeys.all }),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, data: payload }: { id: number; data: GuestAccessUpdate }) => {
      const { data } = await api.patch(`${BASE}/guest_access/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: guestKeys.all }),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`${BASE}/guest_access/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: guestKeys.all }),
  })

  return {
    guests,
    isLoading,
    createGuest: createMut.mutateAsync,
    updateGuest: updateMut.mutateAsync,
    deleteGuest: deleteMut.mutate,
    isCreating:  createMut.isPending,
    isUpdating:  updateMut.isPending,
    isDeleting:  deleteMut.isPending,
  }
}

// ── Hook: convidado lê suas permissões ────────────────────────────────────────

export function useMyGuestAccess(enabled: boolean) {
  return useQuery({
    queryKey: guestKeys.myAccess,
    queryFn: async (): Promise<MyGuestAccess> => {
      const { data } = await api.get(`${BASE}/guest_access/my-access`)
      return data
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

// ── Hook: convidado lê metas compartilhadas ───────────────────────────────────

export function useSharedGoals(enabled: boolean) {
  return useQuery({
    queryKey: guestKeys.sharedGoals,
    queryFn: async (): Promise<FinancialGoal[]> => {
      const { data } = await api.get(`${BASE}/guest_access/shared/metas`)
      return data
    },
    enabled,
  })
}

// ── Hook: convidado lê investimentos compartilhados ───────────────────────────

export function useSharedInvestments(enabled: boolean) {
  return useQuery({
    queryKey: guestKeys.sharedInvs,
    queryFn: async (): Promise<Investment[]> => {
      const { data } = await api.get(`${BASE}/guest_access/shared/investimentos`)
      return data
    },
    enabled,
  })
}
