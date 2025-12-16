import { useState, useCallback } from 'react'

// 최대 필터 개수 제한
const MAX_FILTERS = 3

// 기본값: 음식점 (전체보기 비활성화 - 최소 1개 필터 필수)
export function useFilters(initialFilters = ['음식점'], onFilterChange) {
  const [selectedFilters, setSelectedFilters] = useState(initialFilters.length > 0 ? initialFilters : ['음식점'])
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [tempSelectedFilters, setTempSelectedFilters] = useState([])

  // 필터 변경 시 콜백 호출 래퍼
  const updateFilters = useCallback((newFilters) => {
    setSelectedFilters(newFilters)
    onFilterChange?.()
  }, [onFilterChange])

  // 필터 칩 클릭 핸들러 - 클릭 시 해당 필터 제거 (최소 1개 유지)
  const handleFilterClick = useCallback((filterKey) => {
    setSelectedFilters(prev => {
      if (prev.includes(filterKey)) {
        // 최소 1개 유지 - 마지막 하나면 제거 불가
        if (prev.length <= 1) {
          return prev
        }
        const newFilters = prev.filter(f => f !== filterKey)
        onFilterChange?.()
        return newFilters
      }
      // 최대 3개 제한
      if (prev.length >= MAX_FILTERS) {
        return prev
      }
      const newFilters = [...prev, filterKey]
      onFilterChange?.()
      return newFilters
    })
  }, [onFilterChange])

  // 필터 제거 핸들러 (X 버튼) - 최소 1개 유지
  const handleRemoveFilter = useCallback((filterKey, e) => {
    e?.stopPropagation()
    setSelectedFilters(prev => {
      // 최소 1개 유지 - 마지막 하나면 제거 불가
      if (prev.length <= 1) {
        return prev
      }
      const newFilters = prev.filter(f => f !== filterKey)
      onFilterChange?.()
      return newFilters
    })
  }, [onFilterChange])

  // 카테고리 선택 바텀시트 열기
  const openCategorySheet = useCallback(() => {
    setTempSelectedFilters([...selectedFilters])
    setShowCategorySheet(true)
  }, [selectedFilters])

  // 카테고리 선택 바텀시트 닫기
  const closeCategorySheet = useCallback(() => {
    setShowCategorySheet(false)
    setTempSelectedFilters([])
  }, [])

  // 임시 필터 토글 (바텀시트 내) - 최소 1개, 최대 3개 제한
  const toggleTempFilter = useCallback((filterKey) => {
    setTempSelectedFilters(prev => {
      if (prev.includes(filterKey)) {
        // 최소 1개 유지
        if (prev.length <= 1) {
          return prev
        }
        return prev.filter(f => f !== filterKey)
      }
      // 최대 3개 제한
      if (prev.length >= MAX_FILTERS) {
        return prev
      }
      return [...prev, filterKey]
    })
  }, [])

  // 필터 적용 (바텀시트 저장) - 최소 1개 필수
  const applyFilters = useCallback(() => {
    // 빈 배열이면 적용 불가
    if (tempSelectedFilters.length === 0) {
      return
    }
    setSelectedFilters(tempSelectedFilters)
    onFilterChange?.()
    setShowCategorySheet(false)
    setTempSelectedFilters([])
  }, [tempSelectedFilters, onFilterChange])

  // 필터 초기화 → 음식점으로 복귀 (전체보기 비활성화)
  const resetFilters = useCallback(() => {
    setTempSelectedFilters(['음식점'])
  }, [])

  return {
    selectedFilters,
    showCategorySheet,
    tempSelectedFilters,
    handleFilterClick,
    handleRemoveFilter,
    openCategorySheet,
    closeCategorySheet,
    toggleTempFilter,
    applyFilters,
    resetFilters,
  }
}
