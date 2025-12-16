export function DataStatus({ formattedLastUpdated, totalCount, source }) {
  return (
    <div className={`data-status ${source || ''}`}>
      <div className="data-status-row">
        <span className="data-status-date">
          {formattedLastUpdated && `${formattedLastUpdated} 기준`}
        </span>
      </div>
      <div className="data-status-row">
        <span className="data-status-count">전체 {totalCount.toLocaleString()}개</span>
      </div>
    </div>
  )
}
