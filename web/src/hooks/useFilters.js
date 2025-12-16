import { useState, useCallback } from 'react'

export function useFilters(initialFilters = ['음식점'], onFilterChange) {
  const [selectedFilters, setSelectedFilters] = useState(initialFilters)
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [tempSelectedFilters, setTempSelectedFilters] = useState([])

  // 필터 변경 시 콜백 호출 래퍼
  const updateFilters = useCallback((newFilters) => {
    setSelectedFilters(newFilters)
    onFilterChange?.()
  }, [onFilterChange])

  // 필터 칩 클릭 핸들러
  const handleFilterClick = useCallback((filterKey) => {
    setSelectedFilters(prev => {
      if (prev.includes(filterKey)) {
        if (prev.length > 1) {
          const newFilters = prev.filter(f => f !== filterKey)
          onFilterChange?.()
          return newFilters
        }
        return prev // 마지막 하나는 제거 불가
      }
      if (prev.length < 2) {
        const newFilters = [...prev, filterKey]
        onFilterChange?.()
        return newFilters
      }
      return prev
    })
  }, [onFilterChange])

  // 필터 제거 핸들러 (X 버튼)
  const handleRemoveFilter = useCallback((filterKey, e) => {
    e?.stopPropagation()
    setSelectedFilters(prev => {
      if (prev.length > 1) {
        const newFilters = prev.filter(f => f !== filterKey)
        onFilterChange?.()
        return newFilters
      }
      return prev
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

  // 임시 필터 토글 (바텀시트 내)
  const toggleTempFilter = useCallback((filterKey) => {
    setTempSelectedFilters(prev => {
      if (prev.includes(filterKey)) {
        if (prev.length > 1) {
          return prev.filter(f => f !== filterKey)
        }
        return prev
      }
      if (prev.length < 2) {
        return [...prev, filterKey]
      }
      return prev
    })
  }, [])

  // 필터 적용 (바텀시트 저장)
  const applyFilters = useCallback(() => {
    if (tempSelectedFilters.length > 0) {
      setSelectedFilters(tempSelectedFilters)
      onFilterChange?.()
    }
    setShowCategorySheet(false)
    setTempSelectedFilters([])
  }, [tempSelectedFilters, onFilterChange])

  // 필터 초기화
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
