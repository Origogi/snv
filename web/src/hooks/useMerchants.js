import { useState, useCallback, useRef } from 'react'
import { initialLoad, loadCategories, clearCache, getLastUpdatedAt, getCategoryCounts } from '../lib/merchantCache'

const DEFAULT_CATEGORIES = ['음식점']

/**
 * 가맹점 데이터 로딩 훅 (점진적 로딩)
 *
 * IndexedDB 캐시 + Supabase 연동
 * - 초기 로드: 기본 카테고리(음식점)만 로드
 * - 카테고리 추가 시: 해당 카테고리만 추가 로드
 * - 캐시된 카테고리는 재사용
 */
export function useMerchants() {
  const [merchants, setMerchants] = useState([])
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [categoryCounts, setCategoryCounts] = useState({})
  const [status, setStatus] = useState({
    loading: true,
    source: null,
    message: '초기화 중...'
  })

  // 현재 로드된 카테고리 추적
  const loadedCategoriesRef = useRef(new Set())

  // 초기 데이터 로드 함수 (외부에서 트리거)
  const startInitialLoad = useCallback(() => {
    // 1. 기본 카테고리 데이터 로드
    initialLoad(DEFAULT_CATEGORIES, (data) => {
      setMerchants(data)
      loadedCategoriesRef.current = new Set(DEFAULT_CATEGORIES)
    }, setStatus)

    // 2. 전체 카테고리별 카운트 로드 (로드되지 않은 카테고리도 개수 표시용)
    getCategoryCounts().then(counts => {
      if (counts) setCategoryCounts(counts)
    })

    // 3. 마지막 업데이트 시간 로드
    getLastUpdatedAt().then(setLastUpdatedAt)
  }, [])

  // 카테고리 변경 시 데이터 로드
  const loadByCategories = useCallback(async (categories) => {
    if (!categories || categories.length === 0) return

    // 이미 로드된 카테고리 필터링
    const needToLoad = categories.filter(cat => !loadedCategoriesRef.current.has(cat))

    if (needToLoad.length === 0) {
      // 모든 카테고리가 이미 로드됨 - 필터링만 수행
      return
    }

    // 새 카테고리 로드
    const newData = await loadCategories(needToLoad, setStatus)

    // 로드된 카테고리 추적 업데이트
    needToLoad.forEach(cat => loadedCategoriesRef.current.add(cat))

    // 기존 데이터에 새 데이터 추가
    setMerchants(prev => [...prev, ...newData])
  }, [])

  // 수동 새로고침
  const refresh = useCallback(async () => {
    await clearCache()
    setMerchants([])
    loadedCategoriesRef.current = new Set()
    setStatus({ loading: true, source: null, message: '새로고침 중...' })
    await initialLoad(DEFAULT_CATEGORIES, (data) => {
      setMerchants(data)
      loadedCategoriesRef.current = new Set(DEFAULT_CATEGORIES)
    }, setStatus)
  }, [])

  return {
    merchants,
    loading: status.loading,
    source: status.source,
    message: status.message,
    lastUpdatedAt,
    categoryCounts,
    refresh,
    loadByCategories,
    startInitialLoad
  }
}
