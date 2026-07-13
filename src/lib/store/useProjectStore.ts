import { create } from 'zustand'
import { apiClient } from '@/lib/api/apiClient'
import type { Project } from '@/types'

interface ProjectPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ProjectState {
  projects: Project[]
  loading: boolean
  error: string | null
  pagination: ProjectPagination | null
  fetchProjects: (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
  }) => Promise<void>
  fetchProjectById: (id: string) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>
  createProject: (data: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,
  pagination: null,

  fetchProjects: async (params) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{
        success: boolean
        data: {
          projects: any[]
          pagination: ProjectPagination
        }
      }>('projects', { params })

      if (response.data.success) {
        set({
          projects: response.data.data.projects,
          pagination: response.data.data.pagination,
        })
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch projects'
      set({ error: msg })
    } finally {
      set({ loading: false })
    }
  },

  fetchProjectById: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{
        success: boolean
        data: {
          project: Project
        }
      }>(`projects/${id}`)
      if (response.data.success) {
        return response.data.data.project
      }
      throw new Error('Project details not returned successfully')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch project details'
      set({ error: msg })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  updateProject: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.put<{
        success: boolean
        data: {
          project: Project
        }
      }>(`projects/${id}`, data)
      if (response.data.success) {
        set((state) => ({
          projects: state.projects.map((p) => p.id === id ? { ...p, ...response.data.data.project } : p)
        }))
        return response.data.data.project
      }
      throw new Error('Project update failed')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update project'
      set({ error: msg })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  createProject: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post<{
        success: boolean
        data: {
          project: Project
        }
      }>('projects', data)
      if (response.data.success) {
        set((state) => ({
          projects: [...state.projects, response.data.data.project]
        }))
        return response.data.data.project
      }
      throw new Error('Project creation failed')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create project'
      set({ error: msg })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.delete<{ success: boolean; message?: string }>(`projects/${id}`)
      if (response.data.success) {
        // Remove from list or trigger refresh
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }))
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete project'
      set({ error: msg })
      throw err
    } finally {
      set({ loading: false })
    }
  },
}))
