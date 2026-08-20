import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

// API functions
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string, name?: string) =>
    api.post("/auth/register", { email, password, name }),
  me: () => api.get("/auth/me"),
}

export const datasetApi = {
  upload: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData()
    formData.append("file", file)
    return api.post("/datasets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        }
      },
    })
  },
  list: (page = 1, pageSize = 20) =>
    api.get("/datasets", { params: { page, page_size: pageSize } }),
  get: (id: string) => api.get(`/datasets/${id}`),
  delete: (id: string) => api.delete(`/datasets/${id}`),
  profile: (id: string) => api.post(`/datasets/${id}/profile`),
  getProfile: (id: string) => api.get(`/datasets/${id}/profile`),
  getProfileHtml: (id: string) =>
    api.get(`/datasets/${id}/profile/html`, { responseType: "blob" }),
  getProfileSummary: (id: string) => api.get(`/datasets/${id}/profile/summary`),
  deleteProfile: (id: string) => api.delete(`/datasets/${id}/profile`),
  getSchema: (id: string) => api.get(`/query/datasets/${id}/schema`),
  getSample: (id: string, limit = 10) => api.get(`/query/datasets/${id}/sample`, { params: { limit } }),
}

export const queryApi = {
  execute: (sql: string, datasetId: string, limit = 10000, offset = 0) =>
    api.post("/query/query", { sql, dataset_id: datasetId, limit, offset }),
  nlQuery: (question: string, datasetId: string, chartSuggestion = true, model?: string) =>
    api.post("/query/nl-query", { question, dataset_id: datasetId, chart_suggestion: chartSuggestion, model }),
  getNLQueryHistory: (datasetId: string, page = 1, pageSize = 20) =>
    api.get("/query/nl-query/history", { params: { dataset_id: datasetId, page, page_size: pageSize } }),
}

export const chartApi = {
  list: (datasetId?: string, page = 1, pageSize = 20) =>
    api.get("/charts", { params: { dataset_id: datasetId, page, page_size: pageSize } }),
  get: (id: string) => api.get(`/charts/${id}`),
  create: (data: any) => api.post("/charts", data),
  update: (id: string, data: any) => api.put(`/charts/${id}`, data),
  delete: (id: string) => api.delete(`/charts/${id}`),
  render: (id: string, limit = 10000) => api.post(`/charts/${id}/render`, { limit }),
  renderSpec: (spec: any, datasetId: string, limit = 10000) =>
    api.post("/charts/render", { spec, dataset_id: datasetId, limit }),
}

export const dashboardApi = {
  list: (page = 1, pageSize = 20) =>
    api.get("/dashboards", { params: { page, page_size: pageSize } }),
  get: (id: string) => api.get(`/dashboards/${id}`),
  getShared: (token: string) => api.get(`/dashboards/share/${token}`),
  create: (data: any) => api.post("/dashboards", data),
  update: (id: string, data: any) => api.put(`/dashboards/${id}`, data),
  delete: (id: string) => api.delete(`/dashboards/${id}`),
  createShare: (id: string, expiresAt?: string) => api.post(`/dashboards/${id}/share`, { expires_at: expiresAt }),
  removeShare: (id: string) => api.delete(`/dashboards/${id}/share`),
  addItem: (dashboardId: string, item: any) => api.post(`/dashboards/${dashboardId}/items`, item),
  updateItem: (dashboardId: string, itemId: string, item: any) => api.put(`/dashboards/${dashboardId}/items/${itemId}`, item),
  deleteItem: (dashboardId: string, itemId: string) => api.delete(`/dashboards/${dashboardId}/items/${itemId}`),
}