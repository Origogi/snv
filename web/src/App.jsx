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

/**
 * 성남 아동수당 가맹점 지도 메인 애플리케이션 컴포넌트
 * 지도 초기화, 마커 관리, 검색 및 필터링 로직을 총괄합니다.
 */
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
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedMerchants, setSelectedMerchants] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  // 가맹점 데이터 관리 커스텀 훅
  const {
    allMerchants,      // 로드된 모든 가맹점 데이터 (마커 생성용)
    visibleMerchants,  // 현재 필터/검색이 적용된 가맹점 (결과 리스트용)
    loading,
    lastUpdatedAt,
    categoryCounts,
    loadByCategories,
    startInitialLoad,
    search: searchFromDB,
    clearSearch: clearSearchFromDB
  } = useMerchants()
  const dataLoadStartedRef = useRef(false)

  // Firebase Analytics 초기화
  useEffect(() => {
    initAnalytics().then(() => {
      Analytics.pageView()
    })
  }, [])

  // 지도 로드가 완료되면 데이터 로딩을 시작합니다.
  useEffect(() => {
    if (mapLoaded && !dataLoadStartedRef.current) {
      dataLoadStartedRef.current = true
      startInitialLoad()
    }
  }, [mapLoaded, startInitialLoad])

  /**
   * 마커 선택 상태(오버레이 및 강조 표시)를 초기화합니다.
   * 검색 결과나 필터가 바뀔 때 호출됩니다.
   */
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

  // 검색 상태 관리 커스텀 훅
  const search = useSearch(mapInstanceRef, clearSelection)

  // 검색 실행 래퍼 (Analytics 기록 및 DB 검색 연동)
  const handleSearch = useCallback(async (query) => {
    search.executeSearch(query)
    if (query.trim()) {
      // 로컬 DB(IndexedDB) 검색 수행
      await searchFromDB(query.trim())
    } else {
      clearSearchFromDB()
    }
  }, [search, searchFromDB, clearSearchFromDB])

  // 검색 결과가 변경될 때 Analytics 로깅
  useEffect(() => {
    if (search.isSearchMode && search.appliedSearchQuery) {
      Analytics.search(search.appliedSearchQuery, visibleMerchants.length)
    }
  }, [search.isSearchMode, search.appliedSearchQuery, visibleMerchants.length])

  // 적용된 검색 필터를 초기화합니다.
  const handleClearAppliedSearch = useCallback(() => {
    search.clearAppliedSearch()
    clearSearchFromDB()
  }, [search, clearSearchFromDB])

  // 검색 입력을 취소하고 이전 상태로 복구합니다 (뒤로 가기 버튼).
  const handleDeactivateSearch = useCallback(() => {
    search.setSearchQuery(search.appliedSearchQuery)
    search.deactivateSearch(false)
  }, [search])

  // 검색창 입력 텍스트를 지웁니다 (X 버튼).
  const handleClearSearchQuery = useCallback(() => {
    search.clearSearch()
    clearSearchFromDB()
  }, [search, clearSearchFromDB])

  // 업종 필터 상태 관리 (기본값: 음식점)
  const filters = useFilters(['음식점'], clearSelection)

  // 선택된 필터가 변경되면 해당하는 카테고리 데이터를 새로 로드합니다.
  useEffect(() => {
    if (filters.selectedFilters.length > 0) {
      loadByCategories(filters.selectedFilters)
    }
  }, [filters.selectedFilters, loadByCategories])

  // 데이터 최종 업데이트 일자 포맷팅 (YYYY.MM.DD)
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdatedAt) return null
    try {
      const date = new Date(lastUpdatedAt)
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
    } catch {
      return null
    }
  }, [lastUpdatedAt])

  // 필터링된 가맹점 목록 (Repository가 관리하는 상태를 그대로 사용)
  const filteredMerchants = useMemo(() => {
    return visibleMerchants
  }, [visibleMerchants])


  // 같은 좌표에 있는 가맹점들을 그룹화합니다. (마커 밀집 대응)
  const allMerchantsByLocation = useMemo(() => {
    const groups = []

    allMerchants.filter(m => m.coords).forEach(merchant => {
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
  }, [allMerchants])

  // 검색 결과 좌표별 그룹화 (검색 모드용)
  // 검색 모드일 때 visibleMerchants가 검색 결과
  const searchResultsByLocation = useMemo(() => {
    if (!search.isSearchMode || visibleMerchants.length === 0) {
      return new Map()
    }

    const groups = []

    visibleMerchants.filter(m => m.coords).forEach(merchant => {
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
  }, [search.isSearchMode, visibleMerchants])

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

        // 마커에 저장된 필터링된 가맹점 목록 사용
        const clickedMerchants = marker._visibleMerchantList || []

        if (clickedMerchants.length === 0) {
          return // 보이는 가맹점이 없으면 무시
        }

        const mapContainer = mapRef.current
        if (mapContainer) {
          const mapHeight = mapContainer.offsetHeight
          const bottomSheetHeight = clickedMerchants.length === 1 ? 200 : 350
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

        setSelectedMerchants(clickedMerchants)

        // 선택된 마커 스타일 결정
        const businessTypes = [...new Set(clickedMerchants.map(m => m.business_type))]
        const isMultiType = businessTypes.length > 1
        const primaryMerchant = clickedMerchants[0]
        const markerFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === primaryMerchant?.business_type)
        const markerColor = markerFilter?.color || '#FF6B6B'
        const markerIconPath = markerFilter?.iconPath || ''

        createSelectedMarkerOverlay(position, markerColor, markerIconPath, isMultiType)

        // Analytics: 마커 클릭
        Analytics.markerClick(clickedMerchants.length, businessTypes)
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
          // 마커에 저장된 필터링된 가맹점 목록 사용
          const visibleList = marker._visibleMerchantList || []
          totalMerchants += visibleList.length
          visibleList.forEach(m => {
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

      // 마커에 필터링된 리스트 저장 (마커 클릭 시 사용)
      marker._visibleMerchantList = filteredList

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

  // 검색 모드 마커 표시 (클러스터러 사용)
  useEffect(() => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return
    if (!clustererRef.current || markersRef.current.length === 0) return

    // 검색 모드가 아니면 기존 필터 로직으로 복귀
    if (!search.isSearchMode) {
      return
    }

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

    // visibleMerchants를 Set으로 변환 (빠른 검색)
    const visibleMerchantSet = new Set(
      visibleMerchants.map(m => `${m.name}|${m.address}`)
    )

    // 검색 결과에 해당하는 마커만 필터링하여 클러스터러에 추가
    const searchVisibleMarkers = markersRef.current.filter(marker => {
      const merchantList = marker._merchantList || []

      // 검색 결과에 포함된 가맹점만 필터링
      const searchFilteredList = merchantList.filter(m =>
        visibleMerchantSet.has(`${m.name}|${m.address}`)
      )

      if (searchFilteredList.length === 0) return false

      // 마커에 검색 필터링된 리스트 저장
      marker._visibleMerchantList = searchFilteredList

      // 마커 이미지 업데이트 (검색 결과 개수 기준)
      const uniqueBusinessTypes = [...new Set(searchFilteredList.map(m => m.business_type))]
      const hasMultipleTypes = uniqueBusinessTypes.length > 1
      const primaryMerchant = searchFilteredList[0]
      const markerFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === primaryMerchant.business_type)
      const markerColor = markerFilter?.color || '#FF6B6B'
      const markerIconPath = markerFilter?.iconPath || ''

      let markerImage
      if (hasMultipleTypes) {
        const svg = createMultiTypeMarkerSvg(searchFilteredList.length)
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        markerImage = new kakao.maps.MarkerImage(
          dataUrl,
          new kakao.maps.Size(36, 36),
          { offset: new kakao.maps.Point(18, 18) }
        )
      } else if (searchFilteredList.length > 1) {
        const svg = createSingleTypeMarkerWithBadgeSvg(markerColor, markerIconPath, searchFilteredList.length)
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
        searchFilteredList.length > 1
          ? `${searchFilteredList[0].name} 외 ${searchFilteredList.length - 1}곳`
          : searchFilteredList[0].name
      )

      return true
    })

    if (searchVisibleMarkers.length > 0) {
      clustererRef.current.addMarkers(searchVisibleMarkers)
      clustererRef.current.redraw()
    }
  }, [search.isSearchMode, visibleMerchants, createMarkerImage])

  // 줌 핸들러 - 현재 화면 중심 기준으로 줌
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current

      // 현재 화면의 중심 좌표 계산
      const bounds = map.getBounds()
      const swLatLng = bounds.getSouthWest()
      const neLatLng = bounds.getNorthEast()
      const centerLat = (swLatLng.getLat() + neLatLng.getLat()) / 2
      const centerLng = (swLatLng.getLng() + neLatLng.getLng()) / 2
      const { kakao } = window
      const centerPosition = new kakao.maps.LatLng(centerLat, centerLng)

      // 화면 중심을 지도 중심으로 설정 후 줌
      map.setCenter(centerPosition)
      map.setLevel(map.getLevel() - 1)
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current

      // 현재 화면의 중심 좌표 계산
      const bounds = map.getBounds()
      const swLatLng = bounds.getSouthWest()
      const neLatLng = bounds.getNorthEast()
      const centerLat = (swLatLng.getLat() + neLatLng.getLat()) / 2
      const centerLng = (swLatLng.getLng() + neLatLng.getLng()) / 2
      const { kakao } = window
      const centerPosition = new kakao.maps.LatLng(centerLat, centerLng)

      // 화면 중심을 지도 중심으로 설정 후 줌
      map.setCenter(centerPosition)
      map.setLevel(map.getLevel() + 1)
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
            totalCount={Object.values(categoryCounts).reduce((sum, count) => sum + count, 0) || allMerchants.length}
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