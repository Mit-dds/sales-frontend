import type { OfferHistory } from '@/types'
import { apiClient } from '@/lib/api/apiClient'

type GetOffersParams = {
  page?: number
  limit?: number
  search?: string
  projectId?: string
  offerMode?: string
  agentName?: string
  sortBy?: 'createdAt' | 'clientName' | 'projectName' | 'netPrice'
  sortDir?: 'asc' | 'desc'
}

type GetOffersResponse = {
  success: boolean
  data: {
    offers: OfferHistory[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    stats: {
      totalOffers: number
      thisMonth: number
      singleOffers: number
      multiPlan: number
    }
  }
}

type CreateOfferResponse = {
  success: boolean
  data: {
    offer: OfferHistory
  }
}

export const offerHistoryService = {
  async getAll(params: GetOffersParams = {}): Promise<GetOffersResponse> {
    const res = await apiClient.get<GetOffersResponse>('offers', { params })
    return res.data
  },

  async create(entry: Record<string, unknown>): Promise<CreateOfferResponse> {
    const res = await apiClient.post<CreateOfferResponse>('offers', entry)
    return res.data
  },
}
