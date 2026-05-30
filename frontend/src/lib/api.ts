/**
 * api.ts — cliente Axios central
 * Lê o token do localStorage (mesmo padrão do OpenAPI.TOKEN já existente no main.tsx)
 * e injeta em todos os requests.
 */
import axios from "axios"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("access_token")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  },
)

/** Prefixo da API — já definido em app/main.py como /api/v1 */
export const BASE = "/api/v1"
