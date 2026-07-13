import { describe, it, expect, beforeEach } from 'vitest'
import { projectsService } from '@/services/projects.service'

beforeEach(() => localStorage.clear())

describe('projectsService', () => {
  it('returns all projects', () => {
    const projects = projectsService.getAll()
    expect(projects.length).toBeGreaterThanOrEqual(3)
  })

  it('gets by id', () => {
    const project = projectsService.getById('p1')
    expect(project).not.toBeNull()
    expect(project!.name).toBe('Verdana Residence')
  })

  it('creates a project', () => {
    const p = projectsService.create({
      id: '', name: 'New Proj', location: 'Dubai', type: 'Apartments',
      status: 'Off-plan', completionDate: 'Q4 2026', heroImage: null,
      bookingToken: 20000, day7Payment: 30000, primaryColor: '#000',
      secondaryColor: '#fff', whyBuy: ['Great location'], unitTypes: [],
      dpSplitOptions: [1, 2, 3], feeLabel: 'DLD', feePct: 4, feeFixed: 2194,
      utilityAmount: 22000, parkingCost: 0, disclaimer: '',
      masterPlan: null, floorPlans: {},
    })
    expect(p.name).toBe('New Proj')
    expect(projectsService.getAll().length).toBeGreaterThanOrEqual(4)
  })

  it('updates a project', () => {
    const p = projectsService.getById('p1')!
    projectsService.update({ ...p, name: 'Updated Bayz' })
    expect(projectsService.getById('p1')!.name).toBe('Updated Bayz')
  })

  it('deletes a project', () => {
    projectsService.delete('p3')
    expect(projectsService.getById('p3')).toBeUndefined()
  })
})
