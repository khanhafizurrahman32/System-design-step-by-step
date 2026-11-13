// Diagrams for the DDIA 2nd-edition pages (material that is new in the 2nd edition).
// Same spec format as pilot.js. Diagrams for unchanged material keep their ddia-NN-k names.
module.exports = {
// ---------------- Ch 1: Trade-offs in data systems architecture ----------------
'ddia2-01-oltp-olap': { w: 1350, h: 500, alt: 'Operational and analytical systems: applications write to operational databases (OLTP); an ETL or ELT pipeline copies the data into a data warehouse or data lake, where analysts, dashboards and data scientists query it (OLAP); reverse ETL sends results back into the operational systems.',
  zones: [[20, 20, 420, 460, 'Operational · OLTP', 'b'], [900, 20, 430, 460, 'Analytical · OLAP', 'g']],
  nodes: [['app', 230, 90, 'Apps and services|serve users', 't', 'rect', 260], ['db1', 140, 260, 'Orders DB', 'b', 'db', 150], ['db2', 330, 260, 'Users DB', 'b', 'db', 150],
    ['n1', 230, 410, 'many small reads/writes by key\ncurrent state · ms latency', 'b', 'note', 340],
    ['etl', 670, 260, 'ETL / ELT|extract · transform · load', 'a', 'pill', 300],
    ['wh', 1010, 130, 'Data warehouse|tables, SQL', 'g', 'db', 190], ['lake', 1220, 130, 'Data lake|raw files', 'g', 'db', 170],
    ['bi', 1010, 290, 'Analysts · BI|dashboards', 'g', 'rect', 190], ['ds', 1220, 290, 'Data science|ML training', 'g', 'rect', 170],
    ['n2', 1115, 420, 'few huge scans over history\naggregates · seconds OK', 'g', 'note', 340]],
  edges: [['app', 'db1', '', 'b'], ['app', 'db2', '', 'b'], ['db1', 'etl', '', 'a'], ['db2', 'etl', '', 'a'], ['etl', 'wh', '', 'a'], ['etl', 'lake', '', 'ac'], ['wh', 'bi', '', 'g'], ['lake', 'ds', '', 'g'],
    ['wh', 'app', 'reverse ETL', 'pdc']] },

'ddia2-01-cloud-native': { w: 1350, h: 480, alt: 'Traditional versus cloud-native database architecture. Traditionally each database node stores its data on its own local disk and replicates to other nodes. A cloud-native database separates compute from storage: stateless query nodes keep only a cache, and all data lives in a shared, replicated storage service such as object storage, so compute can be added or removed in minutes.',
  zones: [[20, 20, 620, 440, 'Traditional: compute and storage together', 'x'], [680, 20, 650, 440, 'Cloud-native: storage separated from compute', 'p']],
  nodes: [['a1', 130, 130, 'DB node|CPU + RAM', 'b', 'rect', 160], ['a2', 330, 130, 'DB node|CPU + RAM', 'b', 'rect', 160], ['a3', 530, 130, 'DB node|CPU + RAM', 'b', 'rect', 160],
    ['d1', 130, 280, 'local disk', 'x', 'db', 140], ['d2', 330, 280, 'local disk', 'x', 'db', 140], ['d3', 530, 280, 'local disk', 'x', 'db', 140],
    ['tn', 330, 400, 'add a node → copy terabytes first', 'r', 'note', 420],
    ['c1', 820, 110, 'query node|cache only', 'p', 'rect', 170], ['c2', 1005, 110, 'query node', 'p', 'rect', 160], ['c3', 1180, 110, 'query node', 'p', 'rect', 160],
    ['obj', 1005, 280, 'Shared storage service|object storage (S3) · replicated across zones', 'g', 'db', 470],
    ['cn', 1005, 410, 'add compute in minutes · pay for storage separately', 'g', 'note', 580]],
  edges: [['a1', 'd1', '', 'x'], ['a2', 'd2', '', 'x'], ['a3', 'd3', '', 'x'], ['a1', 'a2', '', 'bd2'], ['a2', 'a3', '', 'bd2'],
    ['c1', 'obj', '', 'p2'], ['c2', 'obj', '', 'p2'], ['c3', 'obj', '', 'p2']] },

// ---------------- Ch 2: Nonfunctional requirements ----------------
'ddia2-02-timeline': { w: 1350, h: 500, alt: 'Social network timelines with the second edition\'s numbers: 500 million posts a day is about 5,800 per second on average and up to 150,000 at peak. Polling: 10 million online users asking every 5 seconds is 2 million queries a second, each looking up about 200 followed accounts, so 400 million lookups a second. Fan-out on write: each post is copied into about 200 follower timelines, about 1 million writes a second, and reading a timeline becomes one cache lookup. Celebrities with millions of followers are merged in at read time.',
  zones: [[20, 20, 630, 460, 'Pull: compute at read time', 'r'], [690, 20, 640, 460, 'Push: fan-out on write', 'g']],
  nodes: [['u', 170, 120, '10 M users online|poll every 5 s', 't', 'rect', 240], ['q', 470, 120, '2 M queries/s', 'r', 'rect', 200], ['l', 470, 270, '× 200 followed accounts|= 400 M lookups/s', 'r', 'rect', 280],
    ['n1', 335, 410, 'cheap writes, impossibly expensive reads', 'r', 'note', 470],
    ['p', 830, 120, 'Posts|5,800/s avg · 150k/s peak', 'b', 'rect', 250], ['f', 1150, 120, 'Fan-out workers', 'a', 'rect', 220], ['t', 1150, 270, 'Timeline caches|× 200 followers ≈ 1 M writes/s', 'g', 'db', 310],
    ['r', 830, 270, 'Read timeline|1 cache lookup', 'g', 'rect', 220], ['n2', 1010, 410, 'celebrities: skip fan-out, merge their posts at read', 'a', 'note', 560]],
  edges: [['u', 'q', '', 'r'], ['q', 'l', '', 'r'], ['p', 'f', '', 'b'], ['f', 't', '', 'a'], ['r', 't', '', 'gd']] },

'ddia2-02-response-time': { w: 1350, h: 420, alt: 'What makes up response time: the client sends a request, it travels over the network, waits in a queue at the server, is processed (the service time), and the reply travels back. Response time is everything the client sees; service time is only the processing; latency is time spent waiting, such as in the network or the queue. Under load, the queueing part grows fastest.',
  nodes: [['c', 130, 200, 'Client', 't', 'rect', 150], ['n1', 360, 110, 'network', 'x', 'pill', 150], ['q', 610, 110, 'queue|waiting for a thread', 'a', 'queue', 230], ['s', 880, 200, 'processing|= service time', 'b', 'rect', 220], ['n2', 520, 300, 'network', 'x', 'pill', 150],
    ['rt', 1150, 140, 'response time|= everything the client sees', 't', 'note', 290], ['lt', 1150, 280, 'latency|= time spent waiting', 'a', 'note', 290]],
  edges: [['c', 'n1', '', 't'], ['n1', 'q', '', 't'], ['q', 's', '', 'a'], ['s', 'n2', 'reply', 'b'], ['n2', 'c', '', 'b']],
  texts: [[675, 395, 'Under load the queue grows first: a server at 90% busy makes requests wait far longer than they take to process.', 'x', 17]] },

'ddia2-02-metastable': { w: 1350, h: 460, alt: 'A metastable failure, or retry storm: a brief overload makes requests slow; clients time out and retry, which adds more load; the server is now busier, so more requests time out and are retried. The loop keeps the system overloaded even after the original spike is gone. Fixes: exponential backoff with jitter, retry budgets, circuit breakers, load shedding and backpressure.',
  nodes: [['spike', 160, 90, 'Short spike|deploy, cache flush, failover', 'a', 'rect', 270], ['slow', 520, 90, 'Requests slow down|queues grow', 'r', 'rect', 250], ['to', 840, 230, 'Clients time out', 'r', 'rect', 220], ['retry', 520, 370, 'Clients retry|load ×2, ×3…', 'r', 'rect', 240],
    ['fix', 1150, 230, 'Break the loop|backoff + jitter\n|retry budget\n|circuit breaker\n|shed load early\n|backpressure', 'g', 'note', 260]],
  edges: [['spike', 'slow', '', 'a'], ['slow', 'to', '', 'rc'], ['to', 'retry', '', 'rc'], ['retry', 'slow', 'more load', 'rc']],
  texts: [[300, 250, 'the spike is gone,\nthe overload stays', 'r', 18]] },

'ddia2-02-architectures': { w: 1350, h: 440, alt: 'Three ways to use more hardware. Shared-memory: one big machine with many CPUs and lots of RAM (scale up). Shared-disk: several machines with their own CPUs and RAM all reading one shared storage array over a fast network, common in some warehouses. Shared-nothing: each node has its own CPU, RAM and disk and they coordinate only over the network (scale out), the default for distributed databases.',
  zones: [[20, 20, 400, 400, 'Shared-memory (scale up)', 'b'], [460, 20, 420, 400, 'Shared-disk', 'p'], [920, 20, 410, 400, 'Shared-nothing (scale out)', 'g']],
  nodes: [['sm', 220, 170, 'One machine|64 cores · 2 TB RAM', 'b', 'rect', 260], ['smd', 220, 310, 'disks', 'b', 'db', 150],
    ['m1', 560, 130, 'node', 'p', 'rect', 110], ['m2', 670, 130, 'node', 'p', 'rect', 110], ['m3', 780, 130, 'node', 'p', 'rect', 110], ['sd', 670, 310, 'Shared storage array|(or object storage)', 'p', 'db', 280],
    ['g1', 1010, 130, 'CPU+RAM', 'g', 'rect', 120], ['g2', 1235, 130, 'CPU+RAM', 'g', 'rect', 120], ['gd1', 1010, 300, 'disk', 'g', 'db', 110], ['gd2', 1235, 300, 'disk', 'g', 'db', 110]],
  edges: [['sm', 'smd', '', 'b'], ['m1', 'sd', '', 'p'], ['m2', 'sd', '', 'p'], ['m3', 'sd', '', 'p'], ['g1', 'gd1', '', 'g'], ['g2', 'gd2', '', 'g'], ['g1', 'g2', 'network only', 'gd2']],
  texts: [[220, 400, 'simple; one box is the limit', 'b', 16], [670, 400, 'storage contention limits it', 'p', 16], [1125, 400, 'scales furthest; all of Part II', 'g', 16]] },

// ---------------- Ch 3: Data models ----------------
'ddia2-03-cqrs': { w: 1350, h: 500, alt: 'Event sourcing and CQRS for a conference booking system. A user sends a command such as book seat; it is validated against current state and, if accepted, becomes an immutable event like seat booked that is appended to the event log. Separate projections read the log and build read-optimised views: seat availability, attendee badges and invoices. Writes go to the log; reads go to the views; any view can be rebuilt by replaying the log.',
  nodes: [['cmd', 150, 110, 'Command|"book seat 14 for Asha"', 't', 'rect', 260], ['val', 150, 290, 'Validate|seat free? paid?', 'a', 'rect', 220], ['rej', 150, 430, 'rejected → error', 'r', 'note', 220],
    ['log', 560, 290, 'Event log (append-only)|SeatBooked · SeatCancelled\n|PaymentReceived …', 'b', 'queue', 360],
    ['v1', 1030, 110, 'Seat-availability view', 'g', 'db', 280], ['v2', 1030, 260, 'Badge-printing list', 'g', 'db', 280], ['v3', 1030, 410, 'Invoices', 'g', 'db', 280],
    ['rd', 1270, 260, 'reads', 't', 'pill', 110]],
  edges: [['cmd', 'val', '', 't'], ['val', 'log', 'accepted → event', 'b'], ['val', 'rej', '', 'rd'], ['log', 'v1', 'projection', 'gc'], ['log', 'v2', '', 'g'], ['log', 'v3', '', 'gC'], ['rd', 'v1', '', 'td'], ['rd', 'v2', '', 'td'], ['rd', 'v3', '', 'td']],
  texts: [[560, 440, 'write side: the log is the truth', 'b', 17], [560, 470, 'read side: views are derived, rebuildable by replay', 'g', 17]] },

// ---------------- Ch 4: Storage and retrieval ----------------
'ddia2-04-bloom': { w: 1350, h: 420, alt: 'How a Bloom filter speeds up LSM-tree reads. To look up a key that may not exist, the engine would otherwise read every SSTable on disk. Each SSTable has a small in-memory Bloom filter; it answers either definitely not here, so the file is skipped, or maybe here, so the file is read. About 10 bits per key gives roughly a 1 percent false-positive rate.',
  nodes: [['q', 130, 200, 'get("user:42")', 't', 'rect', 200], ['m', 380, 200, 'memtable|not found', 'b', 'rect', 180],
    ['b1', 640, 90, 'Bloom: no', 'g', 'pill', 160], ['b2', 640, 200, 'Bloom: no', 'g', 'pill', 160], ['b3', 640, 310, 'Bloom: maybe', 'a', 'pill', 170],
    ['s1', 920, 90, 'SSTable 3 · skipped', 'x', 'db', 230], ['s2', 920, 200, 'SSTable 2 · skipped', 'x', 'db', 230], ['s3', 920, 310, 'SSTable 1 · read', 'b', 'db', 230],
    ['n', 1205, 200, '~10 bits per key\n≈ 1% false "maybe"\nnever a false "no"', 'p', 'note', 230]],
  edges: [['q', 'm', '', 't'], ['m', 'b1', '', 'b'], ['m', 'b2', '', 'b'], ['m', 'b3', '', 'b'], ['b1', 's1', '', 'xdn'], ['b2', 's2', '', 'xdn'], ['b3', 's3', '', 'a']] },

'ddia2-04-lakehouse': { w: 1350, h: 500, alt: 'The layers of a modern cloud data warehouse or lakehouse. At the bottom, object storage holds files. A file format such as Parquet or ORC lays out each file column by column. A table format such as Apache Iceberg or Delta Lake tracks which files make up a table, giving transactions, schema changes and time travel. A catalog such as Unity or Polaris names the tables and controls access. Query engines such as Spark, Trino, DuckDB or Snowflake sit on top and can all read the same tables.',
  nodes: [['qe', 560, 70, 'Query engines|Spark · Trino · DuckDB · Snowflake', 'b', 'rect', 560], ['tf', 560, 190, 'Table format|Iceberg · Delta Lake · Hudi', 'p', 'rect', 560], ['ff', 560, 300, 'File format|Parquet · ORC · Lance', 'a', 'rect', 560], ['os', 560, 420, 'Object storage|S3 · GCS · Azure Blob', 'g', 'db', 560],
    ['cat', 1130, 190, 'Catalog|Unity · Polaris · Glue\n|names tables, access control', 'x', 'rect', 300],
    ['w1', 140, 190, 'which files = the table\nsnapshots · time travel\natomic commits', 'p', 'note', 250], ['w2', 140, 300, 'columns stored apart\ncompressed', 'a', 'note', 250]],
  edges: [['qe', 'tf', '', 'b'], ['tf', 'ff', '', 'p'], ['ff', 'os', '', 'a'], ['qe', 'cat', 'look up table', 'xdc'], ['cat', 'tf', '', 'xd']] },

'ddia2-04-vector': { w: 1350, h: 500, alt: 'Vector search. An embedding model turns text or images into vectors so that similar meanings land close together. A query is embedded the same way and the index finds its nearest neighbours. A flat index compares against every vector, exact but slow. IVF groups vectors into clusters and searches only the clusters nearest the query. HNSW builds a layered graph and walks from a coarse top layer down to the closest points.',
  zones: [[20, 20, 520, 460, 'Embed', 'b'], [570, 20, 760, 460, 'Find nearest neighbours', 'g']],
  nodes: [['txt', 150, 110, '"cheap flights to Bali"', 't', 'rect', 250], ['em', 150, 260, 'Embedding model', 'p', 'rect', 220], ['vec', 400, 260, '[0.12, −0.8, …]|768 numbers', 'b', 'note', 220],
    ['nb', 280, 410, 'similar meaning → nearby vectors', 'b', 'note', 420],
    ['flat', 730, 120, 'Flat|compare with all\n|exact · slow', 'x', 'rect', 220], ['ivf', 975, 120, 'IVF|search nearest\n|clusters only', 'a', 'rect', 220], ['hnsw', 1205, 120, 'HNSW|walk a layered\n|graph downwards', 'g', 'rect', 200],
    ['res', 1000, 320, 'top-k nearest documents|cosine or Euclidean distance', 'g', 'db', 380], ['n', 1000, 440, 'used for semantic search and RAG · pgvector, Faiss', 'g', 'note', 520]],
  edges: [['txt', 'em', '', 't'], ['em', 'vec', '', 'p'], ['vec', 'flat', 'query vector', 'b'], ['flat', 'res', '', 'xd'], ['ivf', 'res', '', 'a'], ['hnsw', 'res', '', 'g']] },

// ---------------- Ch 5: Encoding and evolution ----------------
'ddia2-05-durable-execution': { w: 1350, h: 480, alt: 'Durable execution, as in Temporal or Restate. A workflow runs steps such as charge card, reserve room and send email; the framework logs the result of each step. If the process crashes after step two, a new worker re-runs the workflow code from the start, but for steps already logged it returns the recorded result instead of calling the service again, so the card is not charged twice. The code must be deterministic for the replay to line up.',
  zones: [[20, 20, 640, 440, 'First run', 'b'], [690, 20, 640, 440, 'After the crash: replay', 'g']],
  nodes: [['a1', 180, 100, '1 · charge card', 'b', 'rect', 220], ['a2', 180, 210, '2 · reserve room', 'b', 'rect', 220], ['a3', 180, 320, '3 · send email', 'x', 'rect', 220], ['cr', 180, 400, 'worker crashes ✗', 'r', 'note', 220],
    ['log', 500, 210, 'Durable log|1: ok, txn 81\n|2: ok, room 512', 'a', 'db', 230],
    ['b1', 850, 100, '1 · charge card', 'g', 'rect', 220], ['b2', 850, 210, '2 · reserve room', 'g', 'rect', 220], ['b3', 850, 320, '3 · send email', 'b', 'rect', 220],
    ['n1', 1160, 155, 'result read from the log\nservice NOT called again', 'g', 'note', 280], ['n2', 1160, 320, 'runs for real now', 'b', 'note', 280]],
  edges: [['a1', 'a2', '', 'b'], ['a2', 'a3', '', 'b'], ['a1', 'log', '', 'ad'], ['a2', 'log', '', 'ad'], ['b1', 'b2', '', 'g'], ['b2', 'b3', '', 'g'], ['log', 'b1', 'replay', 'ac'], ['b1', 'n1', '', 'gdn'], ['b3', 'n2', '', 'bdn']] },

// ---------------- Ch 6: Replication ----------------
'ddia2-06-sync-engine': { w: 1350, h: 460, alt: 'A sync engine for local-first or offline-first apps. Each device keeps a full local copy of the user\'s data, so reads and writes happen instantly on the device, even offline. A sync engine sends local changes to the server and pulls other devices\' changes in the background. Because every device accepts writes, this is multi-leader replication with each device acting as a leader, and concurrent edits must be merged, for example with CRDTs.',
  nodes: [['p', 170, 110, 'Phone|UI ⇄ local DB', 'b', 'rect', 230], ['l', 170, 330, 'Laptop|UI ⇄ local DB', 'b', 'rect', 230],
    ['se1', 470, 110, 'sync engine', 'p', 'pill', 170], ['se2', 470, 330, 'sync engine', 'p', 'pill', 170], ['srv', 820, 220, 'Sync server|stores and relays changes', 'g', 'db', 290],
    ['off', 170, 220, 'offline? keep working;\nchanges queue locally', 'a', 'note', 290],
    ['n', 1150, 220, 'every device is a leader\n→ concurrent edits\n→ merge (CRDT)', 'r', 'note', 260]],
  edges: [['p', 'se1', '', 'b2'], ['l', 'se2', '', 'b2'], ['se1', 'srv', 'background', 'p2'], ['se2', 'srv', '', 'p2']] },

'ddia2-06-crdt-ot': { w: 1350, h: 480, alt: 'Merging concurrent text edits. Both users start with the word ice. User A inserts n at position 0, giving nice; user B inserts an exclamation mark at position 3, giving ice!. Applied naively, B\'s position 3 is now wrong on A\'s copy, producing nic!e. Operational transformation shifts B\'s position to 4 because A inserted before it. A CRDT instead gives every character a unique ID and inserts relative to IDs, so both replicas converge on nice!.',
  nodes: [['s', 675, 70, 'Both start with "ice"', 't', 'rect', 300], ['a', 330, 190, 'A: insert "n" at 0|→ "nice"', 'b', 'rect', 280], ['b', 1020, 190, 'B: insert "!" at 3|→ "ice!"', 'p', 'rect', 280],
    ['bad', 330, 330, 'naive: apply B\'s "at 3"|→ "nic!e" ✗', 'r', 'rect', 300], ['ot', 760, 330, 'OT: A inserted before 3,|so shift B to 4', 'a', 'rect', 290], ['crdt', 1100, 330, 'CRDT: insert after|char-ID of "e"', 'g', 'rect', 260],
    ['ok', 930, 440, 'both replicas converge: "nice!"', 'g', 'note', 400]],
  edges: [['s', 'a', '', 'b'], ['s', 'b', '', 'p'], ['b', 'a', 'B\'s op sent to A', 'pd'], ['a', 'bad', '', 'rd'], ['a', 'ot', '', 'a'], ['a', 'crdt', '', 'g'], ['ot', 'ok', '', 'g'], ['crdt', 'ok', '', 'g']] },

// ---------------- Ch 7: Sharding ----------------
'ddia2-07-cells': { w: 1350, h: 470, alt: 'Multitenancy with a cell-based architecture. A thin routing layer maps each tenant to a cell. Each cell is a complete, independent copy of the stack, with its own services and database, serving a group of small tenants; a very large tenant can get a cell of its own. A bad deploy or overload in one cell affects only that cell\'s tenants, and cells can be upgraded one at a time.',
  nodes: [['r', 675, 70, 'Router|tenant → cell lookup', 'a', 'rect', 300],
    ['c1', 230, 250, 'Cell 1|services + DB\n|tenants A, B, C', 'b', 'rect', 260], ['c2', 675, 250, 'Cell 2|services + DB\n|tenants D, E, F', 'b', 'rect', 260], ['c3', 1120, 250, 'Cell 3|services + DB\n|tenant G (huge)', 'p', 'rect', 260],
    ['bad', 230, 400, 'bad deploy here → only A, B, C hurt', 'r', 'note', 390], ['n', 900, 400, 'roll out upgrades cell by cell · per-tenant backup, residency', 'g', 'note', 600]],
  edges: [['r', 'c1', '', 'a'], ['r', 'c2', '', 'a'], ['r', 'c3', '', 'a']] },

// ---------------- Ch 8: Transactions ----------------
'ddia2-08-exactly-once': { w: 1350, h: 470, alt: 'Exactly-once message processing inside one database. A consumer receives message 42 from the broker. In a single database transaction it applies the effect, for example adding to a balance, and inserts message ID 42 into a processed-messages table, then commits and only then acknowledges the broker. If the message is delivered again, the insert of 42 conflicts or the lookup finds it, so the effect is skipped.',
  nodes: [['br', 150, 210, 'Broker|msg 42: +$50', 'a', 'queue', 220], ['c', 430, 210, 'Consumer', 't', 'rect', 170],
    ['tx', 830, 210, 'ONE DB transaction|1 · UPDATE balance += 50\n|2 · INSERT processed_ids (42)\n|3 · COMMIT', 'b', 'rect', 400],
    ['ack', 430, 380, 'then ack 42', 'g', 'pill', 170], ['dup', 1180, 380, 'redelivered 42?\nalready in processed_ids\n→ skip', 'g', 'note', 270], ['n', 830, 380, 'both happen or neither', 'b', 'note', 290]],
  edges: [['br', 'c', '', 'a'], ['c', 'tx', '', 't'], ['tx', 'ack', '', 'gC'], ['ack', 'br', '', 'gd']] },

// ---------------- Ch 9: Trouble with distributed systems ----------------
'ddia2-09-dst': { w: 1350, h: 460, alt: 'Deterministic simulation testing, as used by FoundationDB and TigerBeetle. The whole distributed system runs inside one single-threaded simulator. The network, clocks and disks are fakes controlled by a random number generator with a seed, which injects message loss, delays, crashes and disk errors. Thousands of runs happen faster than real time; when an invariant check fails, rerunning with the same seed reproduces the exact same failure for debugging.',
  zones: [[20, 20, 930, 420, 'One process, one thread, simulated time', 'p']],
  nodes: [['n1', 140, 110, 'node 1', 'b', 'rect', 140], ['n2', 340, 110, 'node 2', 'b', 'rect', 140], ['n3', 540, 110, 'node 3', 'b', 'rect', 140],
    ['fake', 340, 250, 'Fake network · fake clock · fake disk', 'x', 'rect', 520], ['rng', 340, 370, 'RNG(seed = 7731)|drop · delay · crash · corrupt', 'a', 'rect', 420],
    ['chk', 780, 250, 'Invariant checks|"never two leaders"', 'g', 'rect', 230],
    ['bug', 1150, 160, 'check fails at seed 7731', 'r', 'note', 300], ['re', 1150, 320, 'rerun seed 7731\n→ same bug, every time', 'g', 'note', 300]],
  edges: [['n1', 'fake', '', 'b2'], ['n2', 'fake', '', 'b2'], ['n3', 'fake', '', 'b2'], ['rng', 'fake', '', 'a'], ['fake', 'chk', '', 'x'], ['chk', 'bug', '', 'rd'], ['bug', 're', '', 'g']] },

// ---------------- Ch 10: Consistency and consensus ----------------
'ddia2-10-ids': { w: 1350, h: 470, alt: 'Ways to generate unique IDs. Auto-increment in one database is simple and ordered but is a single point of failure. A random UUID version 4 needs no coordination but has no order, which scatters inserts across a B-tree index. Time-ordered IDs such as Snowflake, UUID version 7 or ULID put a timestamp first, then a machine or random part and a sequence number, so they are roughly sorted by creation time without coordination; but they are only as ordered as the clocks.',
  nodes: [['auto', 220, 100, 'Auto-increment (one DB)|1, 2, 3 … ordered · SPOF', 'x', 'rect', 340], ['u4', 675, 100, 'UUIDv4|122 random bits · no order', 'a', 'rect', 340], ['blk', 1130, 100, 'Block allocation|node gets 1000–1999', 'b', 'rect', 320],
    ['ts', 300, 270, 'timestamp (ms)|41 bits', 'g', 'rect', 300], ['mid', 620, 270, 'machine ID|10 bits', 'p', 'rect', 200], ['seq', 850, 270, 'sequence|12 bits', 'b', 'rect', 200],
    ['lab', 1130, 270, 'Snowflake-style 64-bit ID|(UUIDv7, ULID similar)', 'g', 'note', 300],
    ['n', 675, 410, 'time first: roughly sorted, no coordination, only as ordered as the clocks', 'g', 'note', 1000]],
  edges: [['ts', 'mid', '', 'gn'], ['mid', 'seq', '', 'pn']] },

'ddia2-10-hlc': { w: 1350, h: 460, alt: 'Logical clocks compared. A Lamport clock is one counter per node; it gives a total order that respects causality but cannot tell whether two events were concurrent. A hybrid logical clock combines physical time with a Lamport-style counter, so timestamps stay close to wall-clock time while never going backwards, used by CockroachDB. A vector clock keeps one counter per node and can detect concurrency, at the cost of size that grows with the number of nodes.',
  nodes: [['lam', 220, 140, 'Lamport clock|one counter\n|max(mine, seen) + 1', 'b', 'rect', 300], ['hlc', 675, 140, 'Hybrid logical clock|(wall-clock ms, counter)\n|never goes backwards', 'p', 'rect', 330], ['vc', 1130, 140, 'Vector clock|one counter per node\n|[A:3, B:1, C:4]', 'g', 'rect', 310],
    ['l2', 220, 330, 'total order, respects causality\ncan\'t detect concurrency', 'b', 'note', 330], ['h2', 675, 330, 'close to real time, compact\nCockroachDB, YugabyteDB', 'p', 'note', 330], ['v2', 1130, 330, 'detects concurrent writes\nsize grows with nodes', 'g', 'note', 310]],
  edges: [['lam', 'l2', '', 'bn'], ['hlc', 'h2', '', 'pn'], ['vc', 'v2', '', 'gn']] },

'ddia2-10-consensus-forms': { w: 1350, h: 460, alt: 'Consensus comes in many equivalent forms: if you can solve one, you can solve the others. Single-value consensus: all nodes decide the same value, such as who is leader. A shared log, also called total order broadcast: every node appends and sees entries in the same order. Fetch-and-add or compare-and-set on a linearizable register. Atomic commitment: all participants commit or all abort. Raft, Paxos and Zab implement these; ZooKeeper and etcd offer them as a service.',
  nodes: [['c', 675, 220, 'Consensus|fault-tolerant agreement\n|by a majority', 'r', 'circle', 280, 200],
    ['v', 220, 100, 'Single value|"who is leader for epoch 5?"', 'b', 'rect', 330], ['log', 1130, 100, 'Shared log|same entries, same order\n|on every node', 'b', 'rect', 320],
    ['cas', 220, 350, 'Fetch-and-add / CAS|unique counter, locks, usernames', 'b', 'rect', 340], ['ac', 1130, 350, 'Atomic commit|all commit or all abort', 'b', 'rect', 320]],
  edges: [['c', 'v', '', 'r2'], ['c', 'log', '', 'r2'], ['c', 'cas', '', 'r2'], ['c', 'ac', '', 'r2']],
  texts: [[675, 440, 'Raft · Paxos · Zab implement it; ZooKeeper and etcd sell it as a service', 'x', 17]] },

// ---------------- Ch 11: Batch processing ----------------
'ddia2-11-orchestration': { w: 1350, h: 480, alt: 'How a batch job runs today. A workflow orchestrator such as Airflow, Dagster or Prefect triggers jobs in dependency order as a DAG. Each job is submitted to a scheduler, which asks a resource manager such as Kubernetes or YARN for machines; executors on those machines run the tasks, reading input from and writing output to object storage. Failed or preempted tasks are simply re-run, because inputs are immutable.',
  nodes: [['orc', 200, 90, 'Workflow orchestrator|Airflow · Dagster · Prefect\n|DAG: extract → join → train', 'p', 'rect', 320], ['sch', 200, 280, 'Job scheduler|split into tasks', 'b', 'rect', 260], ['rm', 590, 280, 'Resource manager|Kubernetes · YARN', 'a', 'rect', 270],
    ['e1', 930, 120, 'executor', 'b', 'rect', 150], ['e2', 930, 230, 'executor', 'b', 'rect', 150], ['e3', 930, 340, 'executor (spot)', 'r', 'rect', 180],
    ['os', 1220, 230, 'Object storage|input & output files', 'g', 'db', 220], ['n', 590, 420, 'task preempted or failed? run it again: inputs never change', 'g', 'note', 620]],
  edges: [['orc', 'sch', 'submit', 'p'], ['sch', 'rm', 'need 50 cores', 'b'], ['rm', 'e1', '', 'a'], ['rm', 'e2', '', 'a'], ['rm', 'e3', '', 'a'], ['e1', 'os', '', 'g2'], ['e2', 'os', '', 'g2'], ['e3', 'os', '', 'g2']] },

// ---------------- Ch 12: Stream processing ----------------
'ddia2-12-ivm': { w: 1350, h: 420, alt: 'Incremental view maintenance. Instead of recomputing a query over all data, a streaming engine such as Materialize, RisingWave or Feldera reads the change stream from the database and updates the stored result by applying only each change: a new order adds its amount to the customer\'s total. Reads of the view are instant and always fresh to within the stream lag.',
  nodes: [['db', 150, 200, 'Orders DB', 'b', 'db', 170], ['cdc', 420, 200, 'change stream|+order 9: Asha $30', 'a', 'queue', 260], ['ivm', 740, 200, 'Streaming engine|apply only the delta', 'p', 'rect', 260],
    ['v', 1060, 200, 'View: total per customer|Asha: 120 → 150', 'g', 'db', 300], ['app', 1100, 360, 'App reads the view: instant, fresh', 'g', 'note', 340], ['no', 680, 360, 'never re-scans all orders', 'p', 'note', 290]],
  edges: [['db', 'cdc', 'CDC', 'b'], ['cdc', 'ivm', '', 'a'], ['ivm', 'v', '', 'p']] },

// ---------------- Ch 14: Doing the right thing ----------------
'ddia2-14-feedback': { w: 1350, h: 480, alt: 'A self-reinforcing feedback loop in algorithmic decision making. A good worker suffers a misfortune and misses some bill payments; their credit score drops; employers who screen on credit score reject them; without work their finances get worse, which lowers the score further. The data looks objective, but the system pushes the person into a downward spiral. Systems thinking asks how the whole loop, including the people in it, behaves.',
  nodes: [['m', 180, 90, 'Misfortune|illness, layoff', 'a', 'rect', 230], ['p', 560, 90, 'Misses bill payments', 'r', 'rect', 260], ['s', 900, 230, 'Credit score drops', 'r', 'rect', 240], ['j', 560, 380, 'Employers screening on|score say no', 'r', 'rect', 280], ['w', 220, 260, 'No income|finances worse', 'r', 'rect', 230],
    ['n', 1170, 380, 'ask: does the system\namplify differences\nor counter them?', 'g', 'note', 270]],
  edges: [['m', 'p', '', 'a'], ['p', 's', '', 'rc'], ['s', 'j', '', 'rc'], ['j', 'w', '', 'rc'], ['w', 'p', '', 'rc']],
  texts: [[560, 240, 'downward spiral', 'r', 22]] },
};
