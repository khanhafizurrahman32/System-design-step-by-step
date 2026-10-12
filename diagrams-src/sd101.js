// Diagrams for the System Design 101 pages. Same format as pilot.js, plus a small helper for sequence diagrams.
// seq(title, actors, messages): actors = ['Name|colour', ...]; messages = [from, to, label, style] or ['#', fromIdx, toIdx, note, colour]
function seq(alt, actors, msgs, opt = {}) {
  const A = actors.map(a => { const [nm, c] = a.split('|'); return { nm, c: c || 'b' }; });
  const W = opt.w || 1200, rh = opt.rh || 54, top = 50;
  const m = Math.max(100, ...A.map(a => (a.nm.length * 11 + 40) / 2)) + 10;
  const xs = A.map((_, i) => m + i * (W - 2 * m) / (A.length - 1));
  const idx = v => typeof v === 'number' ? v : A.findIndex(a => a.nm === v);
  const H = top + 60 + msgs.length * rh + 20;
  const nodes = A.map((a, i) => ['actor' + i, xs[i], top, a.nm, a.c]);
  const edges = A.map((a, i) => [[xs[i], top + 32], [xs[i], H - 10], '', 'dn' + a.c]);
  msgs.forEach((r, j) => {
    const y = top + 72 + j * rh;
    if (r[0] === '#') { const [, a, b, tx, c] = r; nodes.push(['note' + j, (xs[idx(a)] + xs[idx(b)]) / 2, y, tx, c || 'a']); return; }
    const [f, t, label, st = ''] = r; const i1 = idx(f), i2 = idx(t), d = i2 > i1 ? 1 : -1;
    edges.push([[xs[i1] + 4 * d, y], [xs[i2] - 6 * d, y], label, st]);
  });
  return { w: W, h: H, alt, nodes, edges };
}

