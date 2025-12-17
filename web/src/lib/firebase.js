import { initializeApp } from 'firebase/app'
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyAscu5blDzZmNZY4juW0S5bDif6Hroyf14",
  authDomain: "seongnam-child-voucher.firebaseapp.com",
  projectId: "seongnam-child-voucher",
  storageBucket: "seongnam-child-voucher.firebasestorage.app",
  messagingSenderId: "324551498404",
  appId: "1:324551498404:web:7fedce8e638aff2aad6431",
  measurementId: "G-CBVZ3R269J"
}

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig)

// Analytics 인스턴스 (Production 환경에서만 활성화)
let analytics = null
let analyticsInitPromise = null

// Analytics 초기화 (비동기)
export const initAnalytics = async () => {
  if (import.meta.env.PROD) {
    analyticsInitPromise = isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app)

        // DebugView 활성화 (URL에 debug_mode=true 있을 때)
        if (typeof window !== 'undefined' && window.location.search.includes('debug_mode=true')) {
          window.gtag?.('config', firebaseConfig.measurementId, { debug_mode: true })
          console.log('[Analytics] Debug mode enabled for DebugView')
        }

        console.log('[Analytics] Initialized in production mode')
        return true
      }
      console.log('[Analytics] Not supported in this environment')
      return false
    })
    return analyticsInitPromise
  } else {
    console.log('[Analytics] Debug mode - events will be logged to console')
    return Promise.resolve(false)
  }
}

// 이벤트 로깅 함수
export const trackEvent = async (eventName, params = {}) => {
  if (import.meta.env.PROD) {
    // 초기화 완료 대기
    if (analyticsInitPromise) {
      await analyticsInitPromise
    }
    if (analytics) {
      logEvent(analytics, eventName, params)
    }
  } else {
    // 개발 환경에서는 콘솔에 출력
    console.log(`[Analytics Debug] ${eventName}`, params)
  }
}

// 미리 정의된 이벤트들
export const Analytics = {
  // 페이지 방문
  pageView: () => {
    trackEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href
    })
  },

  // 검색 실행
  search: (query, resultCount) => {
    trackEvent('search', {
      search_term: query,
      result_count: resultCount
    })
  },

  // 마커 클릭
  markerClick: (merchantCount, businessTypes) => {
    trackEvent('marker_click', {
      merchant_count: merchantCount,
      business_types: businessTypes.join(',')
    })
  },

  // 상세 보기 클릭 (카카오맵 링크)
  detailClick: (merchantName, businessType) => {
    trackEvent('detail_click', {
      merchant_name: merchantName,
      business_type: businessType
    })
  },

  // 필터 선택
  filterSelect: (filters) => {
    trackEvent('filter_select', {
      filters: filters.join(','),
      filter_count: filters.length
    })
  },

  // 현재 위치 버튼 클릭
  locationClick: () => {
    trackEvent('location_click')
  }
}

export default app
