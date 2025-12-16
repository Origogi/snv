import { useState, useEffect, useCallback } from 'react'
import { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from '../constants/config'

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState([])

  // 컴포넌트 마운트 시 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    } catch (e) {
      console.error('최근 검색어 로드 실패:', e)
    }
  }, [])

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
