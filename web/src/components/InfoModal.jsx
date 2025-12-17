import { useState, useEffect } from 'react'

// 첫 방문 여부 확인
const VISITED_KEY = 'snv_visited'

export function InfoModal({ forceOpen = false, onClose }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true)
      setIsClosing(false)
      return
    }

    // 첫 방문 시 자동 표시
    const visited = localStorage.getItem(VISITED_KEY)
    if (!visited) {
      setIsOpen(true)
      localStorage.setItem(VISITED_KEY, 'true')
    }
  }, [forceOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      onClose?.()
    }, 200)
  }

  if (!isOpen) return null

  return (
    <div className={`info-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`info-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 이미지 */}
        <div className="info-modal-header">
          <img
            src={`${import.meta.env.BASE_URL}ogimage.jpg`}
            alt="성남 아이포인트"
            className="info-modal-image"
          />
        </div>

        {/* 콘텐츠 */}
        <div className="info-modal-content">
          <h2 className="info-modal-title">성남 아이포인트</h2>
          <p className="info-modal-subtitle">아동수당 가맹점을 지도에서 쉽게 찾아보세요</p>

          <div className="info-modal-disclaimer">
            <p>
              공공데이터 기반 비공식 서비스입니다. 가맹점 정보는 실제와 다를 수 있습니다.
            </p>
          </div>

          <div className="info-modal-links">
            <a
              href="https://www.data.go.kr/data/15129267/fileData.do"
              target="_blank"
              rel="noopener noreferrer"
            >
              데이터 출처 (공공데이터포털)
            </a>
            <span className="info-modal-divider">·</span>
            <a href="mailto:rlawjdxo1212@naver.com">
              개발자에게 문의하기
            </a>
          </div>
        </div>

        {/* 푸터 */}
        <div className="info-modal-footer">
          <button className="info-modal-btn" onClick={handleClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
