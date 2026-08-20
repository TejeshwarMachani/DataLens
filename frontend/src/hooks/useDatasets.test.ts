import { renderHook, act } from '@testing-library/react'
import { useDatasets } from '@/hooks/useDatasets'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Mock the API
jest.mock('@/lib/api', () => ({
  datasetApi: {
    list: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
    profile: jest.fn(),
    getProfile: jest.fn(),
    getProfileHtml: jest.fn(),
    getProfileSummary: jest.fn(),
    deleteProfile: jest.fn(),
    getSchema: jest.fn(),
    getSample: jest.fn(),
  },
}))

import { datasetApi } from '@/lib/api'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useDatasets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns data when query succeeds', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Test Dataset', status: 'READY' }],
      total: 1,
      page: 1,
      page_size: 20,
    }
    ;(datasetApi.list as jest.Mock).mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useDatasets(), { wrapper: createWrapper() })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles error state', async () => {
    ;(datasetApi.list as jest.Mock).mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useDatasets(), { wrapper: createWrapper() })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.error).toBeDefined()
  })
})