// relay: 의뢰서 중계 서버(Cloudflare Worker) 주소. 넣으면 웹후크 대신 이쪽으로 보내요. 설정 방법은 relay/README.md
// webhook: 디스코드 #의뢰-접수 채널의 웹후크 주소 (relay가 비어 있을 때만 사용)
// 디스코드: 채널 편집 → 연동 → 웹후크 → 리예 공방 의뢰서 → 웹후크 URL 복사
window.RIYE_CONFIG = {
  relay: '',
  webhook: 'https://discord.com/api/webhooks/1573905622628573404/EBYNYad0Q5c2l0TAcRFdCWaD9d-ebTIfrsEd8UGx9t9tL04NyYCWQMrEVI3TY5kpdSBg'
};
