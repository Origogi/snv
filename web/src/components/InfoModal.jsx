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
          <p className="info-modal-subtitle">놓치지 않는 아동수당 가맹점 지도</p>

          <div className="info-modal-section">
            <h3>서비스 소개</h3>
            <p>
              성남시 아이사랑응원수당(아동수당) 카드로 결제 가능한 가맹점을
              지도에서 쉽게 찾아볼 수 있는 서비스입니다.
            </p>
          </div>

          <div className="info-modal-section">
            <h3>데이터 출처</h3>
            <p>
              <a
                href="https://www.data.go.kr/data/15129267/fileData.do"
                target="_blank"
                rel="noopener noreferrer"
              >
                공공데이터포털 - 성남시 아동사랑카드 가맹점 현황
              </a>
            </p>
          </div>

          <div className="info-modal-disclaimer">
            <p>
              본 서비스는 공공데이터를 활용한 비공식 서비스입니다.
              가맹점 정보는 실제와 다를 수 있으니 방문 전 확인을 권장합니다.
            </p>
          </div>

          <div className="info-modal-developer">
            <span>문의 및 피드백</span>
            <a href="mailto:rlawjdxo1212@naver.com">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              rlawjdxo1212@naver.com (개발자)
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
