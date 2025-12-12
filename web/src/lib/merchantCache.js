/**
 * 가맹점 데이터 캐시 레이어
 *
 * 전략:
 * 1. IndexedDB에 캐시된 데이터 + 버전(레코드 수) 저장
 * 2. 앱 시작 시 캐시에서 즉시 로드
 * 3. 백그라운드에서 Supabase 버전 체크
 * 4. 버전 다르면 새 데이터 로드 및 캐시 갱신
 */

import { get, set, del } from 'idb-keyval'
import { supabase } from './supabase'

const CACHE_KEY = 'merchants_cache'
const VERSION_KEY = 'merchants_version'

/**
 * Supabase에서 가맹점 수 조회 (버전 체크용)
 */
export async function getSupabaseVersion() {
  try {
    const { count, error } = await supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('버전 체크 실패:', error)
    return null
  }
}

/**
 * Supabase에서 전체 가맹점 데이터 로드
 * Supabase 기본 limit이 1000개이므로 페이지네이션으로 전체 로드
 */
export async function fetchMerchantsFromSupabase() {
  try {
    const PAGE_SIZE = 1000
    let allData = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .range(from, to)

      if (error) throw error

      if (data.length > 0) {
        allData = allData.concat(data)
        page++
      }

      // 더 이상 데이터가 없으면 종료
      hasMore = data.length === PAGE_SIZE
    }

    console.log(`Supabase에서 ${allData.length}개 로드 완료`)

    // DB 스키마를 기존 JSON 형식으로 변환
    return allData.map(row => ({
      name: row.name,
      category: row.category,
      business_type: row.business_type,
      address: row.address,
      coords: {
        lat: row.lat,
        lng: row.lng
      },
      place_id: row.place_id,
      place_url: row.place_url
    }))
  } catch (error) {
    console.error('Supabase 데이터 로드 실패:', error)
    throw error
  }
}

/**
 * IndexedDB에서 캐시된 데이터 로드
 */
export async function getCachedMerchants() {
  try {
    const cached = await get(CACHE_KEY)
    const version = await get(VERSION_KEY)
    return { data: cached || null, version: version || 0 }
  } catch (error) {
    console.error('캐시 로드 실패:', error)
    return { data: null, version: 0 }
  }
}

/**
 * IndexedDB에 데이터 캐시
 */
export async function cacheMerchants(data, version) {
  try {
    await set(CACHE_KEY, data)
    await set(VERSION_KEY, version)
    console.log(`캐시 저장 완료: ${data.length}개, 버전: ${version}`)
  } catch (error) {
    console.error('캐시 저장 실패:', error)
  }
}

/**
 * 캐시 삭제
 */
export async function clearCache() {
  try {
    await del(CACHE_KEY)
    await del(VERSION_KEY)
    console.log('캐시 삭제 완료')
  } catch (error) {
    console.error('캐시 삭제 실패:', error)
  }
}

/**
 * 스마트 데이터 로딩
 *
 * @param {Function} onData - 데이터 로드 콜백
 * @param {Function} onStatus - 상태 업데이트 콜백
 * @returns {Promise<void>}
 */
export async function loadMerchants(onData, onStatus) {
  // 1. 캐시에서 즉시 로드
  onStatus?.({ loading: true, source: 'cache', message: '캐시 확인 중...' })
  const { data: cachedData, version: cachedVersion } = await getCachedMerchants()

  if (cachedData && cachedData.length > 0) {
    onData(cachedData)
    onStatus?.({ loading: true, source: 'cache', message: `캐시에서 ${cachedData.length}개 로드됨` })
  }

  // 2. Supabase 버전 체크
  onStatus?.({ loading: true, source: 'network', message: '서버 확인 중...' })
  const serverVersion = await getSupabaseVersion()

  if (serverVersion === null) {
    // 네트워크 오류 - 캐시 데이터 사용
    if (cachedData) {
      onStatus?.({ loading: false, source: 'cache', message: '오프라인 모드 (캐시 사용)' })
    } else {
      onStatus?.({ loading: false, source: 'error', message: '데이터 로드 실패' })
    }
    return
  }

  // 3. 버전 비교 - 다르면 새로 로드
  if (serverVersion !== cachedVersion) {
    onStatus?.({ loading: true, source: 'network', message: `새 데이터 로드 중... (${serverVersion}개)` })

    try {
      const freshData = await fetchMerchantsFromSupabase()
      await cacheMerchants(freshData, serverVersion)
      onData(freshData)
      onStatus?.({ loading: false, source: 'network', message: `${freshData.length}개 로드 완료` })
    } catch (error) {
      // 네트워크 오류 시 캐시 사용
      if (cachedData) {
        onStatus?.({ loading: false, source: 'cache', message: '네트워크 오류 (캐시 사용)' })
      } else {
        onStatus?.({ loading: false, source: 'error', message: '데이터 로드 실패' })
      }
    }
  } else {
    // 버전 동일 - 캐시 사용
    onStatus?.({ loading: false, source: 'cache', message: `최신 데이터 (${cachedVersion}개)` })
  }
}
