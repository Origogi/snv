import { BUSINESS_TYPE_FILTERS } from '../constants/categories'

// 카테고리 아이콘 렌더링 헬퍼
const getCategoryIcon = (filter) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d={filter.iconPath} />
  </svg>
)

// 필터 아이콘
const FilterIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
  </svg>
)

// X 아이콘 (화이트)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
)

export function FilterBar({
  selectedFilters,
  hidden,
  onRemoveFilter,
  onMoreClick,
}) {
  const selectedCount = selectedFilters.length

  // 선택된 카테고리 칩들 (1~3개, 가로 스크롤 지원)
  return (
    <div className={`filter-bar ${hidden ? 'hidden' : ''}`}>
      {selectedFilters.map(filterKey => {
        const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === filterKey)
        if (!filter) return null
        return (
          <div
            key={filter.key}
            className="filter-btn active filter-no-touch"
            style={{
              '--filter-color': filter.color,
              backgroundColor: filter.color,
              borderColor: filter.color,
              color: '#fff',
            }}
          >
            <span className="filter-icon">{getCategoryIcon(filter)}</span>
            {filter.label}
            {/* 최소 1개 유지 - 1개일 때 X 버튼 숨김 */}
            {selectedCount > 1 && (
              <button
                className="filter-remove"
                onClick={(e) => onRemoveFilter(filter.key, e)}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )
      })}
      {/* 필터 아이콘 버튼 */}
      <button className="filter-icon-btn" onClick={onMoreClick}>
        <FilterIcon />
      </button>
    </div>
  )
}
