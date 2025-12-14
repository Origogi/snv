import { useEffect, useRef, useState, useMemo } from 'react'
import { useMerchants } from './hooks/useMerchants'
import './App.css'

// 업종 필터 목록 (카테고리별 색상 및 아이콘)
const BUSINESS_TYPE_FILTERS = [
  {
    key: '음식점',
    label: '음식점',
    color: '#FF6B6B',
    // 마커용 아이콘 path (viewBox 0 0 24 24 기준)
    iconPath: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
      </svg>
    )
  },
  {
    key: '마트/슈퍼마켓',
    label: '마트',
    color: '#4ECDC4',
    // 마커용 아이콘 path (viewBox 0 0 24 24 기준)
    iconPath: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    )
  },
  {
    key: '교육/서점',
    label: '교육/서점',
    color: '#9B59B6',
    // 책 아이콘 path (viewBox 0 0 24 24 기준)
    iconPath: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
      </svg>
    )
  },
  {
    key: '식품',
    label: '식품',
    color: '#F39C12',
    // 케이크/빵 아이콘 path (viewBox 0 0 24 24 기준)
    iconPath: 'M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12C21 10.34 19.66 9 18 9z',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12C21 10.34 19.66 9 18 9z"/>
      </svg>
    )
  },
  {
    key: '제과점/커피',
    label: '제과점/커피',
    color: '#795548',
    // 커피컵 아이콘 path (viewBox 0 0 24 24 기준)
    iconPath: 'M2 21h18v-2H2v2zm2-3h14c1.1 0 2-.9 2-2V5h2V3H2v2h2v11c0 1.1.9 2 2 2zm2-5V5h10v8H6zm10.5-4c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M2 21h18v-2H2v2zm2-3h14c1.1 0 2-.9 2-2V5h2V3H2v2h2v11c0 1.1.9 2 2 2zm2-5V5h10v8H6zm10.5-4c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
      </svg>
    )
  },
  {
    key: '병원/약국',
    label: '병원/약국',
    color: '#E91E63',
    // 병원/의료 아이콘 path (viewBox 0 0 24 24 기준)
    iconPath: 'M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
      </svg>
    )
  },
]

// 카테고리별 색상 조회 헬퍼
const getCategoryColor = (businessType) => {
  const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === businessType)
  return filter?.color || '#FF6B6B'
}

// 카테고리별 아이콘 SVG 생성
const getCategoryIconSvg = (businessType) => {
  const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === businessType)
  const color = filter?.color || '#FF6B6B'
  const iconPath = filter?.iconPath || ''

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}"/>
      <g transform="translate(9, 9) scale(0.75)">
        <path d="${iconPath}" fill="white"/>
      </g>
    </svg>
  `
}

// 도넛 클러스터 SVG 생성 (다중 필터용)
const createDonutClusterSvg = (categoryData, total) => {
  const size = 52
  const center = size / 2
  const radius = 20
  const strokeWidth = 6
  const circumference = 2 * Math.PI * radius

  // 고유 ID 생성 (필터 충돌 방지)
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // 카테고리별 도넛 세그먼트 생성
  let currentOffset = 0
  const segments = categoryData.map(({ color, count }) => {
    const ratio = count / total
    const dashLength = circumference * ratio
    const dashOffset = circumference - currentOffset
    currentOffset += dashLength

    return `<circle
      cx="${center}"
      cy="${center}"
      r="${radius}"
      fill="none"
      stroke="${color}"
      stroke-width="${strokeWidth}"
      stroke-dasharray="${dashLength} ${circumference - dashLength}"
      stroke-dashoffset="${dashOffset}"
      transform="rotate(-90 ${center} ${center})"
    />`
  }).join('')

  // 그라데이션 정의 (선택된 카테고리 색상들로)
  const gradientStops = categoryData.map((item, idx) => {
    const offset = (idx / (categoryData.length - 1 || 1)) * 100
    return `<stop offset="${offset}%" stop-color="${item.color}"/>`
  }).join('')

  const gradientId = `grad-${uniqueId}`
  const shadowId = `donutShadow-${uniqueId}`

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
          ${gradientStops}
        </linearGradient>
        <filter id="${shadowId}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
        </filter>
      </defs>
      <!-- 배경 원 (흰색) -->
      <circle cx="${center}" cy="${center}" r="${radius + strokeWidth/2 + 2}" fill="white" filter="url(#${shadowId})"/>
      <!-- 도넛 세그먼트 -->
      ${segments}
      <!-- 중앙 흰색 원 -->
      <circle cx="${center}" cy="${center}" r="${radius - strokeWidth/2 - 1}" fill="white"/>
      <!-- 숫자 텍스트 (그라데이션) -->
      <text
        x="${center}"
        y="${center}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="'Noto Sans KR', sans-serif"
        font-size="${total >= 1000 ? 11 : total >= 100 ? 13 : 15}"
        font-weight="bold"
        fill="url(#${gradientId})"
      >${total >= 1000 ? Math.floor(total/1000) + 'k' : total}</text>
    </svg>
  `
}

