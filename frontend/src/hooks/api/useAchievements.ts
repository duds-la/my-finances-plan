/**
 * useAchievements.ts
 *
 * Endpoints consumidos:
 *   GET /api/v1/achievement/          → todas as conquistas do sistema
 *   GET /api/v1/user_achievement/     → conquistas desbloqueadas pelo usuário
 *
 * Schemas:
 *   Achievement_Schema_Response:
 *     id, code, title, description, icon, points
 *
 *   User_Achievement_Schema_Response:
 *     id, user_id, achievement_id, unlocked_at
 */
import { useQuery } from "@tanstack/react-query"
import { api, BASE } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: number
  code: string
  title: string
  description?: string
  icon?: string
  points: number
}

export interface UserAchievement {
  id: number
  user_id: number
  achievement_id: number
  unlocked_at: string
}

export interface AchievementEnriched extends Achievement {
  unlocked: boolean
  unlocked_at?: string
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const achievementKeys = {
  all: ["achievements"] as const,
  userAchievements: ["user_achievements"] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAchievements() {
  const { data: all = [], isLoading: loadingAll } = useQuery({
    queryKey: achievementKeys.all,
    queryFn: async (): Promise<Achievement[]> => {
      const { data } = await api.get(`${BASE}/achievement/`)
      return data
    },
  })

  const { data: unlocked = [], isLoading: loadingUnlocked } = useQuery({
    queryKey: achievementKeys.userAchievements,
    queryFn: async (): Promise<UserAchievement[]> => {
      const { data } = await api.get(`${BASE}/user_achievement/`)
      return data
    },
  })

  const unlockedIds = new Set(unlocked.map((u) => u.achievement_id))

  const enriched: AchievementEnriched[] = all.map((a) => {
    const userEntry = unlocked.find((u) => u.achievement_id === a.id)
    return {
      ...a,
      unlocked: unlockedIds.has(a.id),
      unlocked_at: userEntry?.unlocked_at,
    }
  })

  const desbloqueadas = enriched.filter((a) => a.unlocked)
  const bloqueadas = enriched.filter((a) => !a.unlocked)
  const totalPontos = desbloqueadas.reduce((s, a) => s + a.points, 0)

  return {
    achievements: enriched,
    desbloqueadas,
    bloqueadas,
    totalPontos,
    isLoading: loadingAll || loadingUnlocked,
  }
}
