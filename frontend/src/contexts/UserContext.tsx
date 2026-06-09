/**
 * UserContext.tsx
 *
 * Contexto global que carrega /api/v1/users/me UMA vez no _layout
 * e disponibiliza is_guest + dados do usuário para toda a árvore de componentes.
 *
 * Uso:
 *   const { isGuest, userId } = useUserContext()
 */
import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"
import { isLoggedIn } from "@/hooks/useAuth"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CurrentUserInfo {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
  is_guest: boolean
}

interface UserContextValue {
  user: CurrentUserInfo | null
  isGuest: boolean
  isLoading: boolean
}

// ── Context ───────────────────────────────────────────────────────────────────

export const UserContext = createContext<UserContextValue>({
  user: null,
  isGuest: false,
  isLoading: true,
})

export function useUserContext() {
  return useContext(UserContext)
}

// ── Hook que busca o usuário atual ────────────────────────────────────────────

export function useCurrentUserQuery() {
  return useQuery<CurrentUserInfo>({
    queryKey: ["currentUserInfo"],
    queryFn: async () => {
      const { data } = await api.get(`${BASE}/users/me`)
      return data
    },
    enabled: isLoggedIn(),
    staleTime: 5 * 60 * 1000,
  })
}