module.exports = {

'101-type-a-url': { w: 1400, h: 640, alt: 'What happens when you type a URL: the browser resolves the name through DNS, opens a TCP connection and TLS session, sends an HTTP request that passes a CDN or load balancer to the server, and renders the response, fetching more resources.',
  nodes: [['u', 130, 100, 'You type|example.com', 't', 'pill', 200], ['br', 460, 100, 'Browser|checks its own caches', 'b', 'rect', 240],
    ['dns', 820, 100, 'DNS resolver|root → .com → example.com', 'x', 'rect', 290], ['ip', 1200, 100, 'IP address|93.184.x.x', 'x', 'note', 220],
    ['tcp', 1200, 330, 'TCP + TLS handshake|secure connection', 'p', 'rect', 290], ['edge', 820, 330, 'CDN / load balancer|cached? answer here', 'a', 'rect', 270],
    ['srv', 460, 330, 'Web server|builds the response', 'g', 'rect', 240], ['rend', 130, 330, 'Browser renders|HTML → CSS → JS', 'b', 'rect', 220],
    ['more', 130, 530, 'More requests|images, scripts, API calls', 'b', 'rect', 260]],
  edges: [['u', 'br', '1', ''], ['br', 'dns', '2  look up', ''], ['dns', 'ip', '3  answer', ''], ['ip', 'tcp', '4  connect', 'd'],
    ['tcp', 'edge', '5  HTTP request', 'b'], ['edge', 'srv', 'miss', 'b'], ['srv', 'rend', '6  HTML', 'g'], ['rend', 'more', '7', 'b']],
  texts: [[820, 560, 'Every step is cached somewhere: browser, OS, DNS (for its TTL), CDN.', 'x', 18], [820, 595, 'That is why the second visit is fast.', 'x', 18]] },

'101-tcp-udp': { w: 1200, h: 470, alt: 'TCP opens a connection with a three-way handshake and delivers bytes reliably and in order, retransmitting lost packets; UDP sends independent packets with no handshake, no ordering and no retransmission.',
  zones: [[20, 20, 560, 430, 'TCP: reliable, ordered, connection-based', 'b'], [620, 20, 560, 430, 'UDP: fast, fire-and-forget', 'a']],
  nodes: [['c1', 110, 110, 'Client', 't', 'pill'], ['s1', 490, 110, 'Server', 'g', 'pill'], ['h', 300, 200, 'SYN → SYN-ACK → ACK|handshake: 1 round trip', 'b'],
    ['d', 300, 300, 'packets 1 2 3 4 …\nlost packet? resend it', 'b'], ['use1', 300, 400, 'web, APIs, databases, email', 'x', 'note'],
    ['c2', 710, 110, 'Client', 't', 'pill'], ['s2', 1090, 110, 'Server', 'g', 'pill'], ['p', 900, 220, 'packet  packet  packet|no handshake, no resend', 'a'],
    ['use2', 900, 400, 'video calls, games, DNS, QUIC', 'x', 'note'], ['lost', 900, 310, 'lost packet = gone|app decides what to do', 'r']],
  edges: [['c1', 's1', '', 'b2'], ['c2', 's2', '', 'a']] },

'101-http-versions': { w: 1400, h: 560, alt: 'HTTP/1.1 sends one request at a time per connection so browsers open several connections; HTTP/2 multiplexes many streams over one TCP connection; HTTP/3 runs streams over QUIC on UDP so a lost packet only delays its own stream.',
  zones: [[20, 20, 1360, 160, 'HTTP/1.1 · text · one request at a time per connection', 'x'], [20, 200, 1360, 160, 'HTTP/2 · binary · many streams on one TCP connection', 'b'], [20, 380, 1360, 160, 'HTTP/3 · QUIC over UDP · streams independent', 'g']],
  nodes: [['b1', 120, 100, 'Browser', 't', 'pill'], ['s1', 1260, 100, 'Server', 'g', 'pill'], ['n1', 690, 100, '~6 TCP connections in parallel\nrequest waits for the one before it', 'x'],
    ['b2', 120, 280, 'Browser', 't', 'pill'], ['s2', 1260, 280, 'Server', 'g', 'pill'], ['n2', 690, 280, '1 TCP connection · streams 1,2,3 interleaved\nheader compression · but one lost packet stalls all', 'b'],
    ['b3', 120, 460, 'Browser', 't', 'pill'], ['s3', 1260, 460, 'Server', 'g', 'pill'], ['n3', 690, 460, 'QUIC: TLS built in, faster setup\nlost packet delays only its stream · survives Wi-Fi → 4G', 'g']],
  edges: [['b1', 'n1', '', 'x'], ['n1', 's1', '', 'x'], ['b2', 'n2', '', 'b'], ['n2', 's2', '', 'b'], ['b3', 'n3', '', 'g'], ['n3', 's3', '', 'g']] },

'101-rest-graphql-grpc': { w: 1400, h: 470, alt: 'REST: several resource URLs, each returning a fixed shape. GraphQL: one endpoint where the client asks for exactly the fields it needs. gRPC: typed remote calls with Protobuf over HTTP/2, mostly between services.',
  zones: [[20, 20, 440, 430, 'REST', 'b'], [480, 20, 440, 430, 'GraphQL', 'p'], [940, 20, 440, 430, 'gRPC', 'g']],
  nodes: [['r0', 240, 90, 'Web / mobile client', 't', 'pill'], ['r1', 240, 200, 'GET /users/7\nGET /users/7/orders', 'b'], ['r2', 240, 330, 'fixed response shapes|cacheable by URL', 'b', 'note'],
    ['g0', 700, 90, 'Web / mobile client', 't', 'pill'], ['g1', 700, 200, 'POST /graphql\n{ user(id:7) { name orders { total } } }', 'p'], ['g2', 700, 330, 'exactly the fields asked for|one round trip', 'p', 'note'],
    ['p0', 1160, 90, 'Service A', 'g'], ['p1', 1160, 200, 'orders.Get(OrderReq)\nProtobuf over HTTP/2', 'g'], ['p2', 1160, 330, 'typed, fast, streaming|generated client code', 'g', 'note']],
  edges: [['r0', 'r1', '', 'b'], ['g0', 'g1', '', 'p'], ['p0', 'p1', '', 'g']],
  texts: [[240, 420, 'public APIs, simple CRUD', 'b', 16], [700, 420, 'many clients needing different data', 'p', 16], [1160, 420, 'service-to-service, high volume', 'g', 16]] },

'101-webhooks-polling': { w: 1300, h: 470, alt: 'Polling: your app asks the provider again and again, mostly getting no news. Webhook: the provider calls your URL once when the event happens; you verify the signature, acknowledge fast and process asynchronously.',
  zones: [[20, 20, 600, 430, 'Polling: you keep asking', 'r'], [660, 20, 620, 430, 'Webhook: they call you', 'g']],
  nodes: [['a1', 120, 120, 'Your app', 'b'], ['p1', 500, 120, 'Provider|e.g. payments', 'x'], ['n1', 320, 330, 'every 10 s: "anything new?"\n"no" … "no" … "no" … "yes"', 'r', 'note'],
    ['p2', 760, 120, 'Provider', 'x'], ['a2', 1160, 120, 'Your webhook URL', 'b'], ['v', 1160, 260, '1 verify signature (HMAC)\n2 reply 200 fast', 'g'], ['q', 1160, 390, 'queue → process|dedupe by event id', 'p'], ['re', 760, 300, 'retries if you don\'t\nanswer 2xx', 'a', 'note']],
  edges: [['a1', 'p1', 'poll', 'r'], ['p1', 'a1', 'nothing new', 'rdC'], ['p2', 'a2', 'POST event', 'g'], ['a2', 'v', '', 'g'], ['v', 'q', '', 'p'], ['re', 'p2', '', 'ad']] },

'101-api-gateway': { w: 1300, h: 470, alt: 'An API gateway sits between clients and services. It terminates TLS, authenticates the request, applies rate limits, routes it to the right service and logs it.',
  nodes: [['w', 110, 140, 'Web app', 't', 'pill'], ['m', 110, 320, 'Mobile app', 't', 'pill'],
    ['gw', 540, 230, 'API gateway\nTLS · auth · rate limit\nrouting · logging · caching', 'p'],
    ['s1', 1050, 90, 'Users service', 'g'], ['s2', 1050, 230, 'Orders service', 'g'], ['s3', 1050, 370, 'Search service', 'g'],
    ['idp', 540, 420, 'Auth server|issues tokens', 'x']],
  edges: [['w', 'gw', 'HTTPS', ''], ['m', 'gw', '', ''], ['gw', 's1', '/users/*', 'g'], ['gw', 's2', '/orders/*', 'g'], ['gw', 's3', '/search', 'g'], ['gw', 'idp', 'validate token', 'd']],
  texts: [[540, 60, 'One front door: cross-cutting rules live here, business logic does not.', 'x', 17]] },

'101-https-tls': seq('TLS 1.3 handshake: the client sends supported ciphers and a key share; the server answers with its key share, certificate and a signature; the client checks the certificate against trusted authorities; both derive the same session keys and switch to fast symmetric encryption.',
  ['Browser|t', 'Server|g', 'Certificate authority|x'], [
    ['Browser', 'Server', 'ClientHello: ciphers + key share', ''],
    ['Server', 'Browser', 'ServerHello: key share + certificate + signature', 'g'],
    ['#', 0, 2, 'browser checks: certificate signed by a trusted CA? name matches? not expired?', 'a'],
    ['#', 0, 1, 'both sides derive the same secret keys (ECDHE) — never sent over the wire', 'p'],
    ['Browser', 'Server', 'Finished · then encrypted HTTP request', 'b'],
    ['Server', 'Browser', 'encrypted response (symmetric, fast)', 'gd']]),

'101-passwords': { w: 1300, h: 470, alt: 'Storing passwords: never in plain text and never with a fast hash. Add a unique random salt per user and run a slow, memory-hard hash such as Argon2id or bcrypt; store only the salt and the hash. To log in, recompute and compare.',
  nodes: [['pw', 120, 120, 'password|"hunter2"', 't', 'pill'], ['salt', 120, 300, 'random salt|unique per user', 'a'],
    ['h', 520, 210, 'slow hash\nArgon2id / bcrypt / scrypt\n(tuned to ~100 ms)', 'p'], ['db', 960, 210, 'users table|salt + hash only', 'g', 'db'],
    ['x1', 960, 70, 'plain text ✗', 'r'], ['x2', 960, 380, 'SHA-256 alone ✗|billions of guesses/s on a GPU', 'r']],
  edges: [['pw', 'h', ''], ['salt', 'h', ''], ['h', 'db', 'store', 'g']],
  texts: [[520, 430, 'Login: look up the salt, hash the typed password the same way, compare in constant time.', 'x', 17]] },

'101-sessions-tokens': { w: 1300, h: 480, alt: 'Session: the browser holds a random session ID in a cookie and the server looks it up in a session store on every request, which makes logout instant. Token: the client holds a signed token and any server can verify it without a lookup, which makes revocation harder.',
  zones: [[20, 20, 610, 440, 'Server-side session', 'b'], [670, 20, 610, 440, 'Self-contained token (e.g. JWT)', 'p']],
  nodes: [['c1', 120, 120, 'Browser|cookie: sid=8f3a…', 't'], ['s1', 470, 120, 'App server', 'g'], ['st', 470, 300, 'Session store|Redis: sid → user, roles', 'a', 'db'],
    ['n1', 200, 380, 'logout = delete the row|instant revocation', 'b', 'note'],
    ['c2', 790, 120, 'Client|Authorization: Bearer eyJ…', 't'], ['s2', 1160, 120, 'Any server', 'g'], ['k', 1160, 300, 'verify signature\nwith public key — no lookup', 'p'],
    ['n2', 850, 380, 'scales easily|but can\'t easily revoke: keep it short-lived', 'p', 'note']],
  edges: [['c1', 's1', '', 'b'], ['s1', 'st', 'lookup every request', 'a'], ['c2', 's2', '', 'p'], ['s2', 'k', '', 'p']] },

'101-jwt': { w: 1300, h: 440, alt: 'A JWT has three base64url parts separated by dots: a header naming the algorithm, a payload of claims such as subject, expiry and audience, and a signature over both. Anyone can read the payload; only the key holder can produce a valid signature.',
  nodes: [['h', 200, 110, 'Header\n{ "alg": "RS256", "typ": "JWT" }', 'r'], ['p', 640, 110, 'Payload (claims)\n{ "sub": "user7", "exp": 1767225600,\n  "aud": "api", "roles": ["admin"] }', 'p'], ['s', 1090, 110, 'Signature\nsign(header.payload,\nprivate key)', 'b'],
    ['tok', 640, 290, 'eyJhbGci… . eyJzdWIi… . SflKxwRJ…', 'x'],
    ['w1', 300, 400, 'readable by anyone: no secrets inside', 'r', 'note'], ['w2', 980, 400, 'check alg, signature, exp, aud, iss', 'g', 'note']],
  edges: [['h', 'tok', 'base64url', 'r'], ['p', 'tok', 'base64url', 'p'], ['s', 'tok', 'base64url', 'b']] },

'101-oauth': seq('OAuth 2.0 authorization code flow with PKCE: the app sends the user to the authorization server, the user logs in and consents, the app receives a one-time code, exchanges it with the code verifier for an access token, and calls the API with that token.',
  ['User|t', 'Your app|b', 'Authorization server|p', 'API (resource server)|g'], [
    ['User', 'Your app', 'click "Sign in with …"', ''],
    ['Your app', 'Authorization server', 'redirect: client_id, scope, state, code_challenge', 'b'],
    ['User', 'Authorization server', 'log in + approve access', ''],
    ['Authorization server', 'Your app', 'redirect back with one-time code', 'p'],
    ['Your app', 'Authorization server', 'code + code_verifier (+ client secret)', 'b'],
    ['Authorization server', 'Your app', 'access token (+ refresh token, ID token)', 'p'],
    ['Your app', 'API (resource server)', 'GET /photos  Authorization: Bearer …', 'g']], { w: 1300 }),

'101-sso': { w: 1300, h: 470, alt: 'Single sign-on: apps A and B both trust one identity provider. The first visit to app A redirects to the identity provider to log in, which leaves a session there; visiting app B redirects again but the user is already logged in, so they return immediately with an assertion or ID token.',
  nodes: [['u', 110, 230, 'User', 't', 'pill'], ['a', 470, 100, 'App A|e.g. email', 'b'], ['b', 470, 360, 'App B|e.g. HR portal', 'b'],
    ['idp', 960, 230, 'Identity provider\nOkta · Entra ID · Google\nlogs in once, keeps a session', 'p'],
    ['n', 960, 420, 'SAML (XML, enterprise)\nor OIDC (JSON / JWT, modern)', 'p', 'note']],
  edges: [['u', 'a', '1 visit', ''], ['a', 'idp', '2 redirect', 'p'], ['idp', 'a', '3 log in → token', 'pdC'], ['u', 'b', '4 visit', ''], ['b', 'idp', '5 redirect', 'p'], ['idp', 'b', '6 already logged in → straight back', 'gdc']] },

// ---------- Reliability ----------
'101-retries': { w: 1300, h: 470, alt: 'Timeouts and retries: the caller sets a timeout, retries only safe or idempotent calls with exponential backoff and random jitter, and stops after a few attempts or when the retry budget is spent.',
  nodes: [['c', 120, 150, 'Caller', 't', 'pill'], ['s', 1150, 150, 'Dependency|slow or failing', 'r'],
    ['t1', 420, 70, 'try 1  →  timeout 300 ms', 'x'], ['t2', 640, 170, 'wait 100 ms ± jitter → try 2', 'a'], ['t3', 860, 270, 'wait 400 ms ± jitter → try 3', 'a'],
    ['give', 860, 400, 'give up → fallback or error|retry budget: ≤10% extra load', 'r', 'note'],
    ['idem', 300, 330, 'only retry if safe:|GET, or POST with idempotency key', 'g', 'note']],
  edges: [['c', 't1', ''], ['t1', 't2', '', 'a'], ['t2', 't3', '', 'a'], ['t3', 's', '', 'r'], ['t3', 'give', '', 'rd']] },

'101-circuit-breaker': { w: 1300, h: 460, alt: 'Circuit breaker states: closed lets calls through and counts failures; when failures pass a threshold it opens and fails fast without calling the dependency; after a cool-down it goes half-open and lets a few trial calls through, closing on success or opening again on failure.',
  nodes: [['cl', 220, 200, 'CLOSED|calls go through, count failures', 'g', 'rect', 300], ['op', 1050, 200, 'OPEN|fail fast, no calls', 'r', 'rect', 260],
    ['hf', 640, 400, 'HALF-OPEN|let a few trial calls through', 'a', 'rect', 300]],
  edges: [['cl', 'op', 'failures > 50% in 10 s', 'rc'], ['op', 'hf', 'after 30 s cool-down', 'a'], ['hf', 'cl', 'trials succeed', 'g'], ['hf', 'op', 'trial fails', 'rdc']],
  texts: [[640, 60, 'While open, serve a fallback: cached data, a default, or a clear error. The dependency gets room to recover.', 'x', 17]] },

'101-load-shedding': { w: 1300, h: 470, alt: 'Protecting a service from overload: a rate limiter rejects callers over their quota with 429; when the server itself is saturated it sheds low-priority work with 503 so the important requests still finish fast.',
  nodes: [['c1', 110, 100, 'Client A|within quota', 't'], ['c2', 110, 240, 'Client B|too many requests', 't'], ['c3', 110, 380, 'Batch job|low priority', 't'],
    ['rl', 490, 240, 'Rate limiter|token bucket per key', 'p'], ['q', 860, 240, 'Admission control|queue full? latency high?', 'a'], ['svc', 1190, 240, 'Service', 'g']],
  edges: [['c1', 'rl', ''], ['c2', 'rl', ''], ['c3', 'rl', ''], ['rl', 'q', '', 'p'], ['q', 'svc', 'priority first', 'g'],
    ['rl', 'c2', '429 + Retry-After', 'rdC'], ['q', 'c3', '503 shed', 'rdc']] },

'101-observability': { w: 1300, h: 470, alt: 'Observability: metrics show that something is wrong, traces show where in the call chain, and logs show why. All three share a request or trace ID, and alerts fire on SLO burn rate.',
  nodes: [['m', 220, 110, 'Metrics|rate · errors · duration', 'b', 'rect', 300], ['t', 640, 110, 'Traces|one request across services', 'p', 'rect', 300], ['l', 1070, 110, 'Logs|structured events, with trace_id', 'g', 'rect', 320],
    ['q1', 220, 260, 'IS something wrong?', 'b', 'note'], ['q2', 640, 260, 'WHERE is it slow?', 'p', 'note'], ['q3', 1070, 260, 'WHY did it fail?', 'g', 'note'],
    ['al', 640, 400, 'Alert on SLO burn rate → page a human', 'r']],
  edges: [['m', 'q1', '', 'b'], ['t', 'q2', '', 'p'], ['l', 'q3', '', 'g'], ['q1', 'al', '', 'rd']] },

'101-deploys': { w: 1350, h: 480, alt: 'Deploying safely: a canary sends a small share of traffic to the new version and watches error rate and latency before rolling forward; blue-green switches all traffic between two full environments; feature flags separate deploying code from releasing a feature.',
  zones: [[20, 20, 640, 440, 'Canary', 'a'], [690, 20, 640, 440, 'Blue-green', 'b']],
  nodes: [['lb1', 120, 230, 'Load balancer', 'p'], ['v1', 480, 120, 'v1  (95%)', 'g'], ['v2', 480, 330, 'v2  (5%)|watch errors, p99', 'a'],
    ['n1', 340, 420, '1% → 5% → 25% → 100%, auto-rollback', 'a', 'note', 470],
    ['lb2', 800, 230, 'Load balancer', 'p'], ['bl', 1180, 120, 'Blue: v1|live', 'b'], ['gr', 1180, 330, 'Green: v2|idle, tested', 'g'],
    ['n2', 1010, 420, 'flip all traffic; flip back to roll back', 'b', 'note', 440]],
  edges: [['lb1', 'v1', '', 'g'], ['lb1', 'v2', '', 'ad'], ['lb2', 'bl', '', 'b'], ['lb2', 'gr', 'switch', 'gd']] },

// ---------- Databases & storage ----------
'101-sql-nosql': { w: 1350, h: 470, alt: 'SQL versus NoSQL: relational databases store normalized tables with joins and transactions; NoSQL families include key-value, document, wide-column and graph stores, each built around a specific access pattern and easier horizontal scaling.',
  nodes: [['sql', 230, 200, 'Relational (SQL)\ntables + joins + transactions\nPostgres · MySQL', 'b', 'rect', 340],
    ['kv', 700, 90, 'Key-value|Redis · DynamoDB', 'a', 'rect', 260], ['doc', 1100, 90, 'Document|MongoDB', 'g', 'rect', 240],
    ['wc', 700, 300, 'Wide-column|Cassandra · ScyllaDB', 'p', 'rect', 280], ['gr', 1100, 300, 'Graph|Neo4j', 'r', 'rect', 220],
    ['n1', 230, 400, 'default choice: flexible queries', 'b', 'note'], ['n2', 900, 420, 'pick by access pattern: known keys, huge write volume', 'x', 'note']],
  edges: [['sql', 'n1', '', 'bd']] },

'101-acid': { w: 1300, h: 470, alt: 'ACID transactions and isolation: a transfer debits one account and credits another all-or-nothing; isolation levels from read committed to serializable decide which anomalies concurrent transactions can see.',
  nodes: [['tx', 260, 150, 'BEGIN\nA = A − 100\nB = B + 100\nCOMMIT', 'b', 'rect', 280],
    ['a', 700, 70, 'Atomic|all or nothing', 'g', 'rect', 240], ['c', 1060, 70, 'Consistent|rules hold (A ≥ 0)', 'g', 'rect', 260],
    ['i', 700, 200, 'Isolated|others don\'t see half-done work', 'g', 'rect', 300], ['d', 1060, 200, 'Durable|committed = on disk', 'g', 'rect', 240],
    ['lv', 640, 380, 'read committed  →  snapshot (repeatable read)  →  serializable\nfewer anomalies, more cost →', 'a', 'rect', 640]],
  edges: [['tx', 'a', '', 'g'], ['tx', 'i', '', 'g']] },

'101-replication': { w: 1300, h: 470, alt: 'Leader-follower replication: all writes go to the leader, which streams changes to followers; reads can go to followers but may be slightly stale; if the leader fails, a follower is promoted.',
  nodes: [['app', 140, 230, 'App', 't', 'pill'], ['ld', 560, 120, 'Leader|all writes', 'b'], ['f1', 1000, 70, 'Follower 1|sync: zero loss', 'g'], ['f2', 1000, 230, 'Follower 2|async', 'g'],
    ['f3', 1000, 390, 'Follower 3|async, other region', 'g'], ['lag', 560, 380, 'replication lag: reads may be stale\nread-your-writes → read from leader', 'a', 'note']],
  edges: [['app', 'ld', 'writes', 'b'], ['ld', 'f1', 'WAL stream', 'b'], ['ld', 'f2', '', 'bd'], ['ld', 'f3', '', 'bd'], ['app', 'f2', 'reads', 'gdC']] },

'101-storage-types': { w: 1350, h: 470, alt: 'Block, file and object storage: block storage is a raw disk attached to one machine, used by databases; file storage is a shared filesystem with folders; object storage keeps whole immutable objects by key over HTTP, cheaply and at huge scale.',
  zones: [[20, 20, 420, 430, 'Block', 'b'], [465, 20, 420, 430, 'File', 'a'], [910, 20, 420, 430, 'Object', 'g']],
  nodes: [['b1', 230, 110, 'VM / database server', 't'], ['b2', 230, 240, 'raw disk volume|EBS, local SSD', 'b', 'db'], ['b3', 230, 370, 'lowest latency, one machine|databases, OS disks', 'b', 'note'],
    ['f1', 675, 110, 'many servers', 't'], ['f2', 675, 240, '/shared/reports/q3.pdf|NFS, EFS', 'a'], ['f3', 675, 370, 'folders, file locks|legacy apps, shared configs', 'a', 'note'],
    ['o1', 1120, 110, 'anyone with HTTP', 't'], ['o2', 1120, 240, 'bucket/key → bytes + metadata|S3, GCS, Azure Blob', 'g'], ['o3', 1120, 370, 'cheap, huge, 11 nines durable|images, video, backups, logs', 'g', 'note']],
  edges: [['b1', 'b2', '', 'b'], ['f1', 'f2', '', 'a'], ['o1', 'o2', 'PUT / GET', 'g']] },

// ---------- Messaging ----------
'101-queue-stream': { w: 1350, h: 470, alt: 'Queue versus stream: in a message queue each message goes to one worker and is deleted once acknowledged; in an event stream like Kafka messages stay in an ordered log and each consumer group reads at its own offset, so many consumers can read and replay the same events.',
  zones: [[20, 20, 640, 430, 'Message queue (SQS, RabbitMQ)', 'a'], [690, 20, 640, 430, 'Event stream / log (Kafka, Kinesis)', 'p']],
  nodes: [['p1', 110, 230, 'Producer', 't', 'pill'], ['q', 330, 230, 'm5 m4 m3', 'a', 'queue', 190], ['w1', 560, 120, 'Worker 1', 'g'], ['w2', 560, 340, 'Worker 2', 'g'],
    ['n1', 340, 400, 'each message to one worker; deleted on ack', 'a', 'note'],
    ['p2', 780, 230, 'Producer', 't', 'pill'], ['lg', 1010, 230, '0 1 2 3 4 5 6 →|kept for days', 'p'], ['g1', 1240, 120, 'Group A|offset 6', 'g'], ['g2', 1240, 340, 'Group B|offset 2', 'g'],
    ['n2', 1010, 400, 'every group reads everything; replayable', 'p', 'note']],
  edges: [['p1', 'q', '', 'a'], ['q', 'w1', '', 'g'], ['q', 'w2', '', 'g'], ['p2', 'lg', '', 'p'], ['lg', 'g1', '', 'g'], ['lg', 'g2', '', 'g']] },

'101-delivery': { w: 1300, h: 470, alt: 'Delivery guarantees: at-most-once acknowledges before processing and can lose messages; at-least-once acknowledges after processing and can duplicate them; effectively-once is at-least-once delivery plus an idempotent consumer that ignores duplicates.',
  nodes: [['am', 230, 110, 'At-most-once|ack, then process', 'r', 'rect', 280], ['al', 650, 110, 'At-least-once|process, then ack', 'a', 'rect', 280], ['eo', 1070, 110, 'Effectively-once|at-least-once + idempotent', 'g', 'rect', 320],
    ['am2', 230, 270, 'crash after ack\n→ message lost', 'r', 'note'], ['al2', 650, 270, 'crash before ack\n→ redelivered → duplicate', 'a', 'note'],
    ['eo2', 1070, 270, 'store processed message IDs\nor use upserts / conditional writes', 'g', 'note'],
    ['use', 650, 410, 'metrics you can drop  ·  the usual default  ·  money, counters, emails', 'x']],
  edges: [['am', 'am2', '', 'rd'], ['al', 'al2', '', 'ad'], ['eo', 'eo2', '', 'gd']] },

'101-outbox': { w: 1450, h: 470, alt: 'Transactional outbox: the service writes the business row and an outbox row in the same database transaction; a relay reads the outbox and publishes to the message broker, so the event is published if and only if the data was saved.',
  nodes: [['svc', 140, 200, 'Order service', 'b'], ['db', 560, 200, 'Database\none transaction:\norders row + outbox row', 'b', 'db', 300],
    ['rel', 950, 200, 'Relay|polls outbox or reads CDC', 'p', 'rect', 270], ['br', 1330, 200, 'Broker|Kafka / queue', 'a', 'rect', 190],
    ['bad', 560, 410, '✗ write DB, then publish: crash in between = lost or phantom event', 'r', 'note']],
  edges: [['svc', 'db', 'INSERT both', 'b'], ['db', 'rel', '', 'p'], ['rel', 'br', 'publish', 'a']] },

'101-dlq': { w: 1300, h: 460, alt: 'Poison messages and dead-letter queues: a consumer retries a failing message a few times with backoff, then moves it to a dead-letter queue so the rest of the queue keeps flowing; an alert fires and an engineer inspects and replays it after a fix.',
  nodes: [['q', 200, 200, 'Main queue', 'a', 'queue', 220], ['c', 600, 200, 'Consumer|process message', 'b'], ['ok', 1050, 90, 'Done → ack', 'g'],
    ['dlq', 1050, 320, 'Dead-letter queue|after 5 failed attempts', 'r', 'queue', 320], ['al', 600, 400, 'alert on DLQ depth → inspect → fix → replay', 'x', 'note', 500]],
  edges: [['q', 'c', '', 'a'], ['c', 'ok', 'success', 'g'], ['c', 'q', 'fail: retry with backoff', 'adC'], ['c', 'dlq', 'still failing', 'r'], ['dlq', 'al', '', 'xd']] },
};
