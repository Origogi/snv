import { BUSINESS_TYPE_FILTERS } from '../constants/categories'

// 전체 카테고리 수
const TOTAL_CATEGORIES = BUSINESS_TYPE_FILTERS.length

// 카테고리 아이콘 렌더링 헬퍼
const getCategoryIcon = (filter) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d={filter.iconPath} />
  </svg>
)

// 눈 아이콘 (전체보기용)
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
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
  onFilterClick,
  onRemoveFilter,
  onMoreClick,
}) {
  const selectedCount = selectedFilters.length
  const isAllSelected = selectedCount === 0 || selectedCount === TOTAL_CATEGORIES

  // 1. 전체 모드: 0개 또는 11개(전체) 선택 시
  if (isAllSelected) {
    return (
      <div className={`filter-bar ${hidden ? 'hidden' : ''}`}>
        {/* 전체 칩 - 터치 이벤트 없음 */}
        <div className="filter-btn active filter-all-btn filter-no-touch">
          <span className="filter-icon"><EyeIcon /></span>
          전체
        </div>
        {/* 필터 아이콘 버튼 */}
        <button className="filter-icon-btn" onClick={onMoreClick}>
          <FilterIcon />
        </button>
      </div>
    )
  }

  // 2. 개별 확인 모드: 1~2개 선택 시
  if (selectedCount <= 2) {
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

  // 3. 요약 모드: 3개 이상 선택 시
  const firstFilter = BUSINESS_TYPE_FILTERS.find(f => f.key === selectedFilters[0])
  const remainingCount = selectedCount - 1

  return (
    <div className={`filter-bar ${hidden ? 'hidden' : ''}`}>
      {/* 첫 번째 카테고리 칩 - 터치 이벤트 없음, X 버튼으로만 제거 */}
      {firstFilter && (
        <div
          className="filter-btn active filter-no-touch"
          style={{
            '--filter-color': firstFilter.color,
            backgroundColor: firstFilter.color,
            borderColor: firstFilter.color,
            color: '#fff',
          }}
        >
          <span className="filter-icon">{getCategoryIcon(firstFilter)}</span>
          {firstFilter.label}
          <button
            className="filter-remove"
            onClick={(e) => onRemoveFilter(firstFilter.key, e)}
          >
            <CloseIcon />
          </button>
        </div>
      )}
      {/* 요약 칩: 외 N개 */}
      <div className="filter-btn filter-summary-btn filter-no-touch">
        외 {remainingCount}개
      </div>
      {/* 필터 아이콘 버튼 */}
      <button className="filter-icon-btn" onClick={onMoreClick}>
        <FilterIcon />
      </button>
    </div>
  )
}
