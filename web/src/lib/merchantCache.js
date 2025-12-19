/**
 * 가맹점 데이터 캐시 레이어
 *
 * 전략 (점진적 로딩):
 * 1. 카테고리별로 데이터를 분리 저장
 * 2. 앱 시작 시 기본 카테고리(음식점)만 로드
 * 3. 사용자가 새 카테고리 선택 시 해당 데이터 로드
 * 4. 로드된 카테고리는 캐시하여 재사용
 */

import { get, set, del, keys } from 'idb-keyval'
import { supabase } from './supabase'

const CACHE_PREFIX = 'merchants_v3_'
const VERSION_KEY = 'merchants_v3_version'
const LOADED_CATEGORIES_KEY = 'merchants_v3_loaded'

/**
 * 카테고리별 캐시 키 생성
 */
function getCacheKey(category) {
  return `${CACHE_PREFIX}${category}`
}

/**
 * Supabase에서 전체 가맹점 수 조회 (버전 체크용)
 */
export async function getSupabaseVersion() {
  try {
    const { count, error } = await supabase
      .from('merchants_v2')
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('버전 체크 실패:', error)
    return null
  }
}

/**
 * Supabase에서 카테고리별 가맹점 수 조회
 */
export async function getCategoryCounts() {
  try {
    const { data, error } = await supabase
      .rpc('get_category_counts')

    if (error) {
      // RPC 함수가 없으면 직접 쿼리
      console.warn('RPC 함수 없음, 직접 쿼리 시도:', error)
      return await getCategoryCountsDirect()
    }

    // { business_type: count } 형태로 변환
    const counts = {}
    data.forEach(row => {
      counts[row.business_type] = row.count
    })
    return counts
  } catch (error) {
    console.error('카테고리 카운트 조회 실패:', error)
    return null
  }
}

/**
 * 직접 쿼리로 카테고리별 가맹점 수 조회 (RPC 없을 때)
 * 페이지네이션으로 전체 데이터를 가져와 집계
 */
async function getCategoryCountsDirect() {
  try {
    const PAGE_SIZE = 1000
    const counts = {}
    let page = 0
    let hasMore = true

    while (hasMore) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('merchants_v2')
        .select('business_type')
        .range(from, to)

      if (error) throw error

      // 클라이언트에서 집계
      data.forEach(row => {
        counts[row.business_type] = (counts[row.business_type] || 0) + 1
      })

      hasMore = data.length === PAGE_SIZE
      page++
    }

    console.log('카테고리 카운트 직접 조회 완료:', counts)
    return counts
  } catch (error) {
    console.error('카테고리 카운트 직접 조회 실패:', error)
    return null
  }
}

/**
 * Supabase에서 마지막 업데이트 시간 조회
 */
export async function getLastUpdatedAt() {
  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('value')
      .eq('key', 'last_updated')
      .single()

    if (error) throw error
    return data?.value || null
  } catch (error) {
    console.error('마지막 업데이트 시간 조회 실패:', error)
    return null
  }
}

/**
 * Supabase에서 특정 카테고리 데이터 로드
 */
export async function fetchMerchantsByCategory(category) {
  try {
    const PAGE_SIZE = 1000
    let allData = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('merchants_v2')
        .select('*')
        .eq('business_type', category)
        .range(from, to)

      if (error) throw error

      if (data.length > 0) {
        allData = allData.concat(data)
        page++
      }

      hasMore = data.length === PAGE_SIZE
    }

    console.log(`[${category}] ${allData.length}개 로드 완료`)

    return allData.map(row => ({
      name: row.name,
      category: row.category,
      business_type: row.business_type,
      address: row.address,
      address_detail: row.address_detail,
      coords: {
        lat: row.lat,
        lng: row.lng
      },
      place_id: row.place_id,
      place_url: row.place_url
    }))
  } catch (error) {
    console.error(`[${category}] 데이터 로드 실패:`, error)
    throw error
  }
}

/**
 * Supabase에서 여러 카테고리 데이터 로드
 */
export async function fetchMerchantsByCategories(categories) {
  try {
    const PAGE_SIZE = 1000
    let allData = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('merchants_v2')
        .select('*')
        .in('business_type', categories)
        .range(from, to)

      if (error) throw error

      if (data.length > 0) {
        allData = allData.concat(data)
        page++
      }

      hasMore = data.length === PAGE_SIZE
    }

    console.log(`[${categories.join(', ')}] 총 ${allData.length}개 로드 완료`)

    return allData.map(row => ({
      name: row.name,
      category: row.category,
      business_type: row.business_type,
      address: row.address,
      address_detail: row.address_detail,
      coords: {
        lat: row.lat,
        lng: row.lng
      },
      place_id: row.place_id,
      place_url: row.place_url
    }))
  } catch (error) {
    console.error('데이터 로드 실패:', error)
    throw error
  }
}

/**
 * IndexedDB에서 카테고리별 캐시 로드
 */
export async function getCachedCategory(category) {
  try {
    const cached = await get(getCacheKey(category))
    return cached || null
  } catch (error) {
    console.error(`[${category}] 캐시 로드 실패:`, error)
    return null
  }
}

/**
 * IndexedDB에 카테고리별 데이터 캐시
 */
