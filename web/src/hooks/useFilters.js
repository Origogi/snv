import { useState, useCallback } from 'react'

// 최대 필터 개수 제한
const MAX_FILTERS = 3

// 기본값: 음식점 (전체보기 비활성화 - 최소 1개 필터 필수)
export function useFilters(initialFilters = ['음식점'], onFilterChange) {
  const [selectedFilters, setSelectedFilters] = useState(() =>
    initialFilters.length > 0 ? initialFilters : ['음식점']
  )
  const [showCategorySheet, setShowCategorySheet] = useState(false)

  // 필터 칩 클릭 핸들러 - 클릭 시 해당 필터 제거 (최소 1개 유지)
  const handleFilterClick = useCallback((filterKey) => {
    setSelectedFilters(prev => {
      if (prev.includes(filterKey)) {
        if (prev.length <= 1) return prev
        const newFilters = prev.filter(f => f !== filterKey)
        onFilterChange?.()
        return newFilters
      }
      if (prev.length >= MAX_FILTERS) return prev
      const newFilters = [...prev, filterKey]
      onFilterChange?.()
      return newFilters
    })
  }, [onFilterChange])

  // 필터 제거 핸들러 (X 버튼) - 최소 1개 유지
  const handleRemoveFilter = useCallback((filterKey, e) => {
    e?.stopPropagation()
    setSelectedFilters(prev => {
      if (prev.length <= 1) return prev
      const newFilters = prev.filter(f => f !== filterKey)
      onFilterChange?.()
      return newFilters
    })
  }, [onFilterChange])

  // 카테고리 선택 바텀시트 열기
  const openCategorySheet = useCallback(() => {
    onFilterChange?.() // 바텀시트 닫기
    setShowCategorySheet(true)
  }, [onFilterChange])

  // 카테고리 선택 바텀시트 닫기
  const closeCategorySheet = useCallback(() => {
    setShowCategorySheet(false)
  }, [])

  // 필터 적용 (CategorySheet에서 호출) - 새 필터 배열을 인자로 받음
  const applyFilters = useCallback((newFilters) => {
    if (!newFilters || newFilters.length === 0) return
    setSelectedFilters(newFilters)
    onFilterChange?.()
    setShowCategorySheet(false)
  }, [onFilterChange])

  return {
    selectedFilters,
    showCategorySheet,
    handleFilterClick,
    handleRemoveFilter,
    openCategorySheet,
    closeCategorySheet,
    applyFilters,
  }
}
