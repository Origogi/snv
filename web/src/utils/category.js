import { BUSINESS_TYPE_FILTERS } from '../constants/categories'

// 카테고리별 색상 조회
export const getCategoryColor = (businessType) => {
  const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === businessType)
  return filter?.color || '#FF6B6B'
}

// 카테고리별 필터 정보 조회
export const getCategoryFilter = (businessType) => {
  return BUSINESS_TYPE_FILTERS.find(f => f.key === businessType)
}

// 카테고리 아이콘 path 조회
export const getCategoryIconPath = (businessType) => {
  const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === businessType)
  return filter?.iconPath || ''
}
