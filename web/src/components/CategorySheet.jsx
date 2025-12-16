import { BUSINESS_TYPE_FILTERS } from '../constants/categories'

// 카테고리 아이콘 렌더링 헬퍼
const getCategoryIcon = (filter) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d={filter.iconPath} />
  </svg>
)

export function CategorySheet({
  show,
  tempSelectedFilters,
  merchants,
  onClose,
  onToggle,
  onApply,
  onReset,
}) {
  if (!show) return null

  return (
    <div className="category-sheet-overlay" onClick={onClose}>
      <div className="category-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="category-sheet-header">
          <h2 className="category-sheet-title">카테고리 선택</h2>
          <p className="category-sheet-subtitle">최대 2개까지 선택할 수 있어요</p>
          <button className="category-sheet-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="category-sheet-grid">
          {BUSINESS_TYPE_FILTERS.map(filter => {
            const isSelected = tempSelectedFilters.includes(filter.key)
            const count = merchants.filter(m => m.business_type === filter.key).length
            const isDisabled = !isSelected && tempSelectedFilters.length >= 2
            return (
              <button
                key={filter.key}
                className={`category-chip ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                style={{
                  '--chip-color': filter.color,
                  borderColor: isSelected ? filter.color : '#e0e0e0',
                  backgroundColor: isSelected ? `${filter.color}15` : '#fff',
                }}
                onClick={() => !isDisabled && onToggle(filter.key)}
                disabled={isDisabled}
              >
                <span
                  className="category-chip-icon"
                  style={{ color: filter.color }}
                >
                  {getCategoryIcon(filter)}
                </span>
                <span className="category-chip-label">{filter.label}</span>
                <span className="category-chip-count">{count.toLocaleString()}</span>
                {isSelected && (
                  <span className="category-chip-check" style={{ color: filter.color }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="category-sheet-footer">
          <button className="category-sheet-reset" onClick={onReset}>
            초기화
          </button>
          <button className="category-sheet-apply" onClick={onApply}>
            {tempSelectedFilters.length}개 카테고리 적용
          </button>
        </div>
      </div>
    </div>
  )
}
