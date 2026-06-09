/**
 * useCurrentUser.ts
 *
 * Hook que lê os dados do usuário atual via /api/v1/users/me
 * e expõe `is_guest` para controle de acesso no frontend.
 *
 * Usado em conjunto com useAuth (que também busca o usuário,
 * mas pelo client gerado que não inclui is_guest).
 */
import { useQuery } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"
import { isLoggedIn } from "@/hooks/useAuth"

export interface CurrentUserInfo {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
  is_guest: boolean
}

export function useCurrentUser() {
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
