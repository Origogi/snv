import { BUSINESS_TYPE_FILTERS } from '../constants/categories'

// 카테고리 아이콘 렌더링 헬퍼
const getCategoryIcon = (filter) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d={filter.iconPath} />
  </svg>
)

export function FilterBar({
  selectedFilters,
  hidden,
  onFilterClick,
  onRemoveFilter,
  onMoreClick,
}) {
  return (
    <div className={`filter-bar ${hidden ? 'hidden' : ''}`}>
      {selectedFilters.map(filterKey => {
        const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === filterKey)
        if (!filter) return null
        return (
          <button
            key={filter.key}
            className="filter-btn active"
            style={{
              '--filter-color': filter.color,
              backgroundColor: filter.color,
              borderColor: filter.color,
              color: '#fff',
            }}
            onClick={() => onFilterClick(filter.key)}
          >
            <span className="filter-icon">{getCategoryIcon(filter)}</span>
            {filter.label}
            {selectedFilters.length === 2 && (
              <span
                className="filter-remove"
                onClick={(e) => onRemoveFilter(filter.key, e)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </span>
            )}
          </button>
        )
      })}
      {/* + 더보기 버튼 */}
      <button className="filter-btn filter-more-btn" onClick={onMoreClick}>
        <span className="filter-more-icon">+</span>
        더보기
      </button>
    </div>
  )
}
