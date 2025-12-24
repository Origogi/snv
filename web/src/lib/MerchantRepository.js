/**
 * MerchantRepository
 *
 * 가맹점 데이터 관리 레포지토리
 * - 카테고리별 캐시 관리
 * - Observable visible merchants
 * - 카테고리 필터 API
 * - 검색 API (DB 직접 조회)
 */

import { get, set, del, keys } from 'idb-keyval'
import { supabase } from './supabase'

const CACHE_PREFIX = 'merchants_v3_'
const VERSION_KEY = 'merchants_v3_version'
const DEFAULT_CATEGORIES = ['음식점']

/**
 * @typedef {Object} Merchant
 * @property {string} name - 가맹점명
 * @property {string} category - 원본 업종명
 * @property {string} business_type - 메인 카테고리 (11개)
 * @property {string} address - 도로명주소
 * @property {string} address_detail - 상세주소
 * @property {{lat: number, lng: number}} coords - 좌표
 * @property {string} place_id - 카카오맵 장소 ID
 * @property {string} place_url - 카카오맵 URL
 */

/**
 * @typedef {Object} LoadingStatus
 * @property {boolean} loading - 로딩 중 여부
 * @property {'cache'|'network'|null} source - 데이터 소스
 * @property {string} message - 상태 메시지
 */