// 단일 필터 클러스터 SVG 생성
const createSingleClusterSvg = (color, total) => {
  const size = 52
  const center = size / 2
  const radius = 20
  const strokeWidth = 6
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const shadowId = `singleClusterShadow-${uniqueId}`

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="${shadowId}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
        </filter>
      </defs>
      <circle cx="${center}" cy="${center}" r="${radius + strokeWidth/2 + 2}" fill="white" filter="url(#${shadowId})"/>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>
      <circle cx="${center}" cy="${center}" r="${radius - strokeWidth/2 - 1}" fill="white"/>
      <text
        x="${center}"
        y="${center}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="'Noto Sans KR', sans-serif"
        font-size="${total >= 1000 ? 11 : total >= 100 ? 13 : 15}"
        font-weight="bold"
        fill="${color}"
      >${total >= 1000 ? Math.floor(total/1000) + 'k' : total}</text>
    </svg>
  `
}

// 복합 마커 SVG 생성 (같은 위치에 여러 업종이 있을 때)
const createMultiTypeMarkerSvg = (colors, count) => {
  const size = 36
  const center = size / 2
  const radius = center - 2

  // 레이어/스택 아이콘 path (여러 개 겹침을 표현)
  const layerIconPath = 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'

  // 그라디언트 ID 생성
  const gradientId = `multi-grad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // 부드러운 그라디언트 (위에서 아래로)
  const gradientStops = colors.length === 2
    ? `<stop offset="0%" stop-color="${colors[0]}"/>
       <stop offset="100%" stop-color="${colors[1]}"/>`
    : `<stop offset="0%" stop-color="${colors[0]}"/>
       <stop offset="100%" stop-color="${colors[colors.length - 1] || colors[0]}"/>`

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          ${gradientStops}
        </linearGradient>
        <filter id="multiShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
        </filter>
      </defs>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#${gradientId})" filter="url(#multiShadow)"/>
      <g transform="translate(${center - 10}, ${center - 10}) scale(0.83)">
        <path d="${layerIconPath}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <circle cx="${size - 8}" cy="${size - 8}" r="8" fill="white" stroke="none"/>
      <text x="${size - 8}" y="${size - 8}" text-anchor="middle" dominant-baseline="central" font-family="'Noto Sans KR', sans-serif" font-size="10" font-weight="bold" fill="#333">${count}</text>
    </svg>
  `
}

// 단일 타입 마커 + 숫자 뱃지 SVG 생성 (같은 위치에 같은 업종 여러 개)
const createSingleTypeMarkerWithBadgeSvg = (color, iconPath, count) => {
  const size = 36
  const center = size / 2
  const radius = center - 2

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="singleShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
        </filter>
      </defs>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="${color}" filter="url(#singleShadow)"/>
      <g transform="translate(${center - 9}, ${center - 9}) scale(0.75)">
        <path d="${iconPath}" fill="white"/>
      </g>
      <circle cx="${size - 8}" cy="${size - 8}" r="8" fill="white" stroke="none"/>
      <text x="${size - 8}" y="${size - 8}" text-anchor="middle" dominant-baseline="central" font-family="'Noto Sans KR', sans-serif" font-size="10" font-weight="bold" fill="#333">${count}</text>
    </svg>
  `
}