export async function cacheCategory(category, data) {
  try {
    await set(getCacheKey(category), data)

    // 로드된 카테고리 목록 업데이트
    const loaded = (await get(LOADED_CATEGORIES_KEY)) || []
    if (!loaded.includes(category)) {
      loaded.push(category)
      await set(LOADED_CATEGORIES_KEY, loaded)
    }

    console.log(`[${category}] 캐시 저장 완료: ${data.length}개`)
  } catch (error) {
    console.error(`[${category}] 캐시 저장 실패:`, error)
  }
}

/**
 * 로드된 카테고리 목록 조회
 */
export async function getLoadedCategories() {
  try {
    return (await get(LOADED_CATEGORIES_KEY)) || []
  } catch (error) {
    return []
  }
}

/**
 * 전체 캐시 삭제
 */
export async function clearCache() {
  try {
    const allKeys = await keys()
    const cacheKeys = allKeys.filter(key =>
      typeof key === 'string' && key.startsWith(CACHE_PREFIX)
    )

    for (const key of cacheKeys) {
      await del(key)
    }
    await del(VERSION_KEY)
    await del(LOADED_CATEGORIES_KEY)

    console.log('캐시 삭제 완료')
  } catch (error) {
    console.error('캐시 삭제 실패:', error)
  }
}

/**
 * 캐시 버전 조회
 */
export async function getCachedVersion() {
  try {
    return (await get(VERSION_KEY)) || 0
  } catch (error) {
    return 0
  }
}

/**
 * 캐시 버전 저장
 */
export async function setCachedVersion(version) {
  try {
    await set(VERSION_KEY, version)
  } catch (error) {
    console.error('버전 저장 실패:', error)
  }
}

/**
 * 카테고리 데이터 로드 (캐시 우선)
 *
 * @param {string} category - 로드할 카테고리
 * @param {Function} onStatus - 상태 콜백
 * @returns {Promise<Array>} 가맹점 데이터
 */
export async function loadCategory(category, onStatus) {
  // 1. 캐시 확인
  const cached = await getCachedCategory(category)
  if (cached && cached.length > 0) {
    console.log(`[${category}] 캐시에서 ${cached.length}개 로드`)
    return cached
  }

  // 2. 서버에서 로드
  onStatus?.({ loading: true, message: `${category} 데이터 로드 중...` })

  try {
    const data = await fetchMerchantsByCategory(category)
    await cacheCategory(category, data)
    onStatus?.({ loading: false, message: `${category} ${data.length}개 로드 완료` })
    return data
  } catch (error) {
    onStatus?.({ loading: false, message: `${category} 로드 실패` })
    return []
  }
}

/**
 * 여러 카테고리 데이터 로드 (캐시 우선, 없는 것만 서버에서)
 *
 * @param {string[]} categories - 로드할 카테고리들
 * @param {Function} onStatus - 상태 콜백
 * @returns {Promise<Array>} 가맹점 데이터
 */
export async function loadCategories(categories, onStatus) {
  const results = []
  const needToFetch = []

  // 1. 캐시된 데이터 수집
  for (const category of categories) {
    const cached = await getCachedCategory(category)
    if (cached && cached.length > 0) {
      results.push(...cached)
      console.log(`[${category}] 캐시에서 ${cached.length}개 로드`)
    } else {
      needToFetch.push(category)
    }
  }

  // 2. 캐시에 없는 카테고리만 서버에서 로드
  if (needToFetch.length > 0) {
    onStatus?.({ loading: true, message: `${needToFetch.join(', ')} 데이터 로드 중...` })

    try {
      const freshData = await fetchMerchantsByCategories(needToFetch)

      // 카테고리별로 분리하여 캐시
      for (const category of needToFetch) {
        const categoryData = freshData.filter(m => m.business_type === category)
        await cacheCategory(category, categoryData)
      }

      results.push(...freshData)
      onStatus?.({ loading: false, message: '로드 완료' })
    } catch (error) {
      onStatus?.({ loading: false, message: '로드 실패' })
    }
  }

  return results
}

/**
 * 초기 로딩 (기본 카테고리 + 버전 체크)
 *
 * @param {string[]} defaultCategories - 기본 카테고리
 * @param {Function} onData - 데이터 콜백
 * @param {Function} onStatus - 상태 콜백
 */
export async function initialLoad(defaultCategories, onData, onStatus) {
  onStatus?.({ loading: true, source: 'cache', message: '초기화 중...' })

  // 1. 서버 버전 체크
  const serverVersion = await getSupabaseVersion()
  const cachedVersion = await getCachedVersion()

  // 버전이 다르면 캐시 초기화
  if (serverVersion !== null && serverVersion !== cachedVersion) {
    console.log(`버전 변경 감지: ${cachedVersion} → ${serverVersion}`)
    await clearCache()
    await setCachedVersion(serverVersion)
  }

  // 2. 기본 카테고리 로드
  const data = await loadCategories(defaultCategories, onStatus)
  onData(data)

  onStatus?.({
    loading: false,
    source: data.length > 0 ? 'cache' : 'network',
    message: `${data.length}개 로드 완료`
  })
}

// 레거시 호환성을 위한 함수 (기존 코드와 호환)
export async function loadMerchants(onData, onStatus) {
  await initialLoad(['음식점'], onData, onStatus)
}
