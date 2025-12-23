import { useState, useCallback, useEffect } from 'react'
import { merchantRepository } from '../lib/MerchantRepository'

/**
 * 가맹점 데이터 로딩 훅
 *
 * MerchantRepository를 React 상태와 연결
 * - visibleMerchants 구독
 * - 로딩 상태 구독
 * - 카테고리 필터 API
 * - 검색 API
 */
export function useMerchants() {
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('초기화 중...')
  const [categoryCounts, setCategoryCounts] = useState({})
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  // Repository 구독 설정
  useEffect(() => {
    // visibleMerchants 구독
    const unsubscribeMerchants = merchantRepository.subscribe((visibleMerchants) => {
      setMerchants(visibleMerchants)
    })

    // 로딩 상태 구독
    const unsubscribeStatus = merchantRepository.subscribeStatus((status) => {
      setLoading(status.loading)
      setMessage(status.message)
    })

    return () => {
      unsubscribeMerchants()
      unsubscribeStatus()
    }
  }, [])

  // 초기 데이터 로드
  const startInitialLoad = useCallback(async () => {
    await merchantRepository.initialize()
    setCategoryCounts(merchantRepository.categoryCounts)
    setLastUpdatedAt(merchantRepository.lastUpdatedAt)
  }, [])

  // 카테고리 변경 시 데이터 로드
  const loadByCategories = useCallback(async (categories) => {
    await merchantRepository.setCategories(categories)
  }, [])

  // DB에서 검색
  const search = useCallback(async (query) => {
    await merchantRepository.search(query)
  }, [])

  // 검색 결과 초기화
  const clearSearch = useCallback(() => {
    merchantRepository.clearSearch()
  }, [])

  // 수동 새로고침
  const refresh = useCallback(async () => {
    await merchantRepository.refresh()
  }, [])

  return {
    merchants,
    loading,
    message,
    lastUpdatedAt,
    categoryCounts,
    refresh,
    loadByCategories,
    startInitialLoad,
    search,
    clearSearch
  }
}
