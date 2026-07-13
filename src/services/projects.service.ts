import type { Project } from '@/types'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { INITIAL_PROJECTS } from '@/mocks'

export const projectsService = {
  getAll(): Project[] {
    const stored = storage.get<Project[]>(STORAGE_KEYS.PROJECTS)
    if (!stored) {
      storage.set(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS)
      return INITIAL_PROJECTS
    }
    return stored
  },

  getById(id: string): Project | undefined {
    return this.getAll().find(p => p.id === id)
  },

  create(project: Project): Project {
    const projects = this.getAll()
    projects.push(project)
    storage.set(STORAGE_KEYS.PROJECTS, projects)
    return project
  },

  update(project: Project): Project {
    const projects = this.getAll()
    const index = projects.findIndex(p => p.id === project.id)
    if (index !== -1) {
      projects[index] = project
      storage.set(STORAGE_KEYS.PROJECTS, projects)
    }
    return project
  },

  delete(id: string): void {
    const projects = this.getAll().filter(p => p.id !== id)
    storage.set(STORAGE_KEYS.PROJECTS, projects)
  },
}
