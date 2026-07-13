import { describe, it, expect, vi, beforeEach } from 'vitest'
import { offerHistoryService } from '@/services/offerHistory.service'
import { apiClient } from '@/lib/api/apiClient'

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockOffer = {
  id: 'o1',
  date: new Date().toISOString(),
  agentId: 'u1',
  agentName: 'Agent',
  clientName: 'Test',
  clientPhone: '',
  projectName: 'Proj',
  unitNumber: '101',
  unitType: '',
  planLabel: 'Standard',
  offerMode: 'normal',
  discount: 5,
  netPrice: 500000,
  type: 'single',
  action: 'generated',
}

describe('offerHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAll calls GET /offers with params', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          offers: [mockOffer],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      },
    }
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

    const result = await offerHistoryService.getAll({ limit: 20 })
    expect(apiClient.get).toHaveBeenCalledWith('offers', { params: { limit: 20 } })
    expect(result.success).toBe(true)
    expect(result.data.offers).toHaveLength(1)
  })

  it('create calls POST /offers with entry data', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { offer: mockOffer },
      },
    }
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

    const result = await offerHistoryService.create({
      projectName: 'Proj',
      unitNumber: '101',
      planLabel: 'Standard',
      clientName: 'Test',
      listPrice: 500000,
      netPrice: 500000,
    })
    expect(apiClient.post).toHaveBeenCalledWith('offers', {
      projectName: 'Proj',
      unitNumber: '101',
      planLabel: 'Standard',
      clientName: 'Test',
      listPrice: 500000,
      netPrice: 500000,
    })
    expect(result.success).toBe(true)
  })
})
