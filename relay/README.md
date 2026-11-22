# 의뢰서 중계 서버 설정 (웹후크 주소 숨기기)

지금은 사이트가 `config.js`에 적힌 디스코드 웹후크 주소로 직접 보내요. 이 주소는 공개 파일이라 누구나 볼 수 있고, 마음먹으면 스팸을 보내거나 웹후크를 지울 수도 있어요.
아래처럼 무료 Cloudflare Worker를 중간에 두면 웹후크 주소는 Cloudflare 비밀 변수에만 남아요.

## 1. Worker 만들기 (무료)
1. https://dash.cloudflare.com 에 가입하거나 로그인해요.
2. Workers & Pages → Create → Create Worker → 이름 `riye-relay` → Deploy.
3. Edit code를 누르고, 이 폴더의 `worker.js` 내용을 전부 붙여넣은 뒤 Deploy해요.

## 2. 비밀 변수 넣기
Worker → Settings → Variables and Secrets
- `DISCORD_WEBHOOK` (종류: **Secret**) → **새로 만든** 디스코드 웹후크 주소
- `ALLOWED_ORIGIN` (종류: Text) → `https://riye-web.github.io`

## 3. 사이트에 연결
`config.js`를 이렇게 바꿔요.
```js
window.RIYE_CONFIG = {
  relay: 'https://riye-relay.<내 계정>.workers.dev',
  webhook: ''
};
```
`relay`가 있으면 사이트는 중계 서버로 보내고, `webhook`은 쓰지 않아요.

## 4. 노출된 웹후크 교체 (중요)
사이트에서 테스트 의뢰가 #의뢰-접수에 올라오는 걸 확인한 다음
디스코드 → #의뢰-접수 채널 편집 → 연동 → 웹후크에서 **예전 웹후크를 삭제**해요.
예전 주소는 GitHub 기록에 남아 있어서 지우기 전까지는 계속 쓸 수 있는 상태예요.
