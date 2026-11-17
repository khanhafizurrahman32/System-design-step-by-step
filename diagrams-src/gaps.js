// Diagrams for concept and problem pages added in the coverage audit.
// Same spec format as pilot.js. Multi-line sub text: start continuation lines with '|'.
module.exports = {
// ================= Load balancing =================
'concept-lb-layers': { w: 1350, h: 480, alt: 'The layers of load balancing for one request. DNS or anycast sends the user to the nearest region. A layer-4 load balancer spreads TCP connections by IP address and port without reading them, very fast. A layer-7 load balancer terminates TLS, reads the HTTP request and routes by path: /api to the API servers, /img to the image service. Each pool of servers is health-checked and unhealthy servers stop receiving traffic.',
  nodes: [['u', 110, 230, 'User', 't', 'rect', 130], ['dns', 320, 230, 'GeoDNS / anycast|nearest region', 'p', 'rect', 230],
    ['l4', 560, 230, 'L4 load balancer|TCP: IP + port\n|millions of conns', 'b', 'rect', 220], ['l7', 820, 230, 'L7 load balancer|TLS, HTTP routing\n|retries, rate limits', 'g', 'rect', 230],
    ['api', 1140, 110, 'API servers ×20', 'a', 'rect', 230], ['img', 1140, 230, 'Image service ×8', 'a', 'rect', 230], ['ws', 1140, 350, 'WebSocket servers ×6', 'a', 'rect', 230],
    ['hc', 820, 410, 'health checks every few seconds; failing servers removed', 'r', 'note', 600]],
  edges: [['u', 'dns', '', 't'], ['dns', 'l4', '', 'p'], ['l4', 'l7', '', 'b'], ['l7', 'api', '/api', 'g'], ['l7', 'img', '/img', 'g'], ['l7', 'ws', '/ws (sticky)', 'g']] },

'concept-lb-algorithms': { w: 1350, h: 460, alt: 'Choosing a server. Round robin sends requests to servers in turn, which is fine when requests cost the same. Least connections sends the next request to the server with the fewest active requests, which adapts when some requests are slow. Consistent hashing on a key such as user ID sends the same key to the same server, which keeps its cache warm or its WebSocket session in one place. Power of two choices picks two servers at random and uses the less loaded one, which is cheap and avoids herding.',
  nodes: [['rr', 200, 110, 'Round robin|A, B, C, A, B, C …', 'b', 'rect', 300], ['lc', 540, 110, 'Least connections|pick the least busy', 'g', 'rect', 280], ['ch', 870, 110, 'Hash on a key|same user → same server', 'p', 'rect', 300], ['p2', 1180, 110, 'Power of two choices|2 random, take the lighter', 'a', 'rect', 300],
    ['rr2', 200, 280, 'equal-cost requests,\nstateless servers', 'b', 'note', 260], ['lc2', 540, 280, 'mixed fast and slow\nrequests', 'g', 'note', 240], ['ch2', 870, 280, 'warm caches, sessions,\nWebSockets', 'p', 'note', 260], ['p22', 1180, 280, 'many LBs, no shared state,\nno herding', 'a', 'note', 280],
    ['w', 675, 410, 'weights for bigger machines · slow start for new ones · drain before removing', 'x', 'note', 820]],
  edges: [['rr', 'rr2', '', 'bn'], ['lc', 'lc2', '', 'gn'], ['ch', 'ch2', '', 'pn'], ['p2', 'p22', '', 'an']] },

// ================= Probabilistic data structures =================
'concept-bloom-filter': { w: 1350, h: 420, alt: 'A Bloom filter is a bit array plus several hash functions. Adding "alice" sets the bits at positions given by three hashes, 2, 7 and 11. Checking "bob" looks at his three positions; one of them is 0, so bob was definitely never added. Checking a key whose positions are all 1 answers probably yes, because other keys may have set those bits.',
  nodes: [['add', 160, 80, 'add("alice")|h1=2 · h2=7 · h3=11', 'g', 'rect', 280], ['bits', 675, 210, '0 0 1 0 0 0 0 1 0 1 0 1 0 0 1 0', 'b', 'rect', 640], ['chk', 1180, 80, 'contains("bob")?|h=1 · 7 · 14', 'a', 'rect', 280],
    ['no', 1180, 340, 'bit 1 is 0 →\nDEFINITELY NOT added', 'r', 'note', 270], ['maybe', 160, 340, 'all bits 1 →\nPROBABLY added', 'a', 'note', 230], ['sz', 675, 340, '~10 bits per item ≈ 1% false "yes" · never a false "no"', 'g', 'note', 560]],
  edges: [['add', 'bits', 'set 3 bits', 'g'], ['chk', 'bits', 'read 3 bits', 'a'], ['bits', 'no', '', 'rd']] },

'concept-count-min': { w: 1350, h: 440, alt: 'A Count-min sketch counts how often items appear using a small grid of counters: several rows, each with its own hash function. Each time an item arrives, one counter in every row is incremented. To estimate a count, read the item\'s counter in each row and take the minimum. Collisions only ever add, so the minimum is the closest estimate, and it never undercounts.',
  nodes: [['ev', 140, 220, 'event: "#worldcup"', 't', 'rect', 230],
    ['r1', 640, 100, 'row 1 (h1):  3 · 0 · 12 · 1 · 0 · 7', 'b', 'rect', 520], ['r2', 640, 220, 'row 2 (h2):  0 · 11 · 2 · 0 · 4 · 1', 'b', 'rect', 520], ['r3', 640, 340, 'row 3 (h3):  5 · 1 · 0 · 14 · 2 · 0', 'b', 'rect', 520],
    ['est', 1150, 220, 'estimate = min(12, 11, 14)|= 11 (never too low)', 'g', 'rect', 300]],
  edges: [['ev', 'r1', '+1', 'a'], ['ev', 'r2', '+1', 'a'], ['ev', 'r3', '+1', 'a'], ['r1', 'est', '', 'gd'], ['r2', 'est', '', 'gd'], ['r3', 'est', '', 'gd']] },

'concept-hyperloglog': { w: 1350, h: 420, alt: 'HyperLogLog counts distinct items in a few kilobytes. Each item, such as a user ID, is hashed. The first bits of the hash pick one of many registers; the rest is checked for its run of leading zeros. Seeing a hash with many leading zeros is rare, so the longest run seen hints at how many distinct items there were: about 2 to the power of that run. Averaging over 16,384 registers gives about 0.8 percent error using 12 KB, whether there are a thousand or a billion items. Duplicates hash the same way, so they never change the count.',
  nodes: [['u', 140, 200, 'user_id 81733', 't', 'rect', 200], ['h', 400, 200, 'hash|0110 · 0001 0111 …', 'b', 'rect', 260],
    ['reg', 700, 90, 'first bits → register #6', 'p', 'pill', 280], ['lz', 700, 310, 'leading zeros in the rest = 3', 'a', 'pill', 300],
    ['r', 1010, 200, '16,384 registers|each keeps the max run seen', 'g', 'db', 300], ['est', 1010, 350, '≈ 2^(average run) × correction\n±0.8% in 12 KB', 'g', 'note', 320]],
  edges: [['u', 'h', '', 't'], ['h', 'reg', '', 'p'], ['h', 'lz', '', 'a'], ['reg', 'r', '', 'p'], ['lz', 'r', 'max(old, 3)', 'a']] },

// ================= Gossip and failure detection =================
'concept-gossip': { w: 1350, h: 440, alt: 'Gossip spreads information like a rumour. In round 1 the node that knows an update tells a few randomly chosen peers. In round 2 every informed node does the same, so the number of informed nodes roughly multiplies each round. A cluster of 1,000 nodes is fully informed in about 10 rounds, with no central server and no single point of failure; duplicated messages are harmless.',
  zones: [[20, 20, 420, 400, 'Round 1', 'b'], [465, 20, 420, 400, 'Round 2', 'p'], [910, 20, 420, 400, 'Round 3', 'g']],
  nodes: [['a', 230, 110, 'A knows', 'r', 'circle', 110, 70], ['b', 110, 300, 'B', 'x', 'circle', 80, 60], ['c', 230, 330, 'C', 'x', 'circle', 80, 60], ['d', 350, 300, 'D', 'r', 'circle', 80, 60],
    ['a2', 600, 110, 'A', 'r', 'circle', 80, 60], ['d2', 760, 110, 'D', 'r', 'circle', 80, 60], ['e2', 560, 300, 'E', 'r', 'circle', 80, 60], ['f2', 680, 330, 'F', 'r', 'circle', 80, 60], ['g2', 810, 300, 'G', 'r', 'circle', 80, 60],
    ['all', 1120, 160, 'informed: 1 → 2 → 5 → 13 …', 'r', 'note', 340], ['n', 1120, 300, '1,000 nodes ≈ 10 rounds\nno coordinator', 'g', 'note', 300]],
  edges: [['a', 'd', '', 'r'], ['a2', 'e2', '', 'r'], ['a2', 'f2', '', 'r'], ['d2', 'g2', '', 'r'], ['d2', 'f2', '', 'rd']] },

'concept-swim': { w: 1350, h: 460, alt: 'Failure detection in the style of SWIM, used by Consul and Serf. Node A pings node B and gets no reply in time. Instead of declaring B dead, A asks two other nodes, C and D, to ping B for it. If neither gets a reply, B is marked suspect and that suspicion is gossiped; B has a short grace period to refute it. Only then is B declared dead. Indirect probes avoid false alarms when only the link between A and B is bad.',
  nodes: [['a', 160, 230, 'Node A', 'b', 'rect', 150], ['b', 1150, 230, 'Node B', 'r', 'rect', 150], ['c', 650, 90, 'Node C', 'g', 'rect', 150], ['d', 650, 370, 'Node D', 'g', 'rect', 150],
    ['s1', 650, 230, '1 · ping B → no ack', 'r', 'pill', 230], ['s4', 1150, 380, '4 · suspect → grace period\n→ dead', 'a', 'note', 260]],
  edges: [['a', 's1', '', 'rd'], ['s1', 'b', '', 'rd'], ['a', 'c', '2 · ping B for me', 'g'], ['a', 'd', '', 'g'], ['c', 'b', '3 · no ack', 'rd'], ['d', 'b', '', 'rd']] },

// ================= Disaster recovery =================
'concept-rpo-rto': { w: 1350, h: 380, alt: 'RPO and RTO on a timeline. The last good backup or replicated point is taken, then disaster strikes. The recovery point objective, RPO, is how much data you can afford to lose: the gap between the last recoverable point and the disaster. The recovery time objective, RTO, is how long you can afford to be down: from the disaster until service is restored.',
  nodes: [['bk', 200, 170, 'Last recoverable point|backup / replica position', 'b', 'rect', 300], ['dis', 675, 170, 'Disaster|region down, data deleted', 'r', 'rect', 290], ['up', 1150, 170, 'Service restored', 'g', 'rect', 240],
    ['rpo', 440, 300, 'RPO = data you lose', 'a', 'pill', 260], ['rto', 910, 300, 'RTO = time you are down', 'p', 'pill', 280]],
  edges: [['bk', 'dis', 'writes lost', 'r'], ['dis', 'up', 'recovering', 'p']] },

'concept-dr-ladder': { w: 1350, h: 460, alt: 'Four disaster-recovery strategies from cheapest to most resilient. Backup and restore: copy backups to another region; recovery takes hours and you lose data since the last backup. Pilot light: data is replicated continuously to a second region but servers are off; recovery in tens of minutes. Warm standby: a scaled-down full copy runs in the second region; recovery in minutes. Active-active: both regions serve traffic all the time; a region loss costs seconds and almost no data, but writes need conflict handling or a global database, and cost is roughly double.',
  nodes: [['b', 190, 160, 'Backup & restore|backups in region 2', 'x', 'rect', 270], ['p', 500, 160, 'Pilot light|data replicated,\n|servers off', 'b', 'rect', 250], ['w', 820, 160, 'Warm standby|small full copy\n|running', 'p', 'rect', 250], ['aa', 1150, 160, 'Active-active|both regions\n|serve traffic', 'g', 'rect', 260],
    ['b2', 190, 320, 'RPO hours · RTO hours\ncheapest', 'x', 'note', 250], ['p2', 500, 320, 'RPO seconds–minutes\nRTO ~tens of minutes', 'b', 'note', 250], ['w2', 820, 320, 'RPO seconds\nRTO minutes', 'p', 'note', 230], ['aa2', 1150, 320, 'RPO ≈ 0 · RTO seconds\n~2× cost, conflicts', 'g', 'note', 260]],
  edges: [['b', 'p', '', 'xn'], ['p', 'w', '', 'bn'], ['w', 'aa', '', 'pn'], ['b', 'b2', '', 'xn'], ['p', 'p2', '', 'bn'], ['w', 'w2', '', 'pn'], ['aa', 'aa2', '', 'gn']],
  texts: [[675, 430, 'cost and complexity grow to the right; downtime and data loss shrink', 'x', 17]] },

// ================= Encryption and secrets =================
'concept-envelope-encryption': { w: 1350, h: 460, alt: 'Envelope encryption with a key management service. The master key lives inside the KMS (backed by hardware security modules) and never leaves it. To encrypt a file, the service asks KMS for a fresh data key and gets it twice: in plaintext and encrypted under the master key. It encrypts the data locally with the plaintext data key, stores the ciphertext together with the encrypted data key, and throws the plaintext key away. To decrypt, it sends the encrypted data key to KMS, which checks permissions and returns the plaintext key. Rotating or revoking the master key protects everything, and a stolen disk is useless without KMS access.',
  nodes: [['kms', 200, 230, 'KMS / HSM|master key never leaves', 'p', 'rect', 280],
    ['svc', 620, 110, 'Service|1 · ask for a data key', 't', 'rect', 270], ['dk', 620, 260, 'data key (plaintext)|+ same key, encrypted', 'a', 'rect', 290], ['enc', 620, 390, '2 · encrypt data locally,\nthen forget plaintext key', 'a', 'note', 300],
    ['st', 1110, 230, 'Storage|ciphertext\n|+ encrypted data key', 'g', 'db', 280]],
  edges: [['svc', 'kms', 'GenerateDataKey', 'p'], ['kms', 'dk', '', 'p'], ['dk', 'st', '3 · store both', 'g'], ['st', 'kms', 'decrypt: send encrypted key (permission check)', 'pdC']] },

'concept-encryption-layers': { w: 1350, h: 440, alt: 'Where encryption applies in a typical system. In transit: TLS from the user to the load balancer, and mutual TLS between internal services so each side proves its identity. At rest: encrypted disks and database storage, plus application-level encryption of especially sensitive fields such as card numbers, so even a database administrator sees ciphertext. Secrets such as database passwords and API keys come from a secrets manager at runtime, not from code or config files, and are rotated automatically.',
  nodes: [['u', 110, 200, 'User', 't', 'rect', 120], ['lb', 360, 200, 'Load balancer', 'b', 'rect', 200], ['s1', 650, 120, 'Orders service', 'b', 'rect', 220], ['s2', 650, 290, 'Payments service', 'b', 'rect', 220],
    ['db', 1000, 200, 'Database|encrypted disk\n|+ card_no field-encrypted', 'g', 'db', 300], ['sm', 1000, 380, 'Secrets manager|DB password, API keys\n|rotated', 'p', 'rect', 300]],
  edges: [['u', 'lb', 'TLS', 'b'], ['lb', 's1', 'TLS', 'b'], ['s1', 's2', 'mTLS', 'g2'], ['s2', 'db', 'TLS', 'b'], ['sm', 's2', 'fetch at runtime', 'pd']] },

// ================= Authorization =================
'concept-authz-models': { w: 1350, h: 460, alt: 'Three authorization models. Role-based access control, RBAC: users get roles such as editor, and roles carry permissions such as edit_post; simple and auditable, but roles multiply. Attribute-based access control, ABAC: a policy evaluates attributes of the user, the resource and the context, for example allow if user.department equals doc.department and the time is within working hours; flexible but harder to audit. Relationship-based access control, ReBAC, as in Google Zanzibar: permissions follow a graph of relationships, for example Asha is a member of team Payments, which is a viewer of folder Q3, which contains doc 42, so Asha can view doc 42.',
  zones: [[20, 20, 400, 420, 'RBAC', 'b'], [460, 20, 420, 420, 'ABAC', 'p'], [920, 20, 410, 420, 'ReBAC (Zanzibar)', 'g']],
  nodes: [['u1', 220, 100, 'Asha', 't', 'rect', 140], ['r1', 220, 210, 'role: editor', 'b', 'pill', 180], ['p1', 220, 320, 'edit_post, publish', 'b', 'rect', 240],
    ['pol', 670, 200, 'Policy|user.dept == doc.dept\n|AND 09:00–18:00\n|AND device managed', 'p', 'rect', 340], ['in', 670, 360, 'attributes of user,\nresource, context', 'p', 'note', 260],
    ['g1', 1020, 90, 'Asha', 't', 'rect', 120], ['g2', 1220, 90, 'team:payments', 'g', 'rect', 170], ['g3', 1220, 230, 'folder:Q3', 'g', 'rect', 150], ['g4', 1020, 360, 'doc:42', 'g', 'rect', 130]],
  edges: [['u1', 'r1', 'has', 'b'], ['r1', 'p1', 'grants', 'b'], ['g1', 'g2', 'member', 'g'], ['g2', 'g3', 'viewer', 'g'], ['g3', 'g4', 'parent of', 'g'], ['g1', 'g4', 'can view?', 'ad']] },

'concept-authz-flow': { w: 1350, h: 400, alt: 'Where the authorization check happens. Authentication proves who the caller is, usually by validating a token at the gateway. Each service, when it handles a request, asks the authorization service a precise question: can user Asha perform view on document 42? The authorization service evaluates policies or relationship tuples and answers allow or deny, with caching for speed. The service enforces the answer. Decisions are logged for audit.',
  nodes: [['c', 120, 200, 'Client|JWT', 't', 'rect', 150], ['gw', 360, 200, 'Gateway|authN: who are you?', 'b', 'rect', 240], ['svc', 680, 200, 'Docs service|enforces', 'b', 'rect', 220],
    ['az', 1060, 110, 'Authorization service|policies / relation tuples', 'p', 'rect', 320], ['cache', 1060, 230, 'decision cache', 'p', 'pill', 200], ['log', 1060, 330, 'audit log', 'x', 'db', 180]],
  edges: [['c', 'gw', '', 't'], ['gw', 'svc', 'user = asha', 'b'], ['svc', 'az', 'can asha view doc:42?', 'p2'], ['az', 'log', '', 'xd']] },

// ================= Monolith vs microservices =================
'concept-monolith-micro': { w: 1350, h: 460, alt: 'A monolith versus microservices. A monolith is one deployable application containing all modules, such as users, orders and payments, sharing one database; calls between modules are in-process function calls and transactions are easy. Microservices split the modules into separately deployed services, each owning its own database, reached through an API gateway; teams deploy and scale independently, but calls go over the network and consistency across services needs sagas or events.',
  zones: [[20, 20, 520, 420, 'Monolith (modular)', 'b'], [580, 20, 750, 420, 'Microservices', 'p']],
  nodes: [['m', 280, 160, 'One app|users · orders · payments\n|in-process calls', 'b', 'rect', 340], ['mdb', 280, 330, 'One database|one transaction', 'b', 'db', 260],
    ['gw', 955, 80, 'API gateway', 'a', 'rect', 220], ['s1', 720, 220, 'Users', 'p', 'rect', 150], ['s2', 955, 220, 'Orders', 'p', 'rect', 150], ['s3', 1190, 220, 'Payments', 'p', 'rect', 160],
    ['d1', 720, 360, 'users DB', 'p', 'db', 150], ['d2', 955, 360, 'orders DB', 'p', 'db', 150], ['d3', 1190, 360, 'payments DB', 'p', 'db', 160]],
  edges: [['m', 'mdb', '', 'b'], ['gw', 's1', '', 'a'], ['gw', 's2', '', 'a'], ['gw', 's3', '', 'a'], ['s2', 's3', 'network call', 'pd'], ['s1', 'd1', '', 'p'], ['s2', 'd2', '', 'p'], ['s3', 'd3', '', 'p']] },

'concept-service-discovery': { w: 1350, h: 420, alt: 'Service discovery and a service mesh. When an instance of the payments service starts, it registers its address in a service registry such as Consul, etcd or Kubernetes DNS, and keeps sending heartbeats; dead instances drop out. The orders service looks up payments in the registry and calls a healthy instance. With a service mesh, a sidecar proxy next to each service does the lookup, load balancing, retries, timeouts, mutual TLS and metrics, so application code just calls payments.',
  nodes: [['reg', 675, 80, 'Service registry|Consul · etcd · K8s DNS', 'a', 'rect', 320],
    ['o', 200, 260, 'Orders service', 'b', 'rect', 220], ['sc1', 430, 260, 'sidecar proxy', 'p', 'pill', 190], ['sc2', 920, 260, 'sidecar proxy', 'p', 'pill', 190], ['p1', 1160, 200, 'payments #1', 'g', 'rect', 170], ['p2', 1160, 320, 'payments #2', 'g', 'rect', 170],
    ['n', 675, 380, 'sidecars handle discovery, load balancing, retries, mTLS, metrics', 'p', 'note', 640]],
  edges: [['o', 'sc1', '', 'b'], ['sc1', 'reg', 'where is payments?', 'ad'], ['p1', 'reg', 'register + heartbeat', 'gd'], ['sc1', 'sc2', 'mTLS', 'p'], ['sc2', 'p1', '', 'g'], ['sc2', 'p2', '', 'g']] },

// ================= Problem: search autocomplete =================
'problem-search-autocomplete-v1': { w: 1350, h: 340, alt: 'Search autocomplete v1: on every keystroke the client calls the API, which runs a SQL query over the search log, such as select query, count grouped by query where query starts with the prefix, order by count descending, limit 10. It works for a demo but at tens of thousands of keystrokes per second, each query scans and sorts millions of rows, so latency is far above the 100 millisecond budget.',
  nodes: [['c', 150, 170, 'Client|every keystroke', 't', 'rect', 200], ['api', 470, 170, 'Suggest API', 'b', 'rect', 200], ['db', 830, 170, 'Search log table|GROUP BY query\n|WHERE q LIKE \'ca%\'', 'b', 'db', 320],
    ['x', 1170, 170, 'scan + sort millions\nof rows per keystroke ✗', 'r', 'note', 260]],
  edges: [['c', 'api', '', 't'], ['api', 'db', '', 'b']] },

'problem-search-autocomplete-final': { w: 1350, h: 520, alt: 'Search autocomplete final design. Offline: search logs flow into Kafka, an aggregation job counts queries over a sliding window with decay, filters offensive or rare queries, and builds a trie in which every node stores its top 10 completions. The trie is serialized and loaded into memory on suggest servers, sharded by prefix range and replicated. Online: the client waits for a short pause in typing, checks its local cache, then calls through the CDN and load balancer to a suggest server, which walks the trie to the prefix node and returns its precomputed top 10 in about a millisecond. Trending queries are added by a faster streaming path.',
  zones: [[20, 20, 600, 480, 'Offline: build the index', 'p'], [650, 20, 680, 480, 'Online: answer each keystroke', 'g']],
  nodes: [['logs', 130, 90, 'Search logs', 'x', 'db', 170], ['k', 400, 90, 'Kafka', 'a', 'queue', 170], ['agg', 400, 230, 'Aggregate + filter|counts with time decay', 'p', 'rect', 300],
    ['tb', 400, 370, 'Trie builder|top 10 stored at\n|every node', 'p', 'rect', 280], ['snap', 130, 370, 'Trie snapshot|object storage', 'x', 'db', 200], ['trend', 130, 230, 'Trending|stream path', 'r', 'rect', 180],
    ['cl', 760, 90, 'Client|debounce 100 ms\n|+ local cache', 't', 'rect', 200], ['cdn', 1000, 90, 'CDN / LB|cache hot prefixes', 'b', 'rect', 220], ['ss', 1000, 260, 'Suggest servers|trie in RAM\n|sharded by prefix', 'g', 'rect', 280],
    ['r', 1000, 420, 'walk to "ca" node → read its top 10 → ~1 ms', 'g', 'note', 500]],
  edges: [['logs', 'k', '', 'x'], ['k', 'agg', '', 'a'], ['agg', 'tb', '', 'p'], ['tb', 'snap', '', 'p'], ['k', 'trend', '', 'rd'], ['snap', 'ss', 'load', 'pd'], ['trend', 'ss', 'merge', 'rdC'],
    ['cl', 'cdn', '', 't'], ['cdn', 'ss', '', 'b']] },

// ================= Problem: notification system =================
'problem-notification-system-v1': { w: 1350, h: 340, alt: 'Notification system v1: when something happens, the order service calls Apple\'s and Google\'s push services, the email provider and the SMS provider directly and synchronously inside the request. A slow provider slows checkout, a provider outage loses notifications, there is no retry, no deduplication, and no way to respect user preferences or quiet hours.',
  nodes: [['o', 180, 170, 'Order service|"order shipped"', 'b', 'rect', 240], ['apns', 650, 60, 'APNs (iOS)', 'x', 'rect', 200], ['fcm', 650, 150, 'FCM (Android)', 'x', 'rect', 200], ['em', 650, 240, 'Email provider', 'x', 'rect', 200], ['sms', 650, 320, 'SMS provider', 'x', 'rect', 200],
    ['x', 1080, 180, 'slow provider = slow checkout\noutage = lost messages\nno retries, no preferences ✗', 'r', 'note', 340]],
  edges: [['o', 'apns', '', 'x'], ['o', 'fcm', '', 'x'], ['o', 'em', '', 'x'], ['o', 'sms', '', 'x']] },

'problem-notification-system-final': { w: 1350, h: 540, alt: 'Notification system final design. Services send a notify request with an idempotency key to the notification service, which deduplicates, looks up user preferences and device tokens, applies quiet hours and per-user rate limits, renders the template, and writes one message per channel to a queue: push, email and SMS. Scheduled notifications wait in a scheduler first. Channel workers send to providers such as APNs, FCM, an email service or an SMS gateway, retrying with backoff; messages that keep failing go to a dead-letter queue. Every attempt is recorded in a delivery log, and provider callbacks report delivered, opened or bounced; invalid device tokens are removed.',
  nodes: [['svc', 120, 120, 'Services|notify(user, type,\n|idempotency key)', 't', 'rect', 210], ['sch', 120, 330, 'Scheduler|send at 9:00 local', 'a', 'rect', 210],
    ['ns', 430, 220, 'Notification service|dedupe · preferences\n|quiet hours · rate limit\n|template', 'b', 'rect', 280], ['pref', 430, 420, 'Preferences +|device tokens', 'b', 'db', 230],
    ['qp', 730, 110, 'push queue', 'a', 'queue', 170], ['qe', 730, 230, 'email queue', 'a', 'queue', 170], ['qs', 730, 350, 'SMS queue', 'a', 'queue', 170],
    ['w', 960, 230, 'Channel workers|retry + backoff', 'g', 'rect', 220], ['pv', 1220, 160, 'APNs · FCM|email · SMS', 'x', 'rect', 200], ['dlq', 960, 380, 'Dead-letter queue', 'r', 'queue', 240], ['dl', 1220, 330, 'Delivery log|sent · delivered\n|opened · bounced', 'p', 'db', 200]],
  edges: [['svc', 'ns', '', 't'], ['sch', 'ns', '', 'a'], ['ns', 'pref', '', 'bd'], ['ns', 'qp', '', 'a'], ['ns', 'qe', '', 'a'], ['ns', 'qs', '', 'a'], ['qp', 'w', '', 'g'], ['qe', 'w', '', 'g'], ['qs', 'w', '', 'g'],
    ['w', 'pv', '', 'g'], ['w', 'dlq', 'gave up', 'rd'], ['pv', 'dl', 'callbacks', 'pd']] },

// ================= Problem: distributed key-value store =================
'problem-key-value-store-v1': { w: 1350, h: 340, alt: 'Key-value store v1: one server with an in-memory hash map, written to an append-only log on disk for durability. It is simple and fast, but the data must fit on one machine, one machine caps throughput, and when it dies the store is unavailable until it restarts.',
  nodes: [['c', 180, 170, 'Clients|get / put', 't', 'rect', 200], ['s', 600, 170, 'One server|hash map in RAM\n|+ append-only log', 'b', 'rect', 300], ['d', 950, 170, 'disk', 'b', 'db', 150],
    ['x', 1180, 170, 'limited to one machine\'s\nRAM and disk · SPOF ✗', 'r', 'note', 300]],
  edges: [['c', 's', '', 't'], ['s', 'd', '', 'b']] },

'problem-key-value-store-final': { w: 1350, h: 560, alt: 'Dynamo-style key-value store. Nodes sit on a consistent-hash ring with virtual nodes; each key is stored on the next N equals 3 distinct nodes clockwise. A client sends a put to any node, which acts as coordinator, writes to the 3 replicas and returns once W equals 2 acknowledge; a get reads from R equals 2 and returns the newest version, repairing stale replicas. If a replica is down, a neighbour accepts the write with a hint and hands it back later (hinted handoff). Concurrent versions are detected with version vectors or resolved last-write-wins. Background anti-entropy compares Merkle trees between replicas. Gossip spreads cluster membership and failure suspicion. Each node stores data in an LSM-tree.',
  nodes: [['ring', 470, 280, 'Hash ring|virtual nodes', 'p', 'circle', 300, 300],
    ['A', 470, 110, 'Node A', 'b', 'rect', 130], ['B', 650, 220, 'Node B', 'b', 'rect', 130], ['C', 630, 390, 'Node C', 'b', 'rect', 130], ['D', 310, 400, 'Node D', 'x', 'rect', 130], ['E', 290, 200, 'Node E', 'b', 'rect', 130],
    ['cl', 110, 90, 'Client|put(k, v)', 't', 'rect', 170],
    ['q', 1050, 90, 'N=3 · W=2 · R=2|W + R > N', 'g', 'rect', 300], ['hh', 1050, 190, 'Hinted handoff|neighbour holds writes\n|for a down replica', 'a', 'rect', 300],
    ['vv', 1050, 300, 'Version vectors / LWW|for concurrent writes', 'p', 'rect', 300], ['ae', 1050, 400, 'Merkle anti-entropy|+ read repair', 'g', 'rect', 300], ['gs', 1050, 500, 'Gossip membership|LSM storage per node', 'x', 'rect', 300]],
  edges: [['cl', 'A', 'any node coordinates', 't'], ['A', 'B', 'replica', 'g'], ['A', 'C', 'replica', 'g']] },

// ================= Problem: distributed message queue =================
'problem-message-queue-v1': { w: 1350, h: 340, alt: 'Message queue v1: producers push messages into one broker that keeps an in-memory queue and deletes each message once a consumer takes it. It is simple, but one machine caps throughput, a crash loses everything in memory, and once a message is consumed nobody else can read it again, so a second team cannot replay the stream.',
  nodes: [['p', 180, 170, 'Producers', 't', 'rect', 180], ['b', 600, 170, 'One broker|in-memory queue\n|delete on consume', 'b', 'queue', 300], ['c', 1000, 170, 'Consumers', 'g', 'rect', 180],
    ['x', 1230, 170, 'crash = lost\nno replay ✗', 'r', 'note', 180]],
  edges: [['p', 'b', '', 't'], ['b', 'c', '', 'b']] },

'problem-message-queue-final': { w: 1350, h: 560, alt: 'Kafka-style distributed log. A topic is split into partitions; producers choose the partition by hashing the key, so one key\'s messages stay in order. Each partition is an append-only log of segment files on disk, with a leader on one broker and followers on others; a write is acknowledged once the in-sync replicas have it. Consumers in a group each own some partitions and commit the offset they have processed, so they can resume after a crash and other groups can read the same data independently. A controller, using Raft, assigns partition leaders and handles broker failures. Old segments are deleted by time or size, or compacted to keep the latest value per key.',
  nodes: [['pr', 120, 260, 'Producers|hash(key) →\n|partition', 't', 'rect', 190],
    ['p0', 520, 110, 'Partition 0|leader on broker 1', 'b', 'queue', 300], ['p1', 520, 260, 'Partition 1|leader on broker 2', 'b', 'queue', 300], ['p2', 520, 410, 'Partition 2|leader on broker 3', 'b', 'queue', 300],
    ['rep', 520, 510, 'each partition replicated to 2 followers (ISR)', 'p', 'note', 460],
    ['g1', 920, 160, 'Group "billing"|offsets 0:812 1:440 2:903', 'g', 'rect', 300], ['g2', 920, 360, 'Group "analytics"|reads the same data\n|at its own pace', 'g', 'rect', 300],
    ['ctl', 1220, 260, 'Controller (Raft)|leaders, failover', 'a', 'rect', 220], ['ret', 1220, 430, 'Retention|7 days or compacted', 'x', 'note', 200]],
  edges: [['pr', 'p0', '', 't'], ['pr', 'p1', '', 't'], ['pr', 'p2', '', 't'], ['p0', 'g1', '', 'g'], ['p1', 'g1', '', 'g'], ['p2', 'g2', '', 'g'], ['p1', 'g2', '', 'g'], ['ctl', 'p1', '', 'ad']] },

// ================= Problem: gaming leaderboard =================
'problem-leaderboard-v1': { w: 1350, h: 340, alt: 'Leaderboard v1: every score update is written to a scores table and every leaderboard view runs select ordered by score descending with limit 100, plus a count of players with a higher score to find a player\'s own rank. With millions of players and thousands of score updates per second, the rank query scans most of the table each time and the database falls over.',
  nodes: [['g', 160, 170, 'Game servers|score updates', 't', 'rect', 220], ['db', 600, 170, 'scores table|ORDER BY score DESC\n|COUNT(*) WHERE score > mine', 'b', 'db', 360], ['v', 1000, 170, 'Players|view rank', 't', 'rect', 170],
    ['x', 1230, 170, 'rank = scan\nmillions of rows ✗', 'r', 'note', 190]],
  edges: [['g', 'db', '', 't'], ['v', 'db', '', 'td']] },

'problem-leaderboard-final': { w: 1350, h: 520, alt: 'Leaderboard final design. Game servers send signed score events to a score service, which validates them, writes the durable result to a database, and updates a Redis sorted set for each leaderboard (global, per region, per season) with ZADD or ZINCRBY. A sorted set keeps members ordered by score in a skip list, so the top 100 is ZREVRANGE and a player\'s rank is ZREVRANK, both logarithmic time. Very large boards are sharded by score range or approximated; friends leaderboards are computed on read from a small set. A CDN or cache serves the top 100 for a few seconds. The database is the source of truth for rebuilding the sorted sets.',
  nodes: [['gs', 130, 130, 'Game servers|signed results', 't', 'rect', 210], ['ss', 430, 130, 'Score service|validate · anti-cheat', 'b', 'rect', 260], ['db', 430, 330, 'Scores DB|source of truth', 'b', 'db', 240],
    ['z', 820, 230, 'Redis sorted sets|lb:global · lb:EU\n|lb:season-12', 'a', 'db', 300], ['sk', 820, 410, 'skip list: rank and range in O(log n)', 'a', 'note', 380],
    ['api', 1180, 130, 'Leaderboard API|top 100: ZREVRANGE\n|my rank: ZREVRANK', 'g', 'rect', 280], ['cdn', 1180, 330, 'Cache / CDN|top 100 for 5 s', 'g', 'rect', 220]],
  edges: [['gs', 'ss', '', 't'], ['ss', 'db', '', 'b'], ['ss', 'z', 'ZADD / ZINCRBY', 'a'], ['api', 'z', '', 'gd'], ['cdn', 'api', '', 'g'], ['db', 'z', 'rebuild', 'bdc']] },
};