class MerchantRepository {
  constructor() {
    /** @type {Map<string, Merchant[]>} 카테고리별 캐시된 가맹점 */
    this.cachedMerchants = new Map()

    /** @type {Set<string>} 로드 완료된 카테고리 목록 */
    this.loadedCategories = new Set()

    /** @type {Merchant[]} 현재 화면에 표시할 가맹점 목록 */
    this.visibleMerchants = []

    /** @type {string[]} 현재 선택된 카테고리 필터 */
    this.selectedCategories = [...DEFAULT_CATEGORIES]

    /** @type {Set<Function>} visibleMerchants 변경 구독자 */
    this.listeners = new Set()

    /** @type {Set<Function>} allMerchants 변경 구독자 */
    this.allMerchantsListeners = new Set()

    /** @type {Set<Function>} 로딩 상태 변경 구독자 */
    this.statusListeners = new Set()

    /** @type {boolean} 데이터 로딩 중 여부 */
    this.isLoading = false

    /** @type {number} IndexedDB 캐시 버전 */
    this.cachedVersion = 0

    /** @type {Record<string, number>} 카테고리별 전체 개수 */
    this.categoryCounts = {}

    /** @type {string|null} 마지막 업데이트 시간 */
    this.lastUpdatedAt = null
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * 초기 로드 (기본 카테고리 + 버전 체크)
   * @returns {Promise<void>}
   */
  async initialize() {
    this._setLoading(true, null, '초기화 중...')

    // 1. 서버 버전 체크
    const serverVersion = await this._getSupabaseVersion()
    const cachedVersion = await this._getCachedVersion()

    // 버전이 다르면 캐시 초기화
    if (serverVersion !== null && serverVersion !== cachedVersion) {
      console.log(`버전 변경 감지: ${cachedVersion} → ${serverVersion}`)
      await this._clearAllCache()
      await this._setCachedVersion(serverVersion)
    }

    // 2. 기본 카테고리 로드
    await this._loadCategoriesFromSource(DEFAULT_CATEGORIES)
    this._updateVisibleMerchants()

    // 3. 전체 카테고리별 카운트 로드
    this.categoryCounts = await this._fetchCategoryCounts() || {}

    // 4. 마지막 업데이트 시간 로드
    this.lastUpdatedAt = await this._fetchLastUpdatedAt()

    this._setLoading(false, 'cache', `${this.visibleMerchants.length}개 로드 완료`)
  }

  /**
   * 카테고리 필터 변경
   * @param {string[]} categories - 선택할 카테고리 목록
   * @returns {Promise<void>}
   */
  async setCategories(categories) {
    if (!categories || categories.length === 0) return

    this.selectedCategories = [...categories]

    // 검색 모드면 검색 결과 유지
    if (this.searchQuery) {
      this._updateVisibleMerchants()
      return
    }

    // 로드되지 않은 카테고리 확인
    const needToLoad = categories.filter(cat => !this.loadedCategories.has(cat))

    if (needToLoad.length > 0) {
      this._setLoading(true, null, `${needToLoad.join(', ')} 데이터 로드 중...`)
      await this._loadCategoriesFromSource(needToLoad)
      this._setLoading(false, 'cache', '로드 완료')
    }

    this._updateVisibleMerchants()
  }

  /**
   * 검색 실행 (DB 직접 조회)
   * 검색 결과를 visibleMerchants에 반영
   * @param {string} query - 검색어
   * @returns {Promise<void>}
   */
  async search(query) {
    if (!query || query.trim().length === 0) {
      return
    }

    const searchTerm = query.trim()
    this._setLoading(true, null, '검색 중...')

    try {
      const results = await this._searchFromSupabase(searchTerm)
      console.log(`[검색: ${searchTerm}] ${results.length}개 검색 완료`)

      this.visibleMerchants = results
      this._notifyListeners()

      this._setLoading(false, 'network', `${results.length}개 검색 결과`)
    } catch (error) {
      console.error('검색 실패:', error)
      this._setLoading(false, 'network', '검색 실패')
    }
  }

  /**
   * 검색 모드 해제
   * visibleMerchants를 선택된 카테고리 기반으로 복원
   */
  clearSearch() {
    this._updateVisibleMerchants()
  }

  /**
   * visibleMerchants 변경 구독
   * @param {(merchants: Merchant[]) => void} listener - 콜백 함수
   * @returns {() => void} unsubscribe 함수
   */
  subscribe(listener) {
    this.listeners.add(listener)
    // 즉시 현재 값 전달
    listener(this.visibleMerchants)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * allMerchants 변경 구독 (로드된 모든 가맹점)
   * @param {(merchants: Merchant[]) => void} listener - 콜백 함수
   * @returns {() => void} unsubscribe 함수
   */
  subscribeAll(listener) {
    this.allMerchantsListeners.add(listener)
    // 즉시 현재 값 전달
    listener(this.getAllCachedMerchants())

    return () => {
      this.allMerchantsListeners.delete(listener)
    }
  }

  /**
   * 로딩 상태 변경 구독
   * @param {(status: LoadingStatus) => void} listener - 콜백 함수
   * @returns {() => void} unsubscribe 함수
   */
  subscribeStatus(listener) {
    this.statusListeners.add(listener)
    // 즉시 현재 값 전달
    listener({
      loading: this.isLoading,
      source: null,
      message: ''
    })

    return () => {
      this.statusListeners.delete(listener)
    }
  }

  /**
   * 캐시 삭제 후 재로드
   * @returns {Promise<void>}
   */
  async refresh() {
    await this._clearAllCache()
    this.cachedMerchants.clear()
    this.loadedCategories.clear()
    this.visibleMerchants = []

    this._setLoading(true, null, '새로고침 중...')
    await this._loadCategoriesFromSource(DEFAULT_CATEGORIES)
    this.selectedCategories = [...DEFAULT_CATEGORIES]
    this._updateVisibleMerchants()
    this._setLoading(false, 'network', `${this.visibleMerchants.length}개 로드 완료`)
  }

  /**
   * 전체 카테고리별 개수 조회
   * @returns {Promise<Record<string, number>>}
   */
  async getCategoryCounts() {
    if (Object.keys(this.categoryCounts).length === 0) {
      this.categoryCounts = await this._fetchCategoryCounts() || {}
    }
    return this.categoryCounts
  }

  /**
   * 현재 visibleMerchants 반환
   * @returns {Merchant[]}
   */
  getVisibleMerchants() {
    return this.visibleMerchants
  }

  /**
   * 현재 선택된 카테고리 반환
   * @returns {string[]}
   */
  getSelectedCategories() {
    return [...this.selectedCategories]
  }

  /**
   * 마지막 업데이트 시간 반환
   * @returns {string|null}
   */
  getLastUpdatedAt() {
    return this.lastUpdatedAt
  }

  /**
   * 모든 캐시된 가맹점 반환 (필터링 없이)
   * @returns {Merchant[]}
   */
  getAllCachedMerchants() {
    const all = []
    for (const merchants of this.cachedMerchants.values()) {
      all.push(...merchants)
    }
    return all
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * visibleMerchants 업데이트 및 리스너 호출
   * 선택된 카테고리의 캐시된 데이터로 visibleMerchants 갱신
   */
  _updateVisibleMerchants() {
    const result = []
    for (const category of this.selectedCategories) {
      const cached = this.cachedMerchants.get(category)
      if (cached) {
        result.push(...cached)
      }
    }
    this.visibleMerchants = result

    this._notifyListeners()
  }

  /**
   * 리스너들에게 변경 알림
   */
  _notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.visibleMerchants)
    }
  }

  /**
   * allMerchants 리스너들에게 변경 알림
   */
  _notifyAllMerchantsListeners() {
    const allMerchants = this.getAllCachedMerchants()
    for (const listener of this.allMerchantsListeners) {
      listener(allMerchants)
    }
  }

  /**
   * 로딩 상태 변경 및 알림
   * @param {boolean} loading
   * @param {'cache'|'network'|null} source
   * @param {string} message
   */
  _setLoading(loading, source, message) {
    this.isLoading = loading
    const status = { loading, source, message }

    for (const listener of this.statusListeners) {
      listener(status)
    }
  }

