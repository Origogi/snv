import { useState, useCallback } from 'react'
import { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from '../constants/config'

// localStorage에서 초기값 로드
function getInitialSearches() {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState(getInitialSearches)

  // 검색어 저장
  const saveRecentSearch = useCallback((query) => {
    if (!query.trim()) return
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== query)
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // 검색어 삭제
  const removeRecentSearch = useCallback((query) => {
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== query)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // 전체 삭제
  const clearAllRecentSearches = useCallback(() => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }, [])

  return {
    recentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearAllRecentSearches,
  }
}
