import { useState, useEffect, useCallback } from 'react'
import { loadMerchants, clearCache } from '../lib/merchantCache'

/**
 * 가맹점 데이터 로딩 훅
 *
 * IndexedDB 캐시 + Supabase 연동
 * - 캐시에서 즉시 로드 (오프라인 지원)
 * - 백그라운드에서 서버 버전 체크
 * - 새 데이터 있으면 자동 갱신
 */
export function useMerchants() {
  const [merchants, setMerchants] = useState([])
  const [status, setStatus] = useState({
    loading: true,
    source: null,
    message: '초기화 중...'
  })

  // 데이터 로드
  useEffect(() => {
    loadMerchants(setMerchants, setStatus)
  }, [])

  // 수동 새로고침
  const refresh = useCallback(async () => {
    await clearCache()
    setMerchants([])
    setStatus({ loading: true, source: null, message: '새로고침 중...' })
    await loadMerchants(setMerchants, setStatus)
  }, [])

  return {
    merchants,
    loading: status.loading,
    source: status.source,
    message: status.message,
    refresh
  }
}
