import { forwardRef } from 'react'
import { RECENT_SEARCHES_KEY } from '../constants/config'

export const SearchBar = forwardRef(function SearchBar({
  isSearchActive,
  isSearchMode,
  searchQuery,
  appliedSearchQuery,
  filteredCount,
  searchInputRef,
  recentSearches,
  onActivate,
  onDeactivate,
  onSearch,
  onClear,
  onClearApplied,
  onQueryChange,
  onRemoveRecent,
  onClearAllRecent,
  onMenuClick,
}, ref) {
  return (
    <div className={`unified-search-bar ${isSearchActive ? 'active' : ''} ${isSearchMode ? 'has-query' : ''}`}>
      {/* 대기 상태 (Idle) */}
      {!isSearchActive ? (
        <div className="search-bar-idle" onClick={onActivate}>
          <div
            ref={ref}
            className="search-bar-icon"
            onClick={(e) => {
              e.stopPropagation()
              onMenuClick?.()
            }}
          >
            <img src={`${import.meta.env.BASE_URL}ogimage.jpg`} alt="앱 아이콘" className="search-bar-app-icon" />
          </div>
          <div className="search-bar-placeholder">
            {isSearchMode ? (
              <span className="search-bar-query">{appliedSearchQuery}</span>
            ) : (
              <span className="search-bar-title">성남 아동수당 사용처 찾기</span>
            )}
          </div>
          {/* 검색 아이콘 (우측) */}
          {!isSearchMode && (
            <div className="search-bar-search-icon">
              <svg viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
          )}
          {/* 검색 모드일 때 결과 개수 + X 버튼 표시 */}
          {isSearchMode && (
            <>
              <span className="search-bar-count">{filteredCount}개</span>
              <button
                className="search-bar-clear-idle"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearApplied()
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#999">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </>
          )}
        </div>
      ) : (
        /* 활성 상태 (Active) */
        <div className="search-bar-active">
          <button className="search-bar-back" onClick={() => onDeactivate()}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#333">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <input
            ref={searchInputRef}
            type="text"
            className="search-bar-input"
            placeholder="가맹점 이름, 주소 검색"
            value={searchQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearch(searchQuery)
              }
            }}
          />
          {searchQuery && (
            <button className="search-bar-clear" onClick={onClear}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#999">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 검색 드롭다운 (PC: 검색바 내부, 모바일: 별도 오버레이) */}
      {isSearchActive && (
        <div className="search-overlay" onClick={() => onDeactivate()}>
          <div className="search-overlay-content" onClick={(e) => e.stopPropagation()}>
            {/* 최근 검색어 영역 */}
            {recentSearches.length > 0 && (
              <div className="search-recent">
                <div className="search-recent-header">
                  <span className="search-recent-title">최근 검색어</span>
                  <button className="search-recent-clear-all" onClick={onClearAllRecent}>
                    전체 삭제
                  </button>
                </div>
                <div className="search-recent-chips">
                  {recentSearches.map((query, index) => (
                    <button
                      key={index}
                      className="search-recent-chip"
                      onClick={() => onSearch(query)}
                    >
                      <span className="search-recent-chip-text">{query}</span>
                      <span
                        className="search-recent-chip-remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveRecent(query)
                        }}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 안내 영역 */}
            <div className={recentSearches.length > 0 ? 'search-guide' : 'search-empty'}>
              <div className={recentSearches.length > 0 ? 'search-guide-icon' : 'search-empty-icon'}>
                <svg viewBox="0 0 24 24">
                  <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
                </svg>
              </div>
              <div className={recentSearches.length > 0 ? 'search-guide-title' : 'search-empty-title'}>
                가맹점을 찾아보세요
              </div>
              <div className={recentSearches.length > 0 ? 'search-guide-desc' : 'search-empty-desc'}>
                상호명이나 동네 이름으로<br />
                성남 아동수당 포인트 가맹점을 검색할 수 있습니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
