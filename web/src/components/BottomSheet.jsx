import { BUSINESS_TYPE_FILTERS } from '../constants/categories'
import { getCategoryColor } from '../utils/category'
import { extractRoadName } from '../utils/address'

export function BottomSheet({ merchants, onClose }) {
  if (!merchants) return null

  const isSingle = merchants.length === 1

  return (
    <div className={`bottom-sheet ${merchants ? 'open' : ''}`}>
      <div className="bottom-sheet-content">
        <button className="bottom-sheet-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        {isSingle ? (
          <SingleMerchantSheet merchant={merchants[0]} />
        ) : (
          <MultiMerchantSheet merchants={merchants} />
        )}
      </div>
    </div>
  )
}

function SingleMerchantSheet({ merchant }) {
  const categoryColor = getCategoryColor(merchant.business_type)

  return (
    <div className="bottom-sheet-single">
      <div className="bottom-sheet-header">
        <span
          className="bottom-sheet-badge"
          style={{ backgroundColor: categoryColor }}
        >
          {merchant.business_type}
        </span>
        <span className="bottom-sheet-category">{merchant.category}</span>
      </div>
      <h2 className="bottom-sheet-title">{merchant.name}</h2>
      <div className="bottom-sheet-address">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="#aaa">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span>{merchant.address}</span>
      </div>
      {merchant.place_url ? (
        <a
          href={merchant.place_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bottom-sheet-link"
          style={{
            background: `linear-gradient(135deg, ${categoryColor}, ${categoryColor}dd)`
          }}
        >
          매장 상세정보 확인
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
          </svg>
        </a>
      ) : (
        <span className="bottom-sheet-no-link">상세정보 없음</span>
      )}
    </div>
  )
}

function MultiMerchantSheet({ merchants }) {
  return (
    <div className="bottom-sheet-multi">
      <h2 className="bottom-sheet-multi-title">
        이 위치에 <span className="highlight">{merchants.length}개</span>의 가맹점이 있어요
      </h2>
      <div className="bottom-sheet-address-header">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="#aaa">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span>{extractRoadName(merchants[0].address)} 인근</span>
      </div>
      <div className="bottom-sheet-list">
        {merchants.map((merchant, index) => (
          <MerchantListItem key={index} merchant={merchant} />
        ))}
      </div>
    </div>
  )
}

function MerchantListItem({ merchant }) {
  const categoryColor = getCategoryColor(merchant.business_type)
  const filter = BUSINESS_TYPE_FILTERS.find(f => f.key === merchant.business_type)

  return (
    <div
      className={`bottom-sheet-item ${merchant.place_url ? 'clickable' : ''}`}
      onClick={() => merchant.place_url && window.open(merchant.place_url, '_blank')}
    >
      <div
        className="bottom-sheet-item-icon-rounded"
        style={{ backgroundColor: `${categoryColor}15`, borderColor: `${categoryColor}30` }}
        dangerouslySetInnerHTML={{
          __html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="${categoryColor}">
            <path d="${filter?.iconPath || ''}"/>
          </svg>`
        }}
      />
      <div className="bottom-sheet-item-content">
        <div className="bottom-sheet-item-meta">
          <span
            className="bottom-sheet-badge-small"
            style={{ backgroundColor: categoryColor }}
          >
            {merchant.business_type}
          </span>
          <span className="bottom-sheet-item-category">· {merchant.category}</span>
        </div>
        <div className="bottom-sheet-item-title">{merchant.name}</div>
      </div>
      {merchant.place_url && <span className="bottom-sheet-item-arrow">›</span>}
    </div>
  )
}
