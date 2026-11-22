// RIYE STUDIO — 의뢰서 중계 서버 (Cloudflare Worker)
// 사이트는 이 Worker로 의뢰서를 보내고, Worker만 디스코드 웹후크 주소를 알고 있어요.
// 웹후크 주소는 코드에 넣지 말고 Cloudflare의 비밀 변수 DISCORD_WEBHOOK 에 저장하세요.
//
// 필요한 설정 (Cloudflare 대시보드 → Workers → 이 Worker → Settings → Variables)
//   DISCORD_WEBHOOK  (Secret)  디스코드 #의뢰-접수 웹후크 주소
//   ALLOWED_ORIGIN   (Text)    https://riye-web.github.io
// 선택: KV 바인딩 RATE (같은 IP에서 1분에 1번만 허용)

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || 'https://riye-web.github.io').split(',').map(s => s.trim());
    const okOrigin = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { error: 'method' });
    if (!okOrigin) return reply(403, { error: 'origin' });
    if (!env.DISCORD_WEBHOOK) return reply(500, { error: 'not-configured' });

    let data;
    try { data = await request.json(); } catch { return reply(400, { error: 'json' }); }
    if (data.hp) return reply(200, { ok: true });               // honeypot: pretend success
    const content = String(data.content || '').trim();
    if (content.length < 20 || content.length > 2000) return reply(400, { error: 'length' });
    if (!content.startsWith('📩 외주 의뢰서')) return reply(400, { error: 'format' });

    if (env.RATE) {                                               // optional KV rate limit
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await env.RATE.get(ip)) return reply(429, { error: 'too-fast' });
      await env.RATE.put(ip, '1', { expirationTtl: 60 });
    }

    const r = await fetch(env.DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] }, username: '리예 공방 의뢰서' })
    });
    if (!r.ok) return reply(502, { error: 'discord', status: r.status });
    return reply(200, { ok: true });
  }
};
