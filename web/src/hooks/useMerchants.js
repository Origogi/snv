import { useState, useCallback, useEffect } from 'react'
import { merchantRepository } from '../lib/MerchantRepository'

/**
 * 가맹점 데이터를 관리하는 커스텀 훅
 *
 * MerchantRepository를 React 컴포넌트 생명주기와 연결합니다.
 * - 가맹점 목록(전체/필터링됨) 구독 및 상태 업데이트
 * - 데이터 로딩 및 초기화 상태 관리
 * - 카테고리 필터링 및 검색 인터페이스 제공
 *
 * @returns {Object} 가맹점 데이터 및 제어 함수들
 */
export function useMerchants() {
  const [allMerchants, setAllMerchants] = useState([])
  const [visibleMerchants, setVisibleMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('초기화 중...')
  const [categoryCounts, setCategoryCounts] = useState({})
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  // MerchantRepository 상태 변화를 감지하여 React 상태를 동기화합니다.
  useEffect(() => {
    // 로드된 모든 가맹점 (마커 생성용)
    const unsubscribeAll = merchantRepository.subscribeAll((merchants) => {
      setAllMerchants(merchants)
    })

    // 현재 화면에 표시될 가맹점 (검색/필터 결과)
    const unsubscribeVisible = merchantRepository.subscribe((merchants) => {
      setVisibleMerchants(merchants)
    })

    // 데이터 로딩 상태 및 메시지
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

  // 초기 가맹점 데이터(인덱스 및 메타데이터)를 로드합니다.
  const startInitialLoad = useCallback(async () => {
    await merchantRepository.initialize()
    setCategoryCounts(merchantRepository.categoryCounts)
    setLastUpdatedAt(merchantRepository.lastUpdatedAt)
  }, [])

  // 선택된 카테고리에 해당하는 가맹점 데이터를 로드하고 필터를 적용합니다.
  const loadByCategories = useCallback(async (categories) => {
    await merchantRepository.setCategories(categories)
  }, [])

  // 입력된 쿼리로 가맹점 검색(이름, 주소, 업종)을 수행합니다.
  const search = useCallback(async (query) => {
    await merchantRepository.search(query)
  }, [])

  // 적용된 검색 결과를 초기화하고 필터링 상태로 복구합니다.
  const clearSearch = useCallback(() => {
    merchantRepository.clearSearch()
  }, [])

  // 원격 서버로부터 데이터를 새로고침합니다.
  const refresh = useCallback(async () => {
    await merchantRepository.refresh()
  }, [])

  return {
    allMerchants,      // 로드된 모든 가맹점 (마커 전체 표시용)
    visibleMerchants,  // 현재 조건에 부합하는 가맹점 (리스트/활성 마커용)
    loading,           // 로딩 중 여부
    message,           // 로딩 상태 메시지
    lastUpdatedAt,     // 데이터 최종 업데이트 일자
    categoryCounts,    // 카테고리별 가맹점 수
    refresh,           // 데이터 새로고침 함수
    loadByCategories,  // 카테고리 필터 변경 함수
    startInitialLoad,  // 초기화 시작 함수
    search,            // 검색 실행 함수
    clearSearch        // 검색 초기화 함수
  }
}