  /**
   * 카테고리 데이터 로드 (캐시 우선)
   * @param {string[]} categories
   */
  async _loadCategoriesFromSource(categories) {
    const needToFetch = []

    // 1. IndexedDB 캐시 확인
    for (const category of categories) {
      if (this.loadedCategories.has(category)) continue

      const cached = await this._getCachedCategory(category)
      if (cached && cached.length > 0) {
        this.cachedMerchants.set(category, cached)
        this.loadedCategories.add(category)
        console.log(`[${category}] 캐시에서 ${cached.length}개 로드`)
      } else {
        needToFetch.push(category)
      }
    }

    // 2. 캐시에 없는 카테고리는 Supabase에서 로드
    if (needToFetch.length > 0) {
      const freshData = await this._fetchMerchantsByCategories(needToFetch)

      // 카테고리별로 분리하여 저장
      for (const category of needToFetch) {
        const categoryData = freshData.filter(m => m.business_type === category)
        this.cachedMerchants.set(category, categoryData)
        this.loadedCategories.add(category)
        await this._setCachedCategory(category, categoryData)
      }

      // allMerchants 리스너들에게 알림
      this._notifyAllMerchantsListeners()
    } else if (categories.length > 0) {
      // 캐시에서만 로드한 경우에도 알림
      this._notifyAllMerchantsListeners()
    }
  }

  // ============================================
  // Supabase API
  // ============================================

  /**
   * Supabase에서 전체 가맹점 수 조회 (버전 체크용)
   */
  async _getSupabaseVersion() {
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
   * Supabase에서 여러 카테고리 데이터 로드
   * @param {string[]} categories
   * @returns {Promise<Merchant[]>}
   */
  async _fetchMerchantsByCategories(categories) {
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

      return this._mapMerchantData(allData)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      return []
    }
  }

  /**
   * Supabase에서 검색어로 가맹점 검색
   * @param {string} query
   * @returns {Promise<Merchant[]>}
   */
  async _searchFromSupabase(query) {
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
          .or(`name.ilike.*${query}*,address.ilike.*${query}*,category.ilike.*${query}*,business_type.ilike.*${query}*`)
          .range(from, to)

        if (error) throw error

        if (data.length > 0) {
          allData = allData.concat(data)
          page++
        }

        hasMore = data.length === PAGE_SIZE
      }

      return this._mapMerchantData(allData)
    } catch (error) {
      console.error('검색 실패:', error)
      return []
    }
  }

  /**
   * Supabase에서 카테고리별 가맹점 수 조회
   * @returns {Promise<Record<string, number>|null>}
   */
  async _fetchCategoryCounts() {
    try {
      const { data, error } = await supabase.rpc('get_category_counts')

      if (error) {
        console.warn('RPC 함수 없음, 직접 쿼리 시도:', error)
        return await this._fetchCategoryCountsDirect()
      }

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
   * 직접 쿼리로 카테고리별 가맹점 수 조회
   */
  async _fetchCategoryCountsDirect() {
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

        data.forEach(row => {
          counts[row.business_type] = (counts[row.business_type] || 0) + 1
        })

        hasMore = data.length === PAGE_SIZE
        page++
      }

      return counts
    } catch (error) {
      console.error('카테고리 카운트 직접 조회 실패:', error)
      return null
    }
  }

  /**
   * Supabase에서 마지막 업데이트 시간 조회
   */
  async _fetchLastUpdatedAt() {
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
   * DB row를 Merchant 객체로 변환
   * @param {Object[]} rows
   * @returns {Merchant[]}
   */
  _mapMerchantData(rows) {
    return rows.map(row => ({
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
  }

  // ============================================
  // IndexedDB Cache
  // ============================================

  _getCacheKey(category) {
    return `${CACHE_PREFIX}${category}`
  }

  async _getCachedCategory(category) {
    try {
      return await get(this._getCacheKey(category)) || null
    } catch (error) {
      console.error(`[${category}] 캐시 로드 실패:`, error)
      return null
    }
  }

  async _setCachedCategory(category, data) {
    try {
      await set(this._getCacheKey(category), data)
      console.log(`[${category}] 캐시 저장 완료: ${data.length}개`)
    } catch (error) {
      console.error(`[${category}] 캐시 저장 실패:`, error)
    }
  }

  async _getCachedVersion() {
    try {
      return (await get(VERSION_KEY)) || 0
    } catch {
      return 0
    }
  }

  async _setCachedVersion(version) {
    try {
      await set(VERSION_KEY, version)
    } catch (error) {
      console.error('버전 저장 실패:', error)
    }
  }

  async _clearAllCache() {
    try {
      const allKeys = await keys()
      const cacheKeys = allKeys.filter(key =>
        typeof key === 'string' && key.startsWith(CACHE_PREFIX)
      )

      for (const key of cacheKeys) {
        await del(key)
      }
      await del(VERSION_KEY)

      console.log('캐시 삭제 완료')
    } catch (error) {
      console.error('캐시 삭제 실패:', error)
    }
  }
}

// 싱글톤 인스턴스 export
export const merchantRepository = new MerchantRepository()
export default merchantRepository
