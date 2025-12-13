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

function App() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const overlayRef = useRef(null)
  const clustererRef = useRef(null)
  const markersRef = useRef([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('음식점')

  // Supabase + IndexedDB 캐시로 데이터 로드
  const { merchants, loading, source, message } = useMerchants()

  // 필터링된 가맹점 목록
  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => m.business_type === selectedFilter)
  }, [merchants, selectedFilter])

  // 현재 선택된 필터 정보
  const currentFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === selectedFilter)

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

  // 단일 가맹점 오버레이
  const createSingleOverlayContent = (merchant) => {
    const placeUrl = merchant.place_url || ''
    const categoryColor = getCategoryColor(merchant.business_type)
    return `
      <div class="customoverlay">
        <div class="overlay-info overlay-single">
          <span class="overlay-close" id="closeBtn"></span>
          <span class="overlay-badge" style="background-color: ${categoryColor}">${merchant.business_type}</span>
          <div class="overlay-title">${merchant.name}</div>
          <div class="overlay-meta">${merchant.category}</div>
          <div class="overlay-address-row">
            <span class="overlay-address-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#999">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </span>
            <span class="overlay-address">${merchant.address}</span>
          </div>
          ${placeUrl ?
            `<a href="${placeUrl}" target="_blank" class="overlay-link" style="background: linear-gradient(135deg, ${categoryColor}, ${categoryColor}dd)">매장 상세보기 →</a>` :
            '<span class="overlay-no-link">상세정보 없음</span>'
          }
        </div>
      </div>
    `
  }

  // 다중 가맹점 오버레이 (동일 위치에 여러 가맹점)
  const createMultiOverlayContent = (merchantList) => {
    const itemsHtml = merchantList.map((merchant, index) => {
      const placeUrl = merchant.place_url || ''
      const hasLink = placeUrl ? 'true' : 'false'
      const categoryColor = getCategoryColor(merchant.business_type)
      const iconSvg = getCategoryIconSvg(merchant.business_type)
      return `
        <div class="overlay-item ${placeUrl ? 'clickable' : ''}" data-index="${index}" data-url="${placeUrl}" data-has-link="${hasLink}">
          <div class="overlay-item-icon">${iconSvg}</div>
          <div class="overlay-item-content">
            <div class="overlay-title">${merchant.name}</div>
            <div class="overlay-meta">
              <span class="overlay-badge-small" style="background-color: ${categoryColor}">${merchant.business_type}</span>
              <span class="overlay-category">· ${merchant.category}</span>
            </div>
          </div>
          ${placeUrl ? '<span class="overlay-item-arrow">›</span>' : ''}
        </div>
      `
    }).join('')

    // 아이템 개수가 5개 초과일 때만 스크롤 적용
    const maxItems = 5
    const needsScroll = merchantList.length > maxItems
    const scrollStyle = needsScroll ? 'max-height: 320px; overflow-y: auto;' : ''

    return `
      <div class="customoverlay customoverlay-multi">
        <div class="overlay-info overlay-info-multi">
          <span class="overlay-close" id="closeBtn"></span>
          <div class="overlay-address-header">
            <span class="overlay-address-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#FF6B6B">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </span>
            <span class="overlay-address">${merchantList[0].address}</span>
          </div>
          <div class="overlay-list" style="${scrollStyle}">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `
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

      // 지도 클릭 시 오버레이 닫기
      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) {
          overlayRef.current.setMap(null)
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

    // 기존 오버레이 닫기
    if (overlayRef.current) {
      overlayRef.current.setMap(null)
      overlayRef.current = null
    }

    // 기존 클러스터러 제거
    if (clustererRef.current) {
      clustererRef.current.clear()
      clustererRef.current = null
    }

    // 데이터가 없으면 마커도 없음
    if (merchantsByLocation.size === 0) {
      markersRef.current = []
      return
    }

    // 현재 필터 색상과 아이콘으로 마커 이미지 생성
    const markerColor = currentFilter?.color || '#FF6B6B'
    const markerIconPath = currentFilter?.iconPath || ''
    const markerImage = createMarkerImage(markerColor, markerIconPath)

    // 위치별로 마커 생성 (중복 좌표 처리)
    const markers = []

    merchantsByLocation.forEach((merchantList, key) => {
      const [lat, lng] = key.split(',').map(Number)
      const position = new kakao.maps.LatLng(lat, lng)
      const isMultiple = merchantList.length > 1

      const marker = new kakao.maps.Marker({
        position: position,
        title: isMultiple
          ? `${merchantList[0].name} 외 ${merchantList.length - 1}곳`
          : merchantList[0].name,
        image: markerImage
      })

      // 마커 클릭 이벤트
      kakao.maps.event.addListener(marker, 'click', () => {
        // 기존 오버레이 닫기
        if (overlayRef.current) {
          overlayRef.current.setMap(null)
        }

        // 지도 중앙으로 이동 (부드럽게)
        map.panTo(position)

        // 커스텀 오버레이 생성 (단일 vs 다중)
        const content = isMultiple
          ? createMultiOverlayContent(merchantList)
          : createSingleOverlayContent(merchantList[0])

        const overlay = new kakao.maps.CustomOverlay({
          content: content,
          position: position,
          yAnchor: 1,
          clickable: true
        })
        overlay.setMap(map)
        overlayRef.current = overlay

        // 이벤트 등록
        setTimeout(() => {
          // 닫기 버튼
          const closeBtn = document.getElementById('closeBtn')
          if (closeBtn) {
            closeBtn.onclick = () => {
              overlay.setMap(null)
              overlayRef.current = null
            }
          }

          // 다중 오버레이 아이템 클릭 이벤트
          if (isMultiple) {
            const items = document.querySelectorAll('.overlay-item')
            items.forEach(item => {
              item.onclick = () => {
                const url = item.dataset.url
                if (url) {
                  window.open(url, '_blank')
                }
              }
            })
          }
        }, 0)
      })

      markers.push(marker)
    })

    // 마커 클러스터러 생성 (필터 색상 적용)
    const clusterer = new kakao.maps.MarkerClusterer({
      map: map,
      markers: markers,
      gridSize: 60,
      averageCenter: true,
      minLevel: 4,
      styles: [{
        width: '50px',
        height: '50px',
        background: markerColor,
        borderRadius: '50%',
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        lineHeight: '50px',
        fontSize: '14px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
      }]
    })
    clustererRef.current = clusterer
    markersRef.current = markers
  }, [merchantsByLocation, mapLoaded, currentFilter])

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
      <header className="header">
        <div className="header-title">
          <img src={`${import.meta.env.BASE_URL}appicon.png`} alt="앱 아이콘" className="app-icon" />
          <div className="title-text">
            <h1>성남 아이포인트</h1>
            <p className="subtitle">놓치지 않는 아동수당 가맹점 지도</p>
          </div>
        </div>
        <div className="header-info">
          <span className={`status ${source || ''}`}>
            {loading ? '⏳' : source === 'cache' ? '💾' : source === 'network' ? '☁️' : '❌'}
            {' '}{message}
          </span>
        </div>
      </header>

      <div className="content">
        {/* 업종 필터 버튼 (플로팅) */}
        <div className="filter-bar">
          {BUSINESS_TYPE_FILTERS.map(filter => {
            const isActive = selectedFilter === filter.key
            return (
              <button
                key={filter.key}
                className={`filter-btn ${isActive ? 'active' : ''}`}
                style={{
                  '--filter-color': filter.color,
                  backgroundColor: isActive ? filter.color : '#fff',
                  borderColor: filter.color,
                  color: isActive ? '#fff' : filter.color,
                }}
                onClick={() => setSelectedFilter(filter.key)}
              >
                <span className="filter-icon">{filter.icon}</span>
                {filter.label}
              </button>
            )
          })}
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
      </div>
    </div>
  )
}

export default App
