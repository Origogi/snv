import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useMerchants } from './hooks/useMerchants'
import { useSearch } from './hooks/useSearch'
import { useFilters } from './hooks/useFilters'
import { SearchBar, BottomSheet, CategorySheet, FilterBar, MapControls, DataStatus } from './components'
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
import './App.css'

function App() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const clustererRef = useRef(null)
  const markersRef = useRef([])
  const clusterOverlaysRef = useRef([])
  const selectedOverlayRef = useRef(null)
  const selectedMarkerRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedMerchants, setSelectedMerchants] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState(null)

  // 데이터 로드
  const { merchants, loading, source, lastUpdatedAt } = useMerchants()

  // 선택 상태 초기화 핸들러 (검색/필터 변경 시 호출)
  const clearSelection = useCallback(() => {
    setSelectedMerchants(null)
    setSelectedPosition(null)
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

  // 필터 훅
  const filters = useFilters(['음식점'], clearSelection)

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
  const filteredMerchants = useMemo(() => {
    if (search.isSearchMode) {
      const query = search.appliedSearchQuery.toLowerCase()
      return merchants.filter(m =>
        m.name?.toLowerCase().includes(query) ||
        m.address?.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query) ||
        m.business_type?.toLowerCase().includes(query)
      )
    } else {
      return merchants.filter(m => filters.selectedFilters.includes(m.business_type))
    }
  }, [merchants, filters.selectedFilters, search.appliedSearchQuery, search.isSearchMode])

  // 현재 선택된 필터 정보
  const currentFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === filters.selectedFilters[0])

  // 좌표별로 가맹점 그룹화
  const merchantsByLocation = useMemo(() => {
    const groups = []

    filteredMerchants.filter(m => m.coords).forEach(merchant => {
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
  }, [filteredMerchants])

  // 바텀시트 닫기
  const closeBottomSheet = useCallback(() => {
    setSelectedMerchants(null)
    setSelectedPosition(null)
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
        setSelectedPosition(null)
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

  // 마커 업데이트
  useEffect(() => {
    const { kakao } = window
    if (!kakao || !kakao.maps || !mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // 오버레이 정리 (setState 없이)
    if (selectedOverlayRef.current) {
      selectedOverlayRef.current.setMap(null)
      selectedOverlayRef.current = null
    }
    selectedMarkerRef.current = null

    if (clustererRef.current) {
      clustererRef.current.clear()
      clustererRef.current = null
    }
    clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
    clusterOverlaysRef.current = []

    if (merchantsByLocation.size === 0) {
      markersRef.current = []
      return
    }

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

    const primaryColor = currentFilter?.color || '#FF6B6B'
    const markers = []

    merchantsByLocation.forEach((merchantList, key) => {
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

      kakao.maps.event.addListener(marker, 'click', () => {
        if (selectedMarkerRef.current && selectedMarkerRef.current !== marker && clustererRef.current) {
          clustererRef.current.addMarker(selectedMarkerRef.current)
        }
        if (clustererRef.current) {
          clustererRef.current.removeMarker(marker)
        }
        selectedMarkerRef.current = marker

        const mapContainer = mapRef.current
        if (mapContainer) {
          const mapHeight = mapContainer.offsetHeight
          const bottomSheetHeight = merchantList.length === 1 ? 200 : 350
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

        setSelectedMerchants(merchantList)
        setSelectedPosition(position)
        createSelectedMarkerOverlay(position, markerColor, markerIconPath, hasMultipleTypes)
      })

      markers.push(marker)
    })

    clusterOverlaysRef.current.forEach(overlay => overlay.setMap(null))
    clusterOverlaysRef.current = []

    const clusterer = new kakao.maps.MarkerClusterer({
      map: map,
      markers: markers,
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
        const uniqueCategories = Object.keys(businessTypeCounts)
        let svg
        if (uniqueCategories.length === 1) {
          const dominantFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === uniqueCategories[0])
          const clusterColor = dominantFilter?.color || primaryColor
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

    clusterer.redraw()

    clustererRef.current = clusterer
    markersRef.current = markers
  }, [merchantsByLocation, mapLoaded, currentFilter, filters.selectedFilters, createMarkerImage, createSelectedMarkerOverlay])

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

  // 현재 위치 핸들러
  const handleMyLocation = useCallback(() => {
    if (!mapInstanceRef.current) return

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
  }, [])

  return (
    <div className="app">
      <div className="content">
        {/* 통합 플로팅 검색바 */}
        <SearchBar
          isSearchActive={search.isSearchActive}
          isSearchMode={search.isSearchMode}
          searchQuery={search.searchQuery}
          appliedSearchQuery={search.appliedSearchQuery}
          filteredCount={filteredMerchants.length}
          searchInputRef={search.searchInputRef}
          recentSearches={search.recentSearches}
          onActivate={search.activateSearch}
          onDeactivate={search.deactivateSearch}
          onSearch={search.executeSearch}
          onClear={search.clearSearch}
          onClearApplied={search.clearAppliedSearch}
          onQueryChange={search.setSearchQuery}
          onRemoveRecent={search.removeRecentSearch}
          onClearAllRecent={search.clearAllRecentSearches}
        />

        {/* 데이터 상태 표시 */}
        {!search.isSearchActive && !search.isSearchMode && (
          <DataStatus
            formattedLastUpdated={formattedLastUpdated}
            totalCount={merchants.length}
            source={source}
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
          tempSelectedFilters={filters.tempSelectedFilters}
          merchants={merchants}
          onClose={filters.closeCategorySheet}
          onToggle={filters.toggleTempFilter}
          onApply={filters.applyFilters}
          onReset={filters.resetFilters}
        />
      </div>
    </div>
  )
}

export default App
