import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useMerchants } from './hooks/useMerchants'
import { useSearch } from './hooks/useSearch'
import { useFilters } from './hooks/useFilters'
import { SearchBar, BottomSheet, CategorySheet, FilterBar, MapControls, DataStatus, InfoModal } from './components'
import { BUSINESS_TYPE_FILTERS } from './constants/categories'
import { SNAP_RADIUS, MAP_INITIAL_CENTER, MAP_INITIAL_LEVEL } from './constants/config'
import { calculateDistance } from './utils/geo'
import {
  createMixedClusterSvg,
  createSingleClusterSvg,
  createMultiTypeMarkerSvg,
  createSingleTypeMarkerWithBadgeSvg,
  createSelectedMarkerContent,
} from './utils/markerSvg'
import { initAnalytics, Analytics } from './lib/firebase'
import './App.css'

function App() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const clustererRef = useRef(null)
  const markersRef = useRef([])
  const clusterOverlaysRef = useRef([])
  const selectedOverlayRef = useRef(null)
  const selectedMarkerRef = useRef(null)
  const myLocationMarkerRef = useRef(null)
  const appIconRef = useRef(null)
  const searchStateRef = useRef({ isSearchMode: false, query: '', selectedFilters: [] })
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedMerchants, setSelectedMerchants] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  // 데이터 로드 (지도 로드 후 트리거)
  const {
    merchants,
    loading,
    lastUpdatedAt,
    categoryCounts,
    loadByCategories,
    startInitialLoad,
    search: searchFromDB,
    clearSearch: clearSearchFromDB
  } = useMerchants()
  const dataLoadStartedRef = useRef(false)

  // Analytics 초기화 및 페이지 뷰 로깅
  useEffect(() => {
    initAnalytics().then(() => {
      Analytics.pageView()
    })
  }, [])

  // 지도 로드 완료 후 데이터 로드 시작
  useEffect(() => {
    if (mapLoaded && !dataLoadStartedRef.current) {
      dataLoadStartedRef.current = true
      startInitialLoad()
    }
  }, [mapLoaded, startInitialLoad])

  // 선택 상태 초기화 핸들러 (검색/필터 변경 시 호출)
  const clearSelection = useCallback(() => {
    setSelectedMerchants(null)
    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
      selectedOverlayRef.current = null
    }
    if (selectedMarkerRef.current && clustererRef.current) {
      clustererRef.current.addMarker(selectedMarkerRef.current)
      selectedMarkerRef.current = null
    }
  }, [])

  // 검색 훅
  const search = useSearch(mapInstanceRef, clearSelection)

  // 검색 실행 래퍼 (Analytics 포함 + DB 검색)
  const handleSearch = useCallback(async (query) => {
    search.executeSearch(query)
    if (query.trim()) {
      // DB에서 검색 → Repository가 visibleMerchants 업데이트
      await searchFromDB(query.trim())
    } else {
      clearSearchFromDB()
    }
  }, [search, searchFromDB, clearSearchFromDB])

  // 검색 결과 변경 시 Analytics 로깅
  useEffect(() => {
    if (search.isSearchMode && search.appliedSearchQuery) {
      // 검색 모드일 때 merchants가 검색 결과
      Analytics.search(search.appliedSearchQuery, merchants.length)
    }
  }, [search.isSearchMode, search.appliedSearchQuery, merchants.length])

  // 검색 초기화 래퍼 (검색 결과도 함께 초기화)
  const handleClearAppliedSearch = useCallback(() => {
    search.clearAppliedSearch()
    clearSearchFromDB()
  }, [search, clearSearchFromDB])

  // 검색 비활성화 래퍼 (← 버튼)
  // 검색 모드: 검색 결과 유지, 입력 중인 텍스트를 appliedSearchQuery로 복원
  // 카테고리 모드: 입력 중인 텍스트 초기화
  const handleDeactivateSearch = useCallback(() => {
    // 입력 중인 searchQuery를 appliedSearchQuery로 복원 (또는 빈 문자열)
    search.setSearchQuery(search.appliedSearchQuery)
    search.deactivateSearch(false)
  }, [search])

  // 검색어 클리어 래퍼 (입력 필드 X 버튼)
  const handleClearSearchQuery = useCallback(() => {
    search.clearSearch()
    clearSearchFromDB()
  }, [search, clearSearchFromDB])

  // 필터 훅 - 기본값: 음식점
  const filters = useFilters(['음식점'], clearSelection)

  // 필터 변경 시 새 카테고리 데이터 로드
  useEffect(() => {
    if (filters.selectedFilters.length > 0) {
      loadByCategories(filters.selectedFilters)
    }
  }, [filters.selectedFilters, loadByCategories])

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

  // 필터링된 가맹점 목록
  // Repository가 visibleMerchants를 관리하므로 merchants가 이미 필터링/검색된 결과
  const filteredMerchants = useMemo(() => {
    return merchants
  }, [merchants])

  // 검색/필터 상태를 ref에 동기화 (마커 클릭 핸들러에서 사용)
  useEffect(() => {
    searchStateRef.current = {
      isSearchMode: search.isSearchMode,
      query: search.appliedSearchQuery.toLowerCase(),
      selectedFilters: filters.selectedFilters
    }
  }, [search.isSearchMode, search.appliedSearchQuery, filters.selectedFilters])

  // 전체 가맹점 좌표별 그룹화 (마커 생성용 - 한 번만 생성)
  const allMerchantsByLocation = useMemo(() => {
    const groups = []

    merchants.filter(m => m.coords).forEach(merchant => {
      const { lat, lng } = merchant.coords

      let foundGroup = null
      for (const group of groups) {
        const distance = calculateDistance(lat, lng, group.centerLat, group.centerLng)
        if (distance <= SNAP_RADIUS) {
          foundGroup = group
          break
        }
      }

      if (foundGroup) {
        foundGroup.merchants.push(merchant)
        const totalLat = foundGroup.merchants.reduce((sum, m) => sum + m.coords.lat, 0)
        const totalLng = foundGroup.merchants.reduce((sum, m) => sum + m.coords.lng, 0)
        foundGroup.centerLat = totalLat / foundGroup.merchants.length
        foundGroup.centerLng = totalLng / foundGroup.merchants.length
      } else {
        groups.push({
          centerLat: lat,
          centerLng: lng,
          merchants: [merchant]
        })
      }
    })

    const locationMap = new Map()
    groups.forEach(group => {
      const key = `${group.centerLat},${group.centerLng}`
      locationMap.set(key, group.merchants)
    })

    return locationMap
  }, [merchants])

  // 검색 결과 좌표별 그룹화 (검색 모드용)
  // 검색 모드일 때 merchants가 검색 결과
  const searchResultsByLocation = useMemo(() => {
    if (!search.isSearchMode || merchants.length === 0) {
      return new Map()
    }

    const groups = []

    merchants.filter(m => m.coords).forEach(merchant => {
      const { lat, lng } = merchant.coords

      let foundGroup = null
      for (const group of groups) {
        const distance = calculateDistance(lat, lng, group.centerLat, group.centerLng)
        if (distance <= SNAP_RADIUS) {
          foundGroup = group
          break
        }
      }

      if (foundGroup) {
        foundGroup.merchants.push(merchant)
        const totalLat = foundGroup.merchants.reduce((sum, m) => sum + m.coords.lat, 0)
        const totalLng = foundGroup.merchants.reduce((sum, m) => sum + m.coords.lng, 0)
        foundGroup.centerLat = totalLat / foundGroup.merchants.length
        foundGroup.centerLng = totalLng / foundGroup.merchants.length
      } else {
        groups.push({
          centerLat: lat,
          centerLng: lng,
          merchants: [merchant]
        })
      }
    })

    const locationMap = new Map()
    groups.forEach(group => {
      const key = `${group.centerLat},${group.centerLng}`
      locationMap.set(key, group.merchants)
    })

    return locationMap
  }, [search.isSearchMode, merchants])

  // 필터링된 좌표 키 Set (visible 마커 결정용)
  const visibleLocationKeys = useMemo(() => {
    const keys = new Set()

    if (search.isSearchMode) {
      // 검색 모드: searchResultsByLocation의 모든 키가 visible
      searchResultsByLocation.forEach((_, key) => {
        keys.add(key)
      })
    } else {
      // 필터 모드: 기존 로직
      allMerchantsByLocation.forEach((merchantList, key) => {
        const hasMatch = merchantList.some(m => filters.selectedFilters.includes(m.business_type))
        if (hasMatch) {
          keys.add(key)
        }
      })
    }

    return keys
  }, [allMerchantsByLocation, searchResultsByLocation, filters.selectedFilters, search.isSearchMode])

  // 바텀시트 닫기
  const closeBottomSheet = useCallback(() => {
    setSelectedMerchants(null)
    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
      selectedOverlayRef.current = null
    }
    if (selectedMarkerRef.current && clustererRef.current) {
      clustererRef.current.addMarker(selectedMarkerRef.current)
      selectedMarkerRef.current = null
    }
  }, [])

  // 선택된 마커 강조 오버레이 생성
  const createSelectedMarkerOverlay = useCallback((position, color, iconPath, isMultiType = false) => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return

    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
    }

    const content = createSelectedMarkerContent(color, iconPath, isMultiType)

    const overlay = new kakao.maps.CustomOverlay({
      content: content,
      position: position,
      yAnchor: 1,
      zIndex: 100
    })
    overlay.setMap(mapInstanceRef.current)
    selectedOverlayRef.current = overlay
  }, [])

  // 지도 초기화
  useEffect(() => {
    const initMap = () => {
      const { kakao } = window
      if (!kakao || !kakao.maps) {
        console.error('Kakao Maps SDK 로드 실패')
        return
      }

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(MAP_INITIAL_CENTER.lat, MAP_INITIAL_CENTER.lng),
        level: MAP_INITIAL_LEVEL
      })
      mapInstanceRef.current = map

      kakao.maps.event.addListener(map, 'click', () => {
        setSelectedMerchants(null)
        if (selectedOverlayRef.current) {
          selectedOverlayRef.current.setMap(null)
          selectedOverlayRef.current = null
        }
        if (selectedMarkerRef.current && clustererRef.current) {
          clustererRef.current.addMarker(selectedMarkerRef.current)
          selectedMarkerRef.current = null
        }
      })

      setMapLoaded(true)
    }

    if (window.kakao && window.kakao.maps) {
      initMap()
    } else {
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao)
          initMap()
        }
      }, 100)

      return () => clearInterval(checkKakao)
    }
  }, [])

  // 커스텀 마커 이미지 생성
  const createMarkerImage = useCallback((color, iconPath) => {
    const { kakao } = window
    if (!kakao || !kakao.maps) return null

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
  }, [])

  // 마커 생성 (전체 가맹점 기반 - merchants 변경 시만 실행)
  useEffect(() => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return
    if (allMerchantsByLocation.size === 0) {
      markersRef.current = []
      return
    }

    const map = mapInstanceRef.current

    // 기존 마커/클러스터러 정리
    if (clustererRef.current) {
      clustererRef.current.clear()
      clustererRef.current = null
    }
    markersRef.current = []

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

    const markers = []

    allMerchantsByLocation.forEach((merchantList, key) => {
      const [lat, lng] = key.split(',').map(Number)
      const position = new kakao.maps.LatLng(lat, lng)
      const isMultiple = merchantList.length > 1

      const uniqueBusinessTypes = [...new Set(merchantList.map(m => m.business_type))]
      const hasMultipleTypes = uniqueBusinessTypes.length > 1

      const primaryMerchant = merchantList[0]
      const markerFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === primaryMerchant.business_type)
      const markerColor = markerFilter?.color || '#FF6B6B'
      const markerIconPath = markerFilter?.iconPath || ''

      let markerImage

      if (hasMultipleTypes) {
        const svg = createMultiTypeMarkerSvg(merchantList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else if (isMultiple) {
        const svg = createSingleTypeMarkerWithBadgeSvg(markerColor, markerIconPath, merchantList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else {
        markerImage = getMarkerImage(primaryMerchant.business_type)
      }

      const marker = new kakao.maps.Marker({
        position: position,
        title: isMultiple
          ? `${merchantList[0].name} 외 ${merchantList.length - 1}곳`
          : merchantList[0].name,
        image: markerImage
      })

      marker._merchantList = merchantList
      marker._locationKey = key

      kakao.maps.event.addListener(marker, 'click', () => {
        if (selectedMarkerRef.current && selectedMarkerRef.current !== marker && clustererRef.current) {
          clustererRef.current.addMarker(selectedMarkerRef.current)
        }
        if (clustererRef.current) {
          clustererRef.current.removeMarker(marker)
        }
        selectedMarkerRef.current = marker

        // 현재 검색/필터 상태에 따라 표시할 가맹점 필터링
        const { isSearchMode, query, selectedFilters } = searchStateRef.current
        const visibleMerchants = isSearchMode
          ? merchantList.filter(m =>
              m.name?.toLowerCase().includes(query) ||
              m.address?.toLowerCase().includes(query) ||
              m.category?.toLowerCase().includes(query) ||
              m.business_type?.toLowerCase().includes(query)
            )
          : merchantList.filter(m => selectedFilters.includes(m.business_type))

        const mapContainer = mapRef.current
        if (mapContainer) {
          const mapHeight = mapContainer.offsetHeight
          const bottomSheetHeight = visibleMerchants.length === 1 ? 200 : 350
          const safeMargin = 40
          const targetY = mapHeight * 0.33
          const availableSpace = mapHeight - bottomSheetHeight - safeMargin
          const offsetY = Math.min(targetY, availableSpace / 2)
          const projection = map.getProjection()
          const centerPoint = projection.pointFromCoords(position)
          const offsetPoint = new kakao.maps.Point(centerPoint.x, centerPoint.y + (mapHeight / 2 - offsetY))
          const offsetPosition = projection.coordsFromPoint(offsetPoint)
          map.panTo(offsetPosition)
        } else {
          map.panTo(position)
        }

        setSelectedMerchants(visibleMerchants)

        // 선택된 마커 스타일 결정 (필터링된 결과 기준)
        const visibleBusinessTypes = [...new Set(visibleMerchants.map(m => m.business_type))]
        const isVisibleMultiType = visibleBusinessTypes.length > 1
        const visiblePrimaryMerchant = visibleMerchants[0]
        const visibleMarkerFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === visiblePrimaryMerchant?.business_type)
        const visibleMarkerColor = visibleMarkerFilter?.color || '#FF6B6B'
        const visibleMarkerIconPath = visibleMarkerFilter?.iconPath || ''

        createSelectedMarkerOverlay(position, visibleMarkerColor, visibleMarkerIconPath, isVisibleMultiType)

        // Analytics: 마커 클릭
        Analytics.markerClick(visibleMerchants.length, visibleBusinessTypes)
      })

      markers.push(marker)
    })

    // 빈 클러스터러 생성 (마커는 필터링 후 추가)
    const clusterer = new kakao.maps.MarkerClusterer({
      map: map,
      markers: [],
      gridSize: 60,
      averageCenter: true,
      minLevel: 4,
      disableClickZoom: false,
      styles: [{
        width: '1px',
        height: '1px',
        background: 'transparent',
        color: 'transparent'
      }]
    })

    const updateClusterOverlays = (clusters) => {
      clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
      clusterOverlaysRef.current = []

      if (!clusters || clusters.length === 0) return

      // 현재 필터 상태 참조
      const { isSearchMode, selectedFilters } = searchStateRef.current

      clusters.forEach(cluster => {
        const clusterMarkers = cluster.getMarkers() || []
        if (clusterMarkers.length < 2) return

        const bounds = cluster.getBounds()
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        const position = new kakao.maps.LatLng(
          (sw.getLat() + ne.getLat()) / 2,
          (sw.getLng() + ne.getLng()) / 2
        )

        const businessTypeCounts = {}
        let totalMerchants = 0
        clusterMarkers.forEach(marker => {
          const mList = marker._merchantList || []
          // 현재 필터에 맞는 가맹점만 집계
          const filteredList = isSearchMode
            ? mList
            : mList.filter(m => selectedFilters.includes(m.business_type))
          totalMerchants += filteredList.length
          filteredList.forEach(m => {
            const bt = m.business_type
            if (bt) {
              businessTypeCounts[bt] = (businessTypeCounts[bt] || 0) + 1
            }
          })
        })

        const total = totalMerchants || clusterMarkers.length
        const uniqueCategories = Object.keys(businessTypeCounts)
        let svg
        if (uniqueCategories.length === 1) {
          const dominantFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === uniqueCategories[0])
          const clusterColor = dominantFilter?.color || '#FF6B6B'
          svg = createSingleClusterSvg(clusterColor, total)
        } else {
          svg = createMixedClusterSvg(total)
        }

        const content = document.createElement('div')
        content.innerHTML = svg
        content.style.cursor = 'pointer'
        content.onclick = () => {
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

    kakao.maps.event.addListener(clusterer, 'clustered', (clusters) => {
      updateClusterOverlays(clusters)
    })

    kakao.maps.event.addListener(map, 'zoom_changed', () => {
      const level = map.getLevel()
      if (level < 4) {
        clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
        clusterOverlaysRef.current = []
      }
    })

    clustererRef.current = clusterer
    markersRef.current = markers
  }, [allMerchantsByLocation, mapLoaded, createMarkerImage, createSelectedMarkerOverlay])

  // 마커 필터링 (필터 변경 시 - 마커 이미지 업데이트 및 추가/제거)
  useEffect(() => {
    const { kakao } = window
    if (!kakao || !kakao.maps) return
    if (!clustererRef.current || markersRef.current.length === 0) return
    // 검색 모드에서는 이 effect를 실행하지 않음 (별도 effect에서 처리)
    if (search.isSearchMode) return

    // 선택 상태 초기화
    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
      selectedOverlayRef.current = null
    }
    selectedMarkerRef.current = null

    // 클러스터러 비우기
    clustererRef.current.clear()
    clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
    clusterOverlaysRef.current = []

    const selectedFilters = filters.selectedFilters

    // visible한 마커만 클러스터러에 추가하고, 마커 이미지 업데이트
    const visibleMarkers = markersRef.current.filter(marker => {
      if (!visibleLocationKeys.has(marker._locationKey)) return false

      const merchantList = marker._merchantList || []
      const filteredList = merchantList.filter(m => selectedFilters.includes(m.business_type))

      if (filteredList.length === 0) return false

      // 마커 이미지 업데이트 (필터링된 개수 기준)
      const uniqueBusinessTypes = [...new Set(filteredList.map(m => m.business_type))]
      const hasMultipleTypes = uniqueBusinessTypes.length > 1
      const primaryMerchant = filteredList[0]
      const markerFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === primaryMerchant.business_type)
      const markerColor = markerFilter?.color || '#FF6B6B'
      const markerIconPath = markerFilter?.iconPath || ''

      let markerImage
      if (hasMultipleTypes) {
        const svg = createMultiTypeMarkerSvg(filteredList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else if (filteredList.length > 1) {
        const svg = createSingleTypeMarkerWithBadgeSvg(markerColor, markerIconPath, filteredList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else {
        markerImage = createMarkerImage(markerColor, markerIconPath)
      }

      marker.setImage(markerImage)
      marker.setTitle(
        filteredList.length > 1
          ? `${filteredList[0].name} 외 ${filteredList.length - 1}곳`
          : filteredList[0].name
      )

      return true
    })

    if (visibleMarkers.length > 0) {
      clustererRef.current.addMarkers(visibleMarkers)
      clustererRef.current.redraw()
    }
  }, [visibleLocationKeys, search.isSearchMode, filters.selectedFilters, createMarkerImage])

  // 검색 결과 마커 ref
  const searchMarkersRef = useRef([])

  // 검색 모드 마커 생성/표시
  useEffect(() => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return

    // 검색 모드가 아니면 검색 마커 정리
    if (!search.isSearchMode) {
      searchMarkersRef.current.forEach(marker => marker.setMap(null))
      searchMarkersRef.current = []
      return
    }

    // 기존 마커 숨기기
    if (clustererRef.current) {
      clustererRef.current.clear()
    }
    clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
    clusterOverlaysRef.current = []

    // 기존 검색 마커 정리
    searchMarkersRef.current.forEach(marker => marker.setMap(null))
    searchMarkersRef.current = []

    if (searchResultsByLocation.size === 0) return

    const map = mapInstanceRef.current
    const markers = []

    searchResultsByLocation.forEach((merchantList, key) => {
      const [lat, lng] = key.split(',').map(Number)
      const position = new kakao.maps.LatLng(lat, lng)

      const uniqueBusinessTypes = [...new Set(merchantList.map(m => m.business_type))]
      const hasMultipleTypes = uniqueBusinessTypes.length > 1
      const primaryMerchant = merchantList[0]
      const markerFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === primaryMerchant.business_type)
      const markerColor = markerFilter?.color || '#FF6B6B'
      const markerIconPath = markerFilter?.iconPath || ''

      let markerImage
      if (hasMultipleTypes) {
        const svg = createMultiTypeMarkerSvg(merchantList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else if (merchantList.length > 1) {
        const svg = createSingleTypeMarkerWithBadgeSvg(markerColor, markerIconPath, merchantList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else {
        markerImage = createMarkerImage(markerColor, markerIconPath)
      }

      const marker = new kakao.maps.Marker({
        position: position,
        image: markerImage,
        title: merchantList.length > 1
          ? `${primaryMerchant.name} 외 ${merchantList.length - 1}곳`
          : primaryMerchant.name
      })

      marker._merchantList = merchantList
      marker._locationKey = key

      kakao.maps.event.addListener(marker, 'click', () => {
        if (selectedOverlayRef.current) {
          selectedOverlayRef.current.setMap(null)
        }
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setMap(map)
        }

        marker.setMap(null)
        selectedMarkerRef.current = marker

        const overlay = createSelectedMarkerOverlay(position, merchantList)
        overlay.setMap(map)
        selectedOverlayRef.current = overlay

        setSelectedMerchants(merchantList)
      })

      marker.setMap(map)
      markers.push(marker)
    })

    searchMarkersRef.current = markers
  }, [search.isSearchMode, searchResultsByLocation, createMarkerImage, createSelectedMarkerOverlay])

  // 줌 핸들러
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() - 1)
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() + 1)
    }
  }, [])

  // 현재 위치 마커 생성
  const createMyLocationMarker = useCallback((position) => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return

    // 기존 마커 제거
    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.setMap(null)
    }

    // 현재 위치 마커 SVG (파란색 점 + 펄스 효과)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#4285F4" fill-opacity="0.2">
          <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="fill-opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="20" cy="20" r="8" fill="#4285F4" stroke="#fff" stroke-width="3"/>
      </svg>
    `

    const content = document.createElement('div')
    content.innerHTML = svg
    content.style.cursor = 'default'

    const overlay = new kakao.maps.CustomOverlay({
      position: position,
      content: content,
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 50
    })
    overlay.setMap(mapInstanceRef.current)
    myLocationMarkerRef.current = overlay
  }, [])

  // 현재 위치 핸들러
  const handleMyLocation = useCallback(() => {
    if (!mapInstanceRef.current) return

    // Analytics: 현재 위치 버튼 클릭
    Analytics.locationClick()

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
          createMyLocationMarker(locPosition)
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
  }, [createMyLocationMarker])

  return (
    <div className="app">
      <div className="content">
        {/* 통합 플로팅 검색바 */}
        <SearchBar
          ref={appIconRef}
          isSearchActive={search.isSearchActive}
          isSearchMode={search.isSearchMode}
          searchQuery={search.searchQuery}
          appliedSearchQuery={search.appliedSearchQuery}
          filteredCount={filteredMerchants.length}
          searchInputRef={search.searchInputRef}
          recentSearches={search.recentSearches}
          onActivate={search.activateSearch}
          onDeactivate={handleDeactivateSearch}
          onSearch={handleSearch}
          onClear={handleClearSearchQuery}
          onClearApplied={handleClearAppliedSearch}
          onQueryChange={search.setSearchQuery}
          onRemoveRecent={search.removeRecentSearch}
          onClearAllRecent={search.clearAllRecentSearches}
          onMenuClick={() => setShowInfoModal(true)}
        />

        {/* 데이터 상태 표시 */}
        {!search.isSearchActive && !search.isSearchMode && (
          <DataStatus
            formattedLastUpdated={formattedLastUpdated}
            totalCount={Object.values(categoryCounts).reduce((sum, count) => sum + count, 0) || merchants.length}
          />
        )}

        {/* 업종 필터 버튼 */}
        <FilterBar
          selectedFilters={filters.selectedFilters}
          hidden={search.isSearchActive || search.isSearchMode}
          onFilterClick={filters.handleFilterClick}
          onRemoveFilter={filters.handleRemoveFilter}
          onMoreClick={filters.openCategorySheet}
        />

        <div ref={mapRef} className="map">
          {!mapLoaded && (
            <div className="loading">
              {loading ? '데이터 로딩 중...' : '지도 로딩 중...'}
            </div>
          )}
        </div>

        {mapLoaded && (
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onMyLocation={handleMyLocation}
          />
        )}

        {/* 바텀시트 */}
        <BottomSheet
          merchants={selectedMerchants}
          onClose={closeBottomSheet}
        />

        {/* 카테고리 선택 바텀시트 */}
        <CategorySheet
          show={filters.showCategorySheet}
          selectedFilters={filters.selectedFilters}
          categoryCounts={categoryCounts}
          onClose={filters.closeCategorySheet}
          onApply={filters.applyFilters}
        />

        {/* Information 모달 */}
        <InfoModal
          forceOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      </div>
    </div>
  )
}

export default App