function App() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const clustererRef = useRef(null)
  const markersRef = useRef([])
  const clusterOverlaysRef = useRef([]) // 커스텀 클러스터 오버레이들
  const selectedOverlayRef = useRef(null) // 선택된 마커 강조 오버레이
  const selectedMarkerRef = useRef(null) // 선택된 원본 마커 (숨김용)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState(['음식점']) // 다중 선택 (최대 2개)
  const [showCategorySheet, setShowCategorySheet] = useState(false) // 카테고리 선택 바텀시트
  const [tempSelectedFilters, setTempSelectedFilters] = useState([]) // 바텀시트 임시 선택
  const [selectedMerchants, setSelectedMerchants] = useState(null) // 바텀시트용 선택된 가맹점
  const [selectedPosition, setSelectedPosition] = useState(null) // 선택된 마커 위치

  // Supabase + IndexedDB 캐시로 데이터 로드
  const { merchants, loading, source, message, lastUpdatedAt } = useMerchants()

  // 마지막 업데이트 날짜 포맷팅
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdatedAt) return null
    try {
      const date = new Date(lastUpdatedAt)
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
    } catch {
      return null
    }
  }, [lastUpdatedAt])

  // 필터링된 가맹점 목록 (다중 필터)
  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => selectedFilters.includes(m.business_type))
  }, [merchants, selectedFilters])

  // 현재 선택된 필터 정보 (첫 번째 필터 기준 - 마커 색상용)
  const currentFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === selectedFilters[0])

  // 좌표별로 가맹점 그룹화 (중복 좌표 처리)
  const merchantsByLocation = useMemo(() => {
    const locationMap = new Map()

    filteredMerchants.filter(m => m.coords).forEach(merchant => {
      const key = `${merchant.coords.lat},${merchant.coords.lng}`
      if (!locationMap.has(key)) {
        locationMap.set(key, [])
      }
      locationMap.get(key).push(merchant)
    })

    return locationMap
  }, [filteredMerchants])

  // 필터 칩 클릭 핸들러
  const handleFilterClick = (filterKey) => {
    setSelectedFilters(prev => {
      // 이미 선택된 필터면 제거 (단, 최소 1개는 유지)
      if (prev.includes(filterKey)) {
        if (prev.length > 1) {
          return prev.filter(f => f !== filterKey)
        }
        return prev // 마지막 하나는 제거 불가
      }
      // 새로운 필터 추가 (최대 2개)
      if (prev.length < 2) {
        return [...prev, filterKey]
      }
      // 2개 선택 상태에서 새 필터 클릭 시 바텀시트 열기
      return prev
    })
  }

  // 필터 제거 핸들러 (X 버튼)
  const handleRemoveFilter = (filterKey, e) => {
    e.stopPropagation()
    if (selectedFilters.length > 1) {
      setSelectedFilters(prev => prev.filter(f => f !== filterKey))
    }
  }

  // 카테고리 선택 바텀시트 열기
  const openCategorySheet = () => {
    setTempSelectedFilters([...selectedFilters])
    setShowCategorySheet(true)
  }

  // 카테고리 선택 바텀시트 닫기
  const closeCategorySheet = () => {
    setShowCategorySheet(false)
    setTempSelectedFilters([])
  }

  // 임시 필터 토글 (바텀시트 내)
  const toggleTempFilter = (filterKey) => {
    setTempSelectedFilters(prev => {
      if (prev.includes(filterKey)) {
        // 최소 1개는 유지
        if (prev.length > 1) {
          return prev.filter(f => f !== filterKey)
        }
        return prev
      }
      // 최대 2개까지만
      if (prev.length < 2) {
        return [...prev, filterKey]
      }
      return prev
    })
  }

  // 필터 적용 (바텀시트 저장)
  const applyFilters = () => {
    if (tempSelectedFilters.length > 0) {
      setSelectedFilters(tempSelectedFilters)
    }
    closeCategorySheet()
  }

  // 필터 초기화
  const resetFilters = () => {
    setTempSelectedFilters(['음식점'])
  }

  // 바텀시트 닫기
  const closeBottomSheet = () => {
    setSelectedMerchants(null)
    setSelectedPosition(null)
    // 선택 마커 오버레이 제거
    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
      selectedOverlayRef.current = null
    }
    // 숨겼던 원본 마커 복원 (클러스터러에 다시 추가)
    if (selectedMarkerRef.current && clustererRef.current) {
      clustererRef.current.addMarker(selectedMarkerRef.current)
      selectedMarkerRef.current = null
    }
  }

  // 선택된 마커 강조 오버레이 생성
  const createSelectedMarkerOverlay = (position, color, iconPath, multiTypeColors = null) => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return

    // 기존 오버레이 제거
    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
    }

    // 복합 업종 마커용 그라디언트 ID
    const gradientId = `pin-grad-${Date.now()}`

    // 핀 모양 마커 SVG (애니메이션 포함)
    // color를 50% 투명도로 변환 (pulse 배경용)
    const pulseColor = (multiTypeColors ? multiTypeColors[0] : color) + '80' // hex color + 50% alpha

    // 복합 업종일 때 그라디언트 정의 (사선 그라디언트)
    const gradientDef = multiTypeColors && multiTypeColors.length > 1 ? `
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${multiTypeColors[0]}"/>
        <stop offset="100%" stop-color="${multiTypeColors[1]}"/>
      </linearGradient>
    ` : ''

    const fillColor = multiTypeColors && multiTypeColors.length > 1 ? `url(#${gradientId})` : color

    // 레이어 아이콘 (복합 업종용)
    const layerIconPath = 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'

    // 아이콘 부분: 복합 업종이면 레이어 아이콘, 아니면 기존 카테고리 아이콘
    const iconContent = multiTypeColors ? `
      <g transform="translate(12, 10) scale(1)">
        <path d="${layerIconPath}" fill="none" stroke="${multiTypeColors[0]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    ` : `
      <g transform="translate(12, 10) scale(1)">
        <path d="${iconPath}" fill="${color}"/>
      </g>
    `

    const content = `
      <div class="selected-marker-container">
        <div class="selected-marker-pulse" style="background: ${pulseColor};"></div>
        <div class="selected-marker-pin">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <filter id="pinShadow" x="-50%" y="-20%" width="200%" height="150%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/>
              </filter>
              ${gradientDef}
            </defs>
            <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 36 24 36s24-18 24-36C48 10.745 37.255 0 24 0z" fill="${fillColor}" filter="url(#pinShadow)"/>
            <circle cx="24" cy="22" r="17" fill="white" opacity="0.95"/>
            ${iconContent}
          </svg>
        </div>
      </div>
    `

    const overlay = new kakao.maps.CustomOverlay({
      content: content,
      position: position,
      yAnchor: 1,
      zIndex: 100
    })
    overlay.setMap(mapInstanceRef.current)
    selectedOverlayRef.current = overlay
  }

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    const initMap = () => {
      const { kakao } = window
      if (!kakao || !kakao.maps) {
        console.error('Kakao Maps SDK 로드 실패')
        return
      }

      // 지도 생성 (성남시 분당구 중심)
      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(37.38, 127.12),
        level: 5
      })
      mapInstanceRef.current = map

      // 지도 클릭 시 바텀시트 닫기
      kakao.maps.event.addListener(map, 'click', () => {
        setSelectedMerchants(null)
        setSelectedPosition(null)
        if (selectedOverlayRef.current) {
          selectedOverlayRef.current.setMap(null)
          selectedOverlayRef.current = null
        }
        // 숨겼던 원본 마커 복원 (클러스터러에 다시 추가)
        if (selectedMarkerRef.current && clustererRef.current) {
          clustererRef.current.addMarker(selectedMarkerRef.current)
          selectedMarkerRef.current = null
        }
      })

      setMapLoaded(true)
    }

    // SDK가 이미 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
      initMap()
    } else {
      // SDK 로드 대기
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao)
          initMap()
        }
      }, 100)

      return () => clearInterval(checkKakao)
    }
  }, [])

  // 커스텀 마커 이미지 생성 (SVG + 아이콘)
  const createMarkerImage = (color, iconPath) => {
    const { kakao } = window
    if (!kakao || !kakao.maps) return null

    // SVG 마커 (원형 + 중앙 아이콘)
    const size = 36
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
          </filter>
        </defs>
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" filter="url(#shadow)"/>
        <g transform="translate(${size/2 - 9}, ${size/2 - 9}) scale(0.75)">
          <path d="${iconPath}" fill="white"/>
        </g>
      </svg>
    `
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

    return new kakao.maps.MarkerImage(
      dataUrl,
      new kakao.maps.Size(size, size),
      { offset: new kakao.maps.Point(size/2, size/2) }
    )
  }

  // 마커 업데이트 (필터 변경 시)
  useEffect(() => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // 바텀시트 및 선택 오버레이 닫기
    setSelectedMerchants(null)
    setSelectedPosition(null)
    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
      selectedOverlayRef.current = null
    }
    // 선택된 마커 참조 초기화 (클러스터러 전체가 재생성되므로 복원 불필요)
    selectedMarkerRef.current = null

    // 기존 클러스터러 및 오버레이 제거
    if (clustererRef.current) {
      clustererRef.current.clear()
      clustererRef.current = null
    }
    clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
    clusterOverlaysRef.current = []

    // 데이터가 없으면 마커도 없음
    if (merchantsByLocation.size === 0) {
      markersRef.current = []
      return
    }

    // 마커 이미지 캐시 (카테고리별)
    const markerImageCache = {}
    const getMarkerImage = (businessType) => {
      if (!markerImageCache[businessType]) {
        const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === businessType)
        const color = filter?.color || '#FF6B6B'
        const iconPath = filter?.iconPath || ''
        markerImageCache[businessType] = createMarkerImage(color, iconPath)
      }
      return markerImageCache[businessType]
    }

    // 클러스터러 스타일 (다중 필터 시 첫 번째 필터 색상 사용)
    const primaryColor = currentFilter?.color || '#FF6B6B'

    // 위치별로 마커 생성 (중복 좌표 처리)
    const markers = []

    merchantsByLocation.forEach((merchantList, key) => {
      const [lat, lng] = key.split(',').map(Number)
      const position = new kakao.maps.LatLng(lat, lng)
      const isMultiple = merchantList.length > 1

      // 같은 위치의 업종 종류 확인 (중복 제거)
      const uniqueBusinessTypes = [...new Set(merchantList.map(m => m.business_type))]
      const hasMultipleTypes = uniqueBusinessTypes.length > 1

      // 대표 가맹점의 카테고리로 마커 색상 결정
      const primaryMerchant = merchantList[0]
      const markerFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === primaryMerchant.business_type)
      const markerColor = markerFilter?.color || '#FF6B6B'
      const markerIconPath = markerFilter?.iconPath || ''

      // 마커 이미지 결정: 복합 업종이면 복합 마커, 아니면 기존 마커
      let markerImage
      let multiTypeColors = null

      if (hasMultipleTypes) {
        // 복합 업종: 그라디언트 + 레이어 아이콘 마커
        multiTypeColors = uniqueBusinessTypes.map(bt => {
          const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === bt)
          return filter?.color || '#FF6B6B'
        })
        const svg = createMultiTypeMarkerSvg(multiTypeColors, merchantList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else if (isMultiple) {
        // 단일 업종이지만 복수 개: 숫자 뱃지 포함 마커
        const svg = createSingleTypeMarkerWithBadgeSvg(markerColor, markerIconPath, merchantList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else {
        // 단일 업종, 단일 가맹점: 기존 마커
        markerImage = getMarkerImage(primaryMerchant.business_type)
      }

      const marker = new kakao.maps.Marker({
        position: position,
        title: isMultiple
          ? `${merchantList[0].name} 외 ${merchantList.length - 1}곳`
          : merchantList[0].name,
        image: markerImage
      })

      // 클러스터 계산용 데이터 저장
      marker._merchantList = merchantList

      // 마커 클릭 이벤트 - 바텀시트 열기 + 선택 마커 강조
      kakao.maps.event.addListener(marker, 'click', () => {
        // 이전에 숨겼던 마커 복원 (클러스터러에 다시 추가)
        if (selectedMarkerRef.current && selectedMarkerRef.current !== marker && clustererRef.current) {
          clustererRef.current.addMarker(selectedMarkerRef.current)
        }
        // 현재 마커 숨기기 (클러스터러에서 제거)
        if (clustererRef.current) {
          clustererRef.current.removeMarker(marker)
        }
        selectedMarkerRef.current = marker
        // 지도 중앙으로 이동 (부드럽게)
        map.panTo(position)
        // 바텀시트에 표시할 가맹점 설정
        setSelectedMerchants(merchantList)
        setSelectedPosition(position)
        // 선택된 마커 강조 오버레이 생성 (복합 업종이면 첫 번째 색상 사용)
        createSelectedMarkerOverlay(position, markerColor, hasMultipleTypes ? null : markerIconPath, hasMultipleTypes ? multiTypeColors : null)
      })

      markers.push(marker)
    })

    // 다중 필터 여부에 따라 클러스터러 생성
    const isMultiFilter = selectedFilters.length > 1

    // 기존 클러스터 오버레이 제거
    clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
    clusterOverlaysRef.current = []

    // 마커 클러스터러 생성 (투명 스타일 - 커스텀 오버레이로 대체)
    const clusterer = new kakao.maps.MarkerClusterer({
      map: map,
      markers: markers,
      gridSize: 60,
      averageCenter: true,
      minLevel: 4,
      disableClickZoom: false,
      styles: [{
        // 투명하게 설정 (커스텀 오버레이로 대체)
        width: '1px',
        height: '1px',
        background: 'transparent',
        color: 'transparent'
      }]
    })

    // 클러스터 오버레이 업데이트 함수
    const updateClusterOverlays = (clusters) => {
      // 기존 오버레이 제거
      clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
      clusterOverlaysRef.current = []

      if (!clusters || clusters.length === 0) return

      clusters.forEach(cluster => {
        const clusterMarkers = cluster.getMarkers() || []
        if (clusterMarkers.length < 2) return // 2개 미만은 클러스터 아님

        const bounds = cluster.getBounds()
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        const position = new kakao.maps.LatLng(
          (sw.getLat() + ne.getLat()) / 2,
          (sw.getLng() + ne.getLng()) / 2
        )

        // 클러스터 내 마커들의 업종별 카운트 계산
        const businessTypeCounts = {}
        let totalMerchants = 0
        clusterMarkers.forEach(marker => {
          // 마커에 저장된 merchantList에서 업종 정보 추출
          const merchantList = marker._merchantList || []
          totalMerchants += merchantList.length
          merchantList.forEach(m => {
            const bt = m.business_type
            if (bt) {
              businessTypeCounts[bt] = (businessTypeCounts[bt] || 0) + 1
            }
          })
        })

        const total = totalMerchants || clusterMarkers.length

        // SVG 생성
        let svg
        if (isMultiFilter && Object.keys(businessTypeCounts).length > 1) {
          // 다중 필터 + 여러 업종: 도넛 클러스터
          const categoryData = Object.entries(businessTypeCounts).map(([bt, count]) => {
            const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === bt)
            return { color: filter?.color || '#FF6B6B', count }
          })
          svg = createDonutClusterSvg(categoryData, total)
        } else {
          // 단일 업종 클러스터: 해당 업종의 색상 사용
          const dominantBusinessType = Object.keys(businessTypeCounts)[0]
          const dominantFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === dominantBusinessType)
          const clusterColor = dominantFilter?.color || primaryColor
          svg = createSingleClusterSvg(clusterColor, total)
        }

        // 커스텀 오버레이 생성
        const content = document.createElement('div')
        content.innerHTML = svg
        content.style.cursor = 'pointer'
        content.onclick = () => {
          // 클러스터 클릭 시 줌인
          const level = map.getLevel() - 1
          map.setLevel(level, { anchor: position })
        }

        const overlay = new kakao.maps.CustomOverlay({
          position: position,
          content: content,
          yAnchor: 0.5,
          xAnchor: 0.5,
          zIndex: 10
        })
        overlay.setMap(map)
        clusterOverlaysRef.current.push(overlay)
      })
    }

    // 클러스터 변경 이벤트에 오버레이 업데이트 연결
    kakao.maps.event.addListener(clusterer, 'clustered', (clusters) => {
      updateClusterOverlays(clusters)
    })

    // 줌 레벨 변경 시 클러스터 오버레이 업데이트
    kakao.maps.event.addListener(map, 'zoom_changed', () => {
      const level = map.getLevel()
      // minLevel(4) 미만이면 클러스터링 해제 - 오버레이 제거
      if (level < 4) {
        clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
        clusterOverlaysRef.current = []
      }
    })

    // 초기 클러스터링 - redraw 후 클러스터 수동 생성
    setTimeout(() => {
      clusterer.redraw()
      // redraw 직후 클러스터 직접 계산
      setTimeout(() => {
        // 클러스터러의 내부 메서드를 통해 클러스터 정보 접근
        if (typeof clusterer._getClusterByLevel === 'function') {
          const clusters = clusterer._getClusterByLevel(map.getLevel())
          if (clusters && clusters.length > 0) {
            updateClusterOverlays(clusters)
          }
        } else {
          // 대체 방안: 마커들을 직접 분석하여 클러스터 위치 계산
          const bounds = map.getBounds()
          const level = map.getLevel()

          // minLevel 이상일 때만 클러스터링
          if (level >= 4) {
            // 그리드 기반 간단한 클러스터링 계산
            const gridSize = 60
            const clusters = new Map()

            markers.forEach(marker => {
              const pos = marker.getPosition()
              // 마커가 현재 뷰포트 내에 있는지 확인
              if (bounds.contain(pos)) {
                const proj = map.getProjection()
                const point = proj.pointFromCoords(pos)
                const gridKey = `${Math.floor(point.x / gridSize)}_${Math.floor(point.y / gridSize)}`

                if (!clusters.has(gridKey)) {
                  clusters.set(gridKey, { markers: [], center: point })
                }
                clusters.get(gridKey).markers.push(marker)
              }
            })

            // 2개 이상인 클러스터만 오버레이 생성
            clusters.forEach((cluster, key) => {
              if (cluster.markers.length >= 2) {
                // 클러스터 중심 좌표 계산
                let sumLat = 0, sumLng = 0
                cluster.markers.forEach(m => {
                  const p = m.getPosition()
                  sumLat += p.getLat()
                  sumLng += p.getLng()
                })
                const centerPos = new kakao.maps.LatLng(
                  sumLat / cluster.markers.length,
                  sumLng / cluster.markers.length
                )

                // 업종별 카운트
                const businessTypeCounts = {}
                let totalMerchants = 0
                cluster.markers.forEach(marker => {
                  const merchantList = marker._merchantList || []
                  totalMerchants += merchantList.length
                  merchantList.forEach(m => {
                    const bt = m.business_type
                    if (bt) {
                      businessTypeCounts[bt] = (businessTypeCounts[bt] || 0) + 1
                    }
                  })
                })

                const total = totalMerchants || cluster.markers.length

                // SVG 생성
                let svg
                if (isMultiFilter && Object.keys(businessTypeCounts).length > 1) {
                  const categoryData = Object.entries(businessTypeCounts).map(([bt, count]) => {
                    const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === bt)
                    return { color: filter?.color || '#FF6B6B', count }
                  })
                  svg = createDonutClusterSvg(categoryData, total)
                } else {
                  // 단일 업종 클러스터: 해당 업종의 색상 사용
                  const dominantBusinessType = Object.keys(businessTypeCounts)[0]
                  const dominantFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === dominantBusinessType)
                  const clusterColor = dominantFilter?.color || primaryColor
                  svg = createSingleClusterSvg(clusterColor, total)
                }

                const content = document.createElement('div')
                content.innerHTML = svg
                content.style.cursor = 'pointer'
                content.onclick = () => {
                  map.setLevel(level - 1, { anchor: centerPos })
                }

                const overlay = new kakao.maps.CustomOverlay({
                  position: centerPos,
                  content: content,
                  yAnchor: 0.5,
                  xAnchor: 0.5,
                  zIndex: 10
                })
                overlay.setMap(map)
                clusterOverlaysRef.current.push(overlay)
              }
            })
          }
        }
      }, 50)
    }, 50)

    clustererRef.current = clusterer
    markersRef.current = markers
  }, [merchantsByLocation, mapLoaded, currentFilter, selectedFilters])

  // 줌 인/아웃 핸들러
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() - 1)
    }
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() + 1)
    }
  }

  // 현재 위치로 이동 핸들러
  const handleMyLocation = () => {
    if (!mapInstanceRef.current) return

    // HTTPS가 아닌 환경에서는 Geolocation API 사용 불가
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    if (!isSecure) {
      alert('위치 서비스는 HTTPS 환경에서만 사용 가능합니다.')
      return
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const locPosition = new window.kakao.maps.LatLng(latitude, longitude)
          mapInstanceRef.current.panTo(locPosition)
        },
        (error) => {
          console.error('위치 정보를 가져올 수 없습니다:', error)
          if (error.code === error.PERMISSION_DENIED) {
            alert('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.')
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert('위치 정보를 사용할 수 없습니다.')
          } else if (error.code === error.TIMEOUT) {
            alert('위치 정보 요청 시간이 초과되었습니다.')
          } else {
            alert('위치 정보를 가져올 수 없습니다.')
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.')
    }
  }

  return (
    <div className="app">
      <div className="content">
        {/* 상단 그라데이션 바 */}
        <div className="top-gradient-bar"></div>

        {/* 플로팅 앱바 */}
        <header className="header">
          <div className="header-card">
            <div className="header-content">
              <div className="header-title">
                <div className="app-icon-wrapper">
                  <img src={`${import.meta.env.BASE_URL}appicon.png`} alt="앱 아이콘" className="app-icon" />
                </div>
                <div className="title-text">
                  <h1>성남 아이포인트</h1>
                  <p className="subtitle">아동수당 가맹점 지도</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 데이터 상태 표시 (우측 상단) */}
        <div className={`data-status ${source || ''}`}>
          <div className="data-status-row">
            <span className="data-status-date">{formattedLastUpdated && `${formattedLastUpdated} 기준`}</span>
          </div>
          <div className="data-status-row">
            <span className="data-status-count">전체 {merchants.length.toLocaleString()}개</span>
          </div>
        </div>

        {/* 업종 필터 버튼 (플로팅) - 선택된 카테고리만 표시 */}
        <div className="filter-bar">
          {selectedFilters.map(filterKey => {
            const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === filterKey)
            if (!filter) return null
            return (
              <button
                key={filter.key}
                className="filter-btn active"
                style={{
                  '--filter-color': filter.color,
                  backgroundColor: filter.color,
                  borderColor: filter.color,
                  color: '#fff',
                }}
                onClick={() => handleFilterClick(filter.key)}
              >
                <span className="filter-icon">{filter.icon}</span>
                {filter.label}
                {selectedFilters.length === 2 && (
                  <span
                    className="filter-remove"
                    onClick={(e) => handleRemoveFilter(filter.key, e)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
          {/* + 더보기 버튼 */}
          <button
            className="filter-btn filter-more-btn"
            onClick={openCategorySheet}
          >
            <span className="filter-more-icon">+</span>
            더보기
          </button>
        </div>

        <div ref={mapRef} className="map">
          {!mapLoaded && (
            <div className="loading">
              {loading ? '데이터 로딩 중...' : '지도 로딩 중...'}
            </div>
          )}
        </div>
        {mapLoaded && (
          <div className="map-controls">
            <button className="control-btn location-btn" onClick={handleMyLocation} title="내 위치">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              </svg>
            </button>
            <div className="zoom-control">
              <button className="control-btn zoom-btn" onClick={handleZoomIn} title="확대">
                +
              </button>
              <button className="control-btn zoom-btn" onClick={handleZoomOut} title="축소">
                −
              </button>
            </div>
          </div>
        )}

        {/* 바텀시트 */}
        {selectedMerchants && (
          <div className={`bottom-sheet ${selectedMerchants ? 'open' : ''}`}>
            <div className="bottom-sheet-content">
              <button className="bottom-sheet-close" onClick={closeBottomSheet}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>

              {selectedMerchants.length === 1 ? (
                // 단일 가맹점
                <div className="bottom-sheet-single">
                  <div className="bottom-sheet-header">
                    <span
                      className="bottom-sheet-badge"
                      style={{ backgroundColor: getCategoryColor(selectedMerchants[0].business_type) }}
                    >
                      {selectedMerchants[0].business_type}
                    </span>
                    <span className="bottom-sheet-category">{selectedMerchants[0].category}</span>
                  </div>
                  <h2 className="bottom-sheet-title">{selectedMerchants[0].name}</h2>
                  <div className="bottom-sheet-address">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#999">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>{selectedMerchants[0].address}</span>
                  </div>
                  {selectedMerchants[0].place_url ? (
                    <a
                      href={selectedMerchants[0].place_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bottom-sheet-link"
                      style={{
                        background: `linear-gradient(135deg, ${getCategoryColor(selectedMerchants[0].business_type)}, ${getCategoryColor(selectedMerchants[0].business_type)}dd)`
                      }}
                    >
                      매장 상세정보 확인
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                      </svg>
                    </a>
                  ) : (
                    <span className="bottom-sheet-no-link">상세정보 없음</span>
                  )}
                </div>
              ) : (
                // 다중 가맹점
                <div className="bottom-sheet-multi">
                  <h2 className="bottom-sheet-multi-title">
                    이 건물에 <span className="highlight">{selectedMerchants.length}개</span>의 가맹점이 있어요
                  </h2>
                  <div className="bottom-sheet-address-header">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#999">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>{selectedMerchants[0].address}</span>
                  </div>
                  <div className="bottom-sheet-list">
                    {selectedMerchants.map((merchant, index) => {
                      const categoryColor = getCategoryColor(merchant.business_type)
                      return (
                        <div
                          key={index}
                          className={`bottom-sheet-item ${merchant.place_url ? 'clickable' : ''}`}
                          onClick={() => merchant.place_url && window.open(merchant.place_url, '_blank')}
                        >
                          <div
                            className="bottom-sheet-item-icon-rounded"
                            style={{ backgroundColor: `${categoryColor}15`, borderColor: `${categoryColor}30` }}
                            dangerouslySetInnerHTML={{
                              __html: `<svg viewBox="0 0 24 24" width="22" height="22" fill="${categoryColor}">
                                <path d="${BUSINESS_TYPE_FILTERS.find(f => f.key === merchant.business_type)?.iconPath || ''}"/>
                              </svg>`
                            }}
                          />
                          <div className="bottom-sheet-item-content">
                            <div className="bottom-sheet-item-meta">
                              <span
                                className="bottom-sheet-badge-small"
                                style={{ backgroundColor: categoryColor }}
                              >
                                {merchant.business_type}
                              </span>
                              <span className="bottom-sheet-item-category">· {merchant.category}</span>
                            </div>
                            <div className="bottom-sheet-item-title">{merchant.name}</div>
                          </div>
                          {merchant.place_url && <span className="bottom-sheet-item-arrow">›</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 카테고리 선택 바텀시트 */}
        {showCategorySheet && (
          <div className="category-sheet-overlay" onClick={closeCategorySheet}>
            <div className="category-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="category-sheet-header">
                <h2 className="category-sheet-title">카테고리 선택</h2>
                <p className="category-sheet-subtitle">최대 2개까지 선택할 수 있어요</p>
                <button className="category-sheet-close" onClick={closeCategorySheet}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
              <div className="category-sheet-grid">
                {BUSINESS_TYPE_FILTERS.map(filter => {
                  const isSelected = tempSelectedFilters.includes(filter.key)
                  const count = merchants.filter(m => m.business_type === filter.key).length
                  const isDisabled = !isSelected && tempSelectedFilters.length >= 2
                  return (
                    <button
                      key={filter.key}
                      className={`category-chip ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                      style={{
                        '--chip-color': filter.color,
                        borderColor: isSelected ? filter.color : '#e0e0e0',
                        backgroundColor: isSelected ? `${filter.color}15` : '#fff',
                      }}
                      onClick={() => !isDisabled && toggleTempFilter(filter.key)}
                      disabled={isDisabled}
                    >
                      <span
                        className="category-chip-icon"
                        style={{ color: filter.color }}
                      >
                        {filter.icon}
                      </span>
                      <span className="category-chip-label">{filter.label}</span>
                      <span className="category-chip-count">{count.toLocaleString()}</span>
                      {isSelected && (
                        <span className="category-chip-check" style={{ color: filter.color }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="category-sheet-footer">
                <button className="category-sheet-reset" onClick={resetFilters}>
                  초기화
                </button>
                <button className="category-sheet-apply" onClick={applyFilters}>
                  {tempSelectedFilters.length}개 카테고리 적용
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
