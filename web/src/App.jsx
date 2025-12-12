import { useEffect, useRef, useState, useMemo } from 'react'
import { useMerchants } from './hooks/useMerchants'
import './App.css'

function App() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const overlayRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Supabase + IndexedDB 캐시로 데이터 로드
  const { merchants, loading, source, message } = useMerchants()

  // 좌표별로 가맹점 그룹화 (중복 좌표 처리)
  const merchantsByLocation = useMemo(() => {
    const locationMap = new Map()

    merchants.filter(m => m.coords).forEach(merchant => {
      const key = `${merchant.coords.lat},${merchant.coords.lng}`
      if (!locationMap.has(key)) {
        locationMap.set(key, [])
      }
      locationMap.get(key).push(merchant)
    })

    return locationMap
  }, [merchants])

  // 단일 가맹점 오버레이
  const createSingleOverlayContent = (merchant) => {
    const placeUrl = merchant.place_url || ''
    return `
      <div class="customoverlay">
        <div class="overlay-info">
          <span class="overlay-close" id="closeBtn"></span>
          <div class="overlay-title">${merchant.name}</div>
          <div class="overlay-meta"><span class="overlay-meta-type">${merchant.business_type}</span> · ${merchant.category}</div>
          <div class="overlay-address">${merchant.address}</div>
          ${placeUrl ?
            `<a href="${placeUrl}" target="_blank" class="overlay-link">상세 보기</a>` :
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
      return `
        <div class="overlay-item ${placeUrl ? 'clickable' : ''}" data-index="${index}" data-url="${placeUrl}" data-has-link="${hasLink}">
          <div class="overlay-title">${merchant.name}</div>
          <div class="overlay-meta"><span class="overlay-meta-type">${merchant.business_type}</span> · ${merchant.category}</div>
        </div>
      `
    }).join('')

    // 아이템 개수가 5개 초과일 때만 스크롤 적용
    const maxItems = 5
    const needsScroll = merchantList.length > maxItems
    const scrollStyle = needsScroll ? 'max-height: 300px; overflow-y: auto;' : ''

    return `
      <div class="customoverlay customoverlay-multi">
        <div class="overlay-info overlay-info-multi">
          <span class="overlay-close" id="closeBtn"></span>
          <div class="overlay-address">${merchantList[0].address}</div>
          <div class="overlay-list" style="${scrollStyle}">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `
  }

  // 지도 초기화 및 마커 표시 (클러스터링 적용)
  useEffect(() => {
    if (merchantsByLocation.size === 0) return

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
            : merchantList[0].name
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

      // 마커 클러스터러 생성
      new kakao.maps.MarkerClusterer({
        map: map,
        markers: markers,
        gridSize: 60,
        averageCenter: true,
        minLevel: 4,
        styles: [{
          width: '50px',
          height: '50px',
          background: 'rgba(255, 229, 0, 0.9)',
          borderRadius: '50%',
          color: '#333',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: '50px',
          fontSize: '14px'
        }]
      })

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
  }, [merchantsByLocation])

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
