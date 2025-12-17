import { useState, useCallback, useEffect, useRef } from 'react'
import { useRecentSearches } from './useRecentSearches'
import { SEONGNAM_CENTER, SEARCH_ZOOM_LEVEL } from '../constants/config'

export function useSearch(mapInstanceRef, onSearchChange) {
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  const {
    recentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearAllRecentSearches,
  } = useRecentSearches()

  // 검색 활성화 (오버레이 열기)
  const activateSearch = useCallback(() => {
    onSearchChange?.() // 바텀시트 닫기
    setIsSearchActive(true)
    window.history.pushState({ searchActive: true }, '')
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
  }, [onSearchChange])

  // 검색 비활성화 (오버레이 닫기)
  const deactivateSearch = useCallback((clearQuery = true) => {
    setIsSearchActive(false)
    if (clearQuery) {
      setSearchQuery('')
    }
  }, [])

  // 검색 실행
  const executeSearch = useCallback((query) => {
    const trimmed = query.trim()

    if (trimmed) {
      saveRecentSearch(trimmed)
      setAppliedSearchQuery(trimmed)
      onSearchChange?.()

      // 성남시 중심으로 카메라 이동 및 줌 아웃
      if (mapInstanceRef?.current) {
        const center = new window.kakao.maps.LatLng(SEONGNAM_CENTER.lat, SEONGNAM_CENTER.lng)
        mapInstanceRef.current.setCenter(center)
        mapInstanceRef.current.setLevel(SEARCH_ZOOM_LEVEL)
      }
    } else {
      setAppliedSearchQuery('')
    }

    setIsSearchActive(false)
    setSearchQuery(trimmed)
  }, [saveRecentSearch, mapInstanceRef, onSearchChange])

  // 검색어 초기화
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setAppliedSearchQuery('')
    onSearchChange?.()
    searchInputRef.current?.focus()
  }, [onSearchChange])

  // 검색 결과 초기화 (X 버튼)
  const clearAppliedSearch = useCallback(() => {
    setAppliedSearchQuery('')
    setSearchQuery('')
    onSearchChange?.()
  }, [onSearchChange])

  // 뒤로가기 핸들러
  useEffect(() => {
    const handlePopState = () => {
      if (isSearchActive) {
        deactivateSearch()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isSearchActive, deactivateSearch])

  // 검색 모드 여부
  const isSearchMode = Boolean(appliedSearchQuery)

  return {
    isSearchActive,
    searchQuery,
    setSearchQuery,
    appliedSearchQuery,
    searchInputRef,
    recentSearches,
    isSearchMode,
    activateSearch,
    deactivateSearch,
    executeSearch,
    clearSearch,
    clearAppliedSearch,
    removeRecentSearch,
    clearAllRecentSearches,
  }
}
