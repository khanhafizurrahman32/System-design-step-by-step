// Diagram specs for the pilot pages. Regenerate with: npm run diagrams
// Node: [id, centerX, centerY, "Label|sub-label", colour, shape, width?, height?]
// Edge: [from, to, "label", style]   style: d=dashed, colour letter, 2=both heads, c/C=curve, n=no head
// Colours: b blue · g green · a amber · r red · p purple · t teal · x grey · k pink
module.exports = {

'handbook-map': { w: 1120, h: 500, title: 'How this handbook fits together', alt: 'Map of the handbook: foundations feed core concepts, which feed patterns, which are applied in problems; technologies and DDIA chapters sit underneath; the interview playbook sits on top.',
  nodes: [
    ['found', 140, 140, 'Foundations|NFRs · numbers · CAP', 'x'],
    ['core', 410, 140, '9 Core concepts|caching · sharding · …', 'b'],
    ['pat', 700, 140, '7 Patterns|scaling reads, contention …', 'p'],
    ['prob', 985, 140, '29 Problems|v1 → break → fix', 'g'],
    ['tech', 410, 330, 'Technologies|Redis · Kafka · Postgres …', 't'],
    ['ddia', 700, 330, 'DDIA chapters|the “why” underneath', 'a'],
    ['play', 985, 330, 'Interview playbook|45-min script · traps', 'k'],
    ['you', 140, 330, 'Start here', 'w', 'pill'],
  ],
  edges: [['found', 'core', ''], ['core', 'pat', ''], ['pat', 'prob', ''], ['tech', 'core', 'implements', 'td'], ['ddia', 'pat', 'explains', 'ad'], ['prob', 'play', 'rehearse', 'k'], ['you', 'found', '']],
  texts: [[560, 455, 'Every page links sideways: a problem links to the patterns it uses, and each pattern links to the DDIA chapter behind it.', 'x', 17]] },

'caching-cache-aside': { w: 980, h: 520, title: 'Cache-aside: read path and write path', alt: 'Cache-aside. Read: app checks Redis, on a miss reads the database and stores the result with a TTL. Write: app updates the database and deletes the cache key.',
  zones: [[20, 60, 940, 260, 'Read', 'b'], [20, 340, 940, 165, 'Write', 'a']],
  nodes: [['app', 140, 200, 'App server', 'b'], ['cache', 490, 120, 'Redis|key → value, TTL', 'a', 'db'], ['db', 830, 220, 'Database|source of truth', 'g', 'db'],
    ['app2', 140, 410, 'App server', 'b'], ['db2', 830, 410, 'Database', 'g', 'db'], ['cache2', 490, 465, 'Redis', 'a', 'db']],
  edges: [['app', 'cache', '1  GET key', 'b'], ['app', 'db', '2  on miss: SELECT', 'g'], ['db', 'cache', '3  SET key, TTL', 'ad'],
    ['app2', 'db2', '1  UPDATE row', 'g'], ['app2', 'cache2', '2  DELETE key', 'r']],
  texts: [[490, 300, 'hit ≈ 1 ms  ·  miss ≈ 5–50 ms', 'x', 16]] },

'caching-stampede': { w: 980, h: 420, title: 'Cache stampede, and the fix', alt: 'Left: a hot key expires and thousands of requests miss at once and overload the database. Right: with single-flight, one request rebuilds the value while the others get the stale value.',
  zones: [[20, 60, 460, 340, 'Hot key expires, no protection', 'r'], [500, 60, 460, 340, 'Single-flight + serve stale', 'g']],
  nodes: [['req', 120, 240, '10,000\nrequests', 'x'], ['c1', 350, 140, 'Redis|miss', 'a', 'db'], ['d1', 350, 330, 'Database|overloaded', 'r', 'db'],
    ['req2', 600, 240, '10,000\nrequests', 'x'], ['c2', 820, 140, 'Redis|stale value + lock', 'a', 'db'], ['d2', 820, 330, 'Database|1 query', 'g', 'db']],
  edges: [['req', 'c1', 'all miss', 'a'], ['req', 'd1', '10,000 queries', 'r'], ['req2', 'c2', 'served stale', 'g'], ['c2', 'd2', 'one rebuild', 'gd']] },

'ticketmaster-v1': { w: 980, h: 400, title: 'v1: check, then book (and why it breaks)', alt: 'Two users read the same seat as available at the same moment, both insert a booking, and the seat is sold twice.',
  nodes: [['a', 110, 120, 'User A', 't', 'pill'], ['b', 110, 300, 'User B', 't', 'pill'], ['api', 380, 210, 'Booking API', 'b'], ['db', 800, 210, 'Postgres|seats + bookings', 'g', 'db'],
    ['bug', 800, 340, 'Seat 12A sold twice ✗', 'r']],
  edges: [['a', 'api', '1  is 12A free?', ''], ['b', 'api', '1  is 12A free?', ''], ['api', 'db', '2  both read “free”\n3  both INSERT', 'r'], ['db', 'bug', '', 'rd']],
  texts: [[800, 95, 'The check and the write are separate', 'r', 16], [800, 117, 'steps, so both requests pass the check.', 'r', 16]] },

'ticketmaster-hold': { w: 1040, h: 360, title: 'The fix: one atomic conditional update', alt: 'Both users send the same conditional UPDATE. The database applies them one at a time: the first updates one row and wins the hold, the second updates zero rows and is told the seat is taken.',
  nodes: [['a', 100, 110, 'User A', 't', 'pill'], ['b', 100, 270, 'User B', 't', 'pill'],
    ['sql', 470, 190, 'UPDATE tickets\nSET status = HELD, hold_until = now() + 10 min\nWHERE id = 12A AND status = AVAILABLE', 'p'],
    ['win', 900, 110, '1 row → hold is yours', 'g'], ['lose', 900, 270, '0 rows → “seat taken”', 'a']],
  edges: [['a', 'sql', ''], ['b', 'sql', ''], ['sql', 'win', 'first', 'g'], ['sql', 'lose', 'second', 'a']] },

'ticketmaster-final': { w: 1120, h: 660, title: 'Final design', alt: 'Final Ticketmaster design: CDN for event pages, a virtual waiting room for hot on-sales, an event service with Elasticsearch fed by change data capture, and a booking service that holds seats with a conditional update in Postgres and confirms after a payment webhook.',
  zones: [[230, 60, 650, 210, 'Browse: cached, eventually consistent', 'b'], [230, 300, 650, 340, 'Book: strongly consistent', 'g']],
  nodes: [['u', 100, 320, 'Users', 't', 'pill'], ['cdn', 420, 125, 'CDN|event pages, seat-map snapshot', 'a'], ['ev', 420, 215, 'Event service', 'b'],
    ['es', 740, 215, 'Elasticsearch|search', 'p', 'db'], ['wr', 420, 370, 'Waiting room|hot on-sales only', 'k'], ['bk', 420, 530, 'Booking service', 'b'],
    ['pg', 760, 420, 'Postgres|tickets · bookings', 'g', 'db'], ['pay', 1000, 560, 'Payment\nprovider', 'x'], ['cdc', 1000, 320, 'CDC|Debezium', 'x']],
  edges: [['u', 'cdn', '', 'a'], ['u', 'ev', '', 'b'], ['u', 'wr', 'big on-sale', 'k'], ['wr', 'bk', 'admit in batches', 'k'], ['ev', 'es', 'query', 'p'], ['bk', 'pg', 'hold seat:\nconditional UPDATE', 'g'], ['bk', 'pay', 'pay + idempotency key', ''], ['pay', 'pg', 'webhook → BOOKED', 'd'], ['pg', 'cdc', '', 'd'], ['cdc', 'es', 'index', 'pd']] },

'replication-leader-follower': { w: 960, h: 420, title: 'Leader–follower replication', alt: 'All writes go to the leader. The leader streams its change log to one synchronous follower and to asynchronous followers. Reads can be served by followers.',
  nodes: [['cw', 110, 110, 'Writes', 't', 'pill'], ['L', 420, 110, 'Leader|orders every write', 'a', 'db'],
    ['f1', 210, 300, 'Follower 1|synchronous', 'b', 'db'], ['f2', 450, 300, 'Follower 2|asynchronous', 'b', 'db'], ['f3', 690, 300, 'Follower 3|asynchronous', 'b', 'db'], ['cr', 860, 110, 'Reads', 't', 'pill']],
  edges: [['cw', 'L', ''], ['L', 'f1', 'waits for ack', 'g'], ['L', 'f2', 'no wait', 'ad'], ['L', 'f3', 'no wait', 'ad'], ['cr', 'f3', 'read', 't']],
  texts: [[480, 395, 'One synchronous follower = every committed write exists on 2 machines.', 'x', 16]] },

'replication-read-your-writes': { w: 960, h: 400, title: 'Replication lag: “where did my comment go?”', alt: 'A user writes a comment to the leader, then refreshes and the read goes to a follower that has not received the comment yet, so it looks lost. The fix routes that user’s reads to the leader for a short time.',
  nodes: [['u', 110, 200, 'User', 't', 'pill'], ['L', 470, 90, 'Leader|has the comment', 'a', 'db'], ['F', 470, 310, 'Follower|200 ms behind', 'r', 'db'],
    ['fix', 810, 200, 'Fix: for ~1 min after a\nwrite, read this user’s\ndata from the leader', 'g', 'note']],
  edges: [['u', 'L', '1  POST comment', ''], ['L', 'F', 'replicating…', 'ad'], ['u', 'F', '2  refresh → comment missing', 'r']] },

'replication-quorum': { w: 960, h: 420, title: 'Leaderless quorums: w + r > n', alt: 'With three replicas, a write succeeds on two of them while the third is down. A read asks two replicas; at least one has the new version, and read repair fixes the stale one.',
  nodes: [['c', 120, 210, 'Client', 't', 'pill'], ['n1', 470, 80, 'Replica 1|v7', 'g', 'db'], ['n2', 470, 210, 'Replica 2|v7', 'g', 'db'], ['n3', 470, 340, 'Replica 3|v6 (was down)', 'r', 'db'],
    ['rule', 800, 210, 'n = 3 replicas\nw = 2 acks to write\nr = 2 replies to read\n2 + 2 > 3 → overlap', 'p', 'note']],
  edges: [['c', 'n1', 'write v7', 'g'], ['c', 'n2', 'write v7', 'g'], ['n3', 'c', 'read → v6', 'rdc'], ['n2', 'n3', 'read repair', 'a']] },
};
