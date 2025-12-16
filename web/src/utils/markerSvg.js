import { BRAND_COLOR } from '../constants/config'
import { BUSINESS_TYPE_FILTERS } from '../constants/categories'

// 카테고리별 아이콘 SVG 생성
export const getCategoryIconSvg = (businessType) => {
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

// 복합 카테고리 클러스터 SVG 생성 (브랜드 컬러 사용)
export const createMixedClusterSvg = (total) => {
  const size = 52
  const center = size / 2
  const radius = 20
  const strokeWidth = 6
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const shadowId = `mixedClusterShadow-${uniqueId}`

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="${shadowId}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
        </filter>
      </defs>
      <circle cx="${center}" cy="${center}" r="${radius + strokeWidth/2 + 2}" fill="white" filter="url(#${shadowId})"/>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${BRAND_COLOR}" stroke-width="${strokeWidth}"/>
      <circle cx="${center}" cy="${center}" r="${radius - strokeWidth/2 - 1}" fill="white"/>
      <text
        x="${center}"
        y="${center}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="'Noto Sans KR', sans-serif"
        font-size="${total >= 1000 ? 11 : total >= 100 ? 13 : 15}"
        font-weight="bold"
        fill="${BRAND_COLOR}"
      >${total >= 1000 ? Math.floor(total/1000) + 'k' : total}</text>
    </svg>
  `
}

// 단일 필터 클러스터 SVG 생성
export const createSingleClusterSvg = (color, total) => {
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

// 복합 마커 SVG 생성 (같은 위치에 여러 업종이 있을 때) - 브랜드 컬러 + 스타 아이콘
export const createMultiTypeMarkerSvg = (count) => {
  const size = 36
  const center = size / 2
  const radius = center - 2
  const uniqueId = `multi-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

  // 스타 아이콘 path (다양한 혜택이 모여 있는 핫스팟)
  const starIconPath = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="multiShadow-${uniqueId}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
        </filter>
      </defs>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="${BRAND_COLOR}" filter="url(#multiShadow-${uniqueId})"/>
      <g transform="translate(${center - 9}, ${center - 9}) scale(0.75)">
        <path d="${starIconPath}" fill="white"/>
      </g>
      <circle cx="${size - 8}" cy="${size - 8}" r="8" fill="white" stroke="none"/>
      <text x="${size - 8}" y="${size - 8}" text-anchor="middle" dominant-baseline="central" font-family="'Noto Sans KR', sans-serif" font-size="10" font-weight="bold" fill="#333">${count}</text>
    </svg>
  `
}

// 단일 타입 마커 + 숫자 뱃지 SVG 생성 (같은 위치에 같은 업종 여러 개)
export const createSingleTypeMarkerWithBadgeSvg = (color, iconPath, count) => {
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

// 선택된 마커 오버레이용 SVG 콘텐츠 생성
export const createSelectedMarkerContent = (color, iconPath, isMultiType = false) => {
  const pinColor = isMultiType ? BRAND_COLOR : color
  const pulseColor = pinColor + '80' // 50% alpha
  const starIconPath = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'

  const iconContent = isMultiType ? `
    <g transform="translate(12, 10) scale(1)">
      <path d="${starIconPath}" fill="${BRAND_COLOR}"/>
    </g>
  ` : `
    <g transform="translate(12, 10) scale(1)">
      <path d="${iconPath}" fill="${color}"/>
    </g>
  `

  return `
    <div class="selected-marker-container">
      <div class="selected-marker-pulse" style="background: ${pulseColor};"></div>
      <div class="selected-marker-pin">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
          <defs>
            <filter id="pinShadow" x="-50%" y="-20%" width="200%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
          </defs>
          <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 36 24 36s24-18 24-36C48 10.745 37.255 0 24 0z" fill="${pinColor}" filter="url(#pinShadow)"/>
          <circle cx="24" cy="22" r="17" fill="white" opacity="0.95"/>
          ${iconContent}
        </svg>
      </div>
    </div>
  `
}
