import { useState, useCallback } from 'react'
import { BUSINESS_TYPE_FILTERS } from '../constants/categories'

const MAX_FILTERS = 3

// 카테고리 아이콘 렌더링 헬퍼
const getCategoryIcon = (filter) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d={filter.iconPath} />
  </svg>
)

// 내부 컨텐츠 컴포넌트 - 상태를 내부에서 관리하여 App 리렌더링 방지
function SheetContent({ selectedFilters, categoryCounts, onClose, onApply }) {
  // selectedFilters를 초기값으로 사용 (컴포넌트 마운트 시 1회)
  const [tempSelected, setTempSelected] = useState(() => [...selectedFilters])

  const handleToggle = useCallback((filterKey) => {
    setTempSelected(prev => {
      if (prev.includes(filterKey)) {
        if (prev.length <= 1) return prev
        return prev.filter(f => f !== filterKey)
      }
      if (prev.length >= MAX_FILTERS) return prev
      return [...prev, filterKey]
    })
  }, [])

  const handleReset = useCallback(() => {
    setTempSelected(['음식점'])
  }, [])

  const handleApply = useCallback(() => {
    if (tempSelected.length === 0) return
    onApply(tempSelected)
  }, [tempSelected, onApply])

  return (
    <div className="category-sheet-overlay" onClick={onClose}>
      <div className="category-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="category-sheet-header">
          <h2 className="category-sheet-title">카테고리 선택</h2>
          <p className="category-sheet-subtitle">원하는 카테고리를 선택하세요 (최대 3개)</p>
          <button className="category-sheet-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="category-sheet-grid">
          {BUSINESS_TYPE_FILTERS.map(filter => {
            const isSelected = tempSelected.includes(filter.key)
            const count = categoryCounts[filter.key] || 0
            const isMaxSelected = tempSelected.length >= MAX_FILTERS
            const isDisabled = !isSelected && isMaxSelected
            return (
              <button
                key={filter.key}
                className={`category-chip ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                style={{
                  '--chip-color': filter.color,
                  borderColor: isSelected ? filter.color : '#e0e0e0',
                  backgroundColor: isSelected ? `${filter.color}15` : '#fff',
                }}
                onClick={() => handleToggle(filter.key)}
                disabled={isDisabled}
              >
                <span className="category-chip-icon" style={{ color: filter.color }}>
                  {getCategoryIcon(filter)}
                </span>
                <span className="category-chip-label">{filter.label}</span>
                <span className="category-chip-count">{count.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
        <div className="category-sheet-footer">
          <button className="category-sheet-reset" onClick={handleReset}>
            초기화
          </button>
          <button className="category-sheet-apply" onClick={handleApply}>
            {tempSelected.length === 0 ? '전체보기 적용' : `${tempSelected.length}개 카테고리 적용`}
          </button>
        </div>
      </div>
    </div>
  )
}

// 외부 컴포넌트 - show가 true일 때만 SheetContent를 렌더링
// key를 사용하여 열릴 때마다 새로운 인스턴스 생성 (초기값 적용)
export function CategorySheet({ show, selectedFilters, categoryCounts, onClose, onApply }) {
  if (!show) return null

  return (
    <SheetContent
      key={selectedFilters.join(',')}
      selectedFilters={selectedFilters}
      categoryCounts={categoryCounts}
      onClose={onClose}
      onApply={onApply}
    />
  )
}
