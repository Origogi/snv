// 주소에서 도로명까지만 추출 (상세 번지 제외)
export const extractRoadName = (address) => {
  if (!address) return ''
  // "경기 성남시 분당구 황새울로360번길 42" → "경기 성남시 분당구 황새울로360번길"
  // 패턴: 도로명 + 번길/로/길 + 숫자 까지만 (이후 상세 번지 제거)
  const match = address.match(/^(.+?(?:로|길|대로)(?:\d*번?길?)?)(?:\s+\d+.*)?$/)
  return match ? match[1] : address
}

// 주소에서 건물번호만 추출
// "경기 성남시 분당구 황새울로342번길 11" → "11"
export const extractBuildingNumber = (address) => {
  if (!address) return ''
  // 도로명 주소에서 마지막 숫자(건물번호) 추출
  const match = address.match(/(?:로|길|대로)(?:\d*번?길?)?\s+(\d+(?:-\d+)?)$/)
  return match ? match[1] : ''
}
