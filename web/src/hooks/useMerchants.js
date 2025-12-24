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
  const [allMerchants, setAllMerchants] = useState([])
  const [visibleMerchants, setVisibleMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('초기화 중...')
  const [categoryCounts, setCategoryCounts] = useState({})
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  // Repository 구독 설정
  useEffect(() => {
    // allMerchants 구독 (로드된 모든 가맹점)
    const unsubscribeAll = merchantRepository.subscribeAll((merchants) => {
      setAllMerchants(merchants)
    })

    // visibleMerchants 구독 (검색/필터 적용)
    const unsubscribeVisible = merchantRepository.subscribe((merchants) => {
      setVisibleMerchants(merchants)
    })

    // 로딩 상태 구독
    const unsubscribeStatus = merchantRepository.subscribeStatus((status) => {
      setLoading(status.loading)
      setMessage(status.message)
    })

    return () => {
      unsubscribeAll()
      unsubscribeVisible()
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
    allMerchants,      // 로드된 모든 가맹점 (마커 생성용)
    visibleMerchants,  // 검색/필터 적용된 가맹점 (마커 필터링 + 클릭용)
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
