// Diagrams for the Operating Systems for system design pages. Same spec format as pilot.js.
module.exports = {
// ---------------- 1. Processes and threads ----------------
'os-01-process-thread': { w: 1350, h: 480, alt: 'A process has its own address space with code, heap and stack; separate processes cannot see each other\'s memory. Threads inside one process share the code and heap but each has its own stack and registers.',
  zones: [[20, 20, 620, 440, 'Two processes: isolated', 'b'], [680, 20, 650, 440, 'One process, three threads: shared heap', 'g']],
  nodes: [['p1', 180, 130, 'Process A|own address space', 'b', 'rect', 230], ['p1m', 180, 300, 'code\nheap\nstack', 'b', 'note', 160], ['p2', 480, 130, 'Process B|own address space', 'b', 'rect', 230], ['p2m', 480, 300, 'code\nheap\nstack', 'b', 'note', 160],
    ['heap', 1005, 120, 'Shared: code + heap + open files', 'g', 'rect', 400], ['t1', 830, 300, 'Thread 1|own stack, registers', 't', 'rect', 200], ['t2', 1005, 300, 'Thread 2', 't', 'rect', 140], ['t3', 1180, 300, 'Thread 3', 't', 'rect', 140],
    ['n', 1005, 420, 'cheap to share data · a bug in one can corrupt all', 'g', 'note', 540]],
  edges: [['p1', 'p1m', '', 'bn'], ['p2', 'p2m', '', 'bn'], ['t1', 'heap', '', 'gd'], ['t2', 'heap', '', 'gd'], ['t3', 'heap', '', 'gd']],
  texts: [[330, 440, 'talk only via pipes, sockets, shared files', 'b', 16]] },

'os-01-context-switch': { w: 1350, h: 420, alt: 'A context switch: thread A is running when a timer interrupt or blocking system call enters the kernel; the kernel saves A\'s registers, the scheduler picks thread B, restores B\'s registers and resumes it. The direct cost is microseconds, and B then runs with cold CPU caches.',
  nodes: [['a', 150, 200, 'Thread A|running', 'b', 'rect', 180], ['k1', 430, 200, 'Trap into kernel|timer interrupt\nor blocking syscall', 'x', 'rect', 240], ['save', 720, 90, 'save A\'s registers', 'x', 'rect', 230],
    ['sch', 720, 310, 'scheduler picks B', 'p', 'rect', 230], ['rest', 1000, 200, 'restore B\'s registers', 'x', 'rect', 240], ['b', 1230, 200, 'Thread B|running (cold caches)', 'g', 'rect', 200]],
  edges: [['a', 'k1', '', 'b'], ['k1', 'save', '', 'x'], ['save', 'sch', '', 'x'], ['sch', 'rest', '', 'p'], ['rest', 'b', '', 'g']],
  texts: [[675, 410, 'Direct cost ~1–5 µs; the hidden cost is refilling CPU caches and TLB. Thousands per second are fine; millions are not.', 'x', 17]] },

'os-01-thread-per-request': { w: 1350, h: 440, alt: 'Thread-per-connection versus a bounded thread pool: ten thousand connections with one thread each means about ten gigabytes of stacks and constant context switching; a fixed pool of threads pulls work from a queue so memory and switching stay bounded.',
  zones: [[20, 20, 630, 400, 'One thread per connection', 'r'], [690, 20, 640, 400, 'Bounded thread pool', 'g']],
  nodes: [['c1', 150, 210, '10,000\nconnections', 't', 'rect', 170], ['th', 450, 130, '10,000 threads|× ~1 MB stack ≈ 10 GB', 'r', 'rect', 280], ['cs', 450, 300, 'constant context switches\nlock contention, cache thrash', 'r', 'note', 330],
    ['c2', 800, 210, 'requests', 't', 'rect', 140], ['q', 1010, 210, 'queue', 'a', 'queue', 150], ['pool', 1200, 210, 'N threads|N ≈ cores (CPU work)\nor more (blocking I/O)', 'g', 'rect', 250], ['n2', 1060, 360, 'full queue → reject fast (backpressure)', 'g', 'note', 440]],
  edges: [['c1', 'th', '', 'r'], ['th', 'cs', '', 'rd'], ['c2', 'q', '', 'a'], ['q', 'pool', '', 'g']] },

// ---------------- 2. Scheduling ----------------
'os-02-runqueue': { w: 1350, h: 440, alt: 'CPU scheduling: runnable threads wait in a run queue for one of the cores; the scheduler gives each a time slice. When there are more runnable threads than cores, each waits its turn, so latency grows even though every thread is runnable.',
  nodes: [['rq', 330, 200, 'Run queue|T5  T6  T7  T8  T9', 'a', 'queue', 420], ['c1', 800, 80, 'Core 1 · T1', 'b', 'rect', 200], ['c2', 800, 170, 'Core 2 · T2', 'b', 'rect', 200], ['c3', 800, 260, 'Core 3 · T3', 'b', 'rect', 200], ['c4', 800, 350, 'Core 4 · T4', 'b', 'rect', 200],
    ['bl', 330, 380, 'Blocked (not in queue)|waiting for disk, network, lock', 'x', 'note', 340], ['n', 1170, 210, 'time slice ~ms\nthen back to the queue\n(CFS: fairest share first)', 'p', 'note', 260]],
  edges: [['rq', 'c1', '', 'a'], ['rq', 'c2', '', 'a'], ['rq', 'c3', '', 'a'], ['rq', 'c4', '', 'a'], ['bl', 'rq', 'I/O done', 'xdC']] },

'os-02-utilisation': { w: 1300, h: 430, alt: 'Why latency explodes near full utilisation: at 50 percent busy a request rarely waits; at 80 percent it waits a few service times; at 95 percent queues are long and latency is many times the service time. Keep headroom.',
  nodes: [['u50', 220, 300, '50% busy|wait ≈ 1× service time', 'g', 'rect', 260], ['u80', 560, 220, '80% busy|wait ≈ 4×', 'a', 'rect', 220], ['u90', 860, 140, '90% busy|wait ≈ 9×', 'r', 'rect', 220], ['u99', 1140, 60, '99% busy|wait ≈ 99×', 'r', 'rect', 220]],
  edges: [['u50', 'u80', '', 'a'], ['u80', 'u90', '', 'r'], ['u90', 'u99', '', 'r']],
  texts: [[650, 400, 'Simple queue model: average wait ≈ ρ/(1−ρ) service times, where ρ = utilisation. Run CPUs at ~60–70% for latency-sensitive services.', 'x', 17]] },

// ---------------- 3. Memory ----------------
'os-03-virtual-memory': { w: 1350, h: 470, alt: 'Virtual memory: each process sees its own private address space; the page table maps each virtual page to a physical frame in RAM or marks it as not present; touching a page that is on disk causes a page fault, and the kernel loads it, which is slow.',
  nodes: [['va', 180, 130, 'Process A|virtual pages 0 1 2 3', 'b', 'rect', 240], ['vb', 180, 330, 'Process B|virtual pages 0 1 2', 'b', 'rect', 240],
    ['pt', 560, 230, 'Page tables (+ TLB cache)|virtual page → physical frame', 'p', 'rect', 330], ['ram', 1000, 130, 'RAM|physical frames', 'g', 'rect', 220], ['disk', 1000, 340, 'Disk / swap|evicted pages', 'x', 'db', 220],
    ['pf', 1240, 240, 'page fault\n~100 µs (SSD)\nvs ~100 ns RAM', 'r', 'note', 190]],
  edges: [['va', 'pt', '', 'b'], ['vb', 'pt', '', 'b'], ['pt', 'ram', 'present', 'g'], ['pt', 'disk', 'not present → fault', 'rd']] },

'os-03-page-cache': { w: 1350, h: 450, alt: 'The page cache: file reads go through the kernel\'s cache in RAM; a hit returns at memory speed, a miss reads from disk and keeps the page. Writes only dirty pages in the cache and are flushed to disk later. Unused RAM is used as cache, so free memory looks low on a healthy server.',
  nodes: [['app', 150, 220, 'Application|read() / write()', 't', 'rect', 210], ['pc', 560, 220, 'Kernel page cache (RAM)|clean pages · dirty pages', 'p', 'rect', 330], ['disk', 1050, 220, 'Disk', 'x', 'db', 180],
    ['hit', 560, 70, 'hit: memory speed, no disk I/O', 'g', 'note', 360], ['dirty', 1050, 390, 'dirty pages flushed later\n(or on fsync)', 'a', 'note', 280], ['free', 300, 390, '"free" memory low = RAM working as cache', 'b', 'note', 480]],
  edges: [['app', 'pc', '', 't2'], ['pc', 'disk', 'miss → read', 'xd'], ['pc', 'dirty', '', 'ad'], ['pc', 'hit', '', 'gd']] },

'os-03-gc-pause': { w: 1350, h: 420, alt: 'A stop-the-world garbage collection pause: all application threads stop while the collector runs; incoming requests queue up, timeouts fire, heartbeats are missed and a lease can expire, so the rest of the system thinks the process is dead.',
  nodes: [['run', 180, 200, 'App threads|serving requests', 'b', 'rect', 230], ['gc', 560, 200, 'STOP-THE-WORLD GC|2 s: no thread runs', 'r', 'rect', 280], ['res', 960, 200, 'Resume|as if no time passed', 'b', 'rect', 240],
    ['q', 560, 360, 'requests queue · p99 spikes\nheartbeat missed · lease expires', 'r', 'note', 360], ['f', 1130, 360, 'fix: smaller heaps, low-pause GC\n(G1, ZGC), timeouts > pauses, fencing', 'g', 'note', 400]],
  edges: [['run', 'gc', 'heap full', 'b'], ['gc', 'res', '', 'r'], ['gc', 'q', '', 'rd']] },

// ---------------- 4. Concurrency ----------------
'os-04-race': { w: 1350, h: 440, alt: 'A race condition on counter++: the increment is really load, add and store; two threads interleave so both load 41, both store 42, and one increment is lost. A lock or an atomic instruction makes the three steps indivisible.',
  zones: [[20, 20, 840, 400, 'Without protection', 'r'], [890, 20, 440, 400, 'With a lock or atomic op', 'g']],
  nodes: [['t1', 230, 80, 'Thread 1', 'b', 'pill'], ['t2', 640, 80, 'Thread 2', 'p', 'pill'], ['a1', 230, 170, 'load 41', 'b'], ['a2', 640, 220, 'load 41', 'p'], ['b1', 230, 270, 'add → 42 · store', 'b'], ['b2', 640, 320, 'add → 42 · store', 'p'],
    ['lost', 435, 380, 'counter = 42, expected 43: one update lost', 'r', 'note', 500],
    ['l', 1110, 150, 'lock(); counter++; unlock()', 'g', 'rect', 330], ['at', 1110, 270, 'atomic fetch_add(&counter, 1)\n(one CPU instruction)', 'g', 'rect', 330]],
  edges: [['a1', 'b1', '', 'b'], ['a2', 'b2', '', 'p']] },

'os-04-deadlock': { w: 1300, h: 420, alt: 'Deadlock: thread 1 holds lock A and waits for lock B, while thread 2 holds lock B and waits for lock A; neither can proceed. Fixes: always acquire locks in the same global order, use timeouts, or hold one lock at a time.',
  nodes: [['t1', 250, 120, 'Thread 1', 'b'], ['t2', 250, 320, 'Thread 2', 'p'], ['la', 700, 120, 'Lock A', 'a'], ['lb', 700, 320, 'Lock B', 'a'],
    ['fix', 1080, 220, 'Fix: one global lock order\n(always A before B)\nor try-lock with timeout', 'g', 'note', 320]],
  edges: [['la', 't1', 'held by', 'a'], ['t1', 'lb', 'waits for', 'rd'], ['lb', 't2', 'held by', 'a'], ['t2', 'la', 'waits for', 'rd']] },

// ---------------- 5. I/O models ----------------
'os-05-io-models': { w: 1350, h: 470, alt: 'Blocking I/O with a thread per connection: each thread sleeps inside read until data arrives. Event-driven I/O: one thread asks epoll which of thousands of sockets are ready and handles only those, never blocking.',
  zones: [[20, 20, 630, 430, 'Blocking: thread per connection', 'x'], [690, 20, 640, 430, 'Non-blocking: event loop + epoll', 'g']],
  nodes: [['b1', 200, 110, 'thread 1: read() … sleeping', 'x', 'rect', 300], ['b2', 200, 200, 'thread 2: read() … sleeping', 'x', 'rect', 300], ['b3', 200, 290, 'thread 3: got data → work', 'b', 'rect', 300], ['bn', 330, 390, 'simple code; memory and switches grow with connections', 'x', 'note', 600],
    ['s', 820, 200, '50,000\nsockets', 't', 'rect', 150], ['ep', 1040, 200, 'epoll / kqueue|"which are ready?"', 'p', 'rect', 220], ['loop', 1220, 330, 'event loop|1 thread per core', 'g', 'rect', 190], ['gn', 960, 390, 'Node.js, Nginx, Redis, Netty, Go runtime', 'g', 'note', 460]],
  edges: [['s', 'ep', 'register', 'p'], ['ep', 'loop', 'ready list', 'g'], ['loop', 'ep', 'wait again', 'gdC']] },

'os-05-c10k': { w: 1300, h: 420, alt: 'Holding a million connections on one server: each idle connection costs a file descriptor and a few kilobytes of kernel and application buffers, not a thread; raise file descriptor limits, use epoll, keep per-connection state small, and send heartbeats.',
  nodes: [['conn', 180, 200, '1,000,000\nidle WebSockets', 't', 'rect', 220], ['fd', 560, 90, 'file descriptor each|raise ulimit -n', 'b', 'rect', 280], ['mem', 560, 200, '~2–10 KB buffers each|≈ 2–10 GB RAM total', 'a', 'rect', 280], ['ep', 560, 310, 'epoll: cost ∝ active,\nnot total, connections', 'p', 'rect', 280],
    ['ok', 1030, 200, 'Fine on one big server\nif per-connection state is small\nand few are active at once', 'g', 'note', 380]],
  edges: [['conn', 'fd', '', 'b'], ['conn', 'mem', '', 'a'], ['conn', 'ep', '', 'p'], ['mem', 'ok', '', 'gd']] },

// ---------------- 6. Files and durability ----------------
'os-06-write-path': { w: 1400, h: 450, alt: 'The write path: write() copies data into the page cache and returns at once; the data is only in RAM. fsync forces it through the disk\'s volatile cache onto stable storage. A crash before fsync loses the write, so databases fsync the write-ahead log before acknowledging a commit.',
  nodes: [['app', 140, 200, 'write()', 't', 'pill'], ['pc', 450, 200, 'Page cache (RAM)|returns immediately', 'p', 'rect', 270], ['dc', 840, 200, 'Disk write cache|volatile', 'a', 'rect', 240], ['st', 1170, 200, 'Stable storage|survives power loss', 'g', 'db', 250],
    ['l1', 450, 360, 'crash here = write lost', 'r', 'note', 300], ['l2', 900, 360, 'fsync() forces it all the way to stable storage', 'g', 'note', 480]],
  edges: [['app', 'pc', '', 't'], ['pc', 'dc', 'flush', 'a'], ['dc', 'st', '', 'g']],
  texts: [[700, 60, 'Databases: append the commit to the WAL, fsync the WAL, then reply "committed".', 'x', 17]] },

'os-06-group-commit': { w: 1300, h: 420, alt: 'Group commit: an fsync takes about the same time whether it flushes one transaction or a hundred, so the database collects commits that arrive while a flush is running and makes them durable together with one fsync, multiplying commit throughput.',
  nodes: [['t', 180, 200, 'Tx 1 … Tx 100\narrive within ~1 ms', 't', 'rect', 240], ['wal', 560, 200, 'WAL buffer|append all 100 records', 'p', 'rect', 280], ['fs', 920, 200, 'ONE fsync|~0.1–1 ms on SSD', 'g', 'rect', 230], ['ack', 1200, 200, 'ack all 100', 'g', 'pill']],
  edges: [['t', 'wal', '', 't'], ['wal', 'fs', '', 'p'], ['fs', 'ack', '', 'g']],
  texts: [[650, 360, 'One fsync per commit caps a single writer at ~1k–10k commits/s; batching amortises it across many.', 'x', 17]] },

// ---------------- 7. Storage devices ----------------
'os-07-hdd-ssd': { w: 1350, h: 460, alt: 'Hard disk versus SSD: a hard disk must move its arm and wait for the platter to rotate, so a random read takes about 5–10 ms while sequential reads stream at a few hundred MB/s; an SSD has no moving parts, so random reads take about 100 µs, but it erases in large blocks, which causes write amplification.',
  zones: [[20, 20, 640, 420, 'Hard disk (HDD)', 'x'], [690, 20, 640, 420, 'Solid-state drive (SSD / NVMe)', 'b']],
  nodes: [['h1', 340, 110, 'seek arm + wait for rotation', 'x', 'rect', 340], ['h2', 340, 220, 'random read ≈ 5–10 ms\n~100–200 random IOPS', 'r', 'rect', 340], ['h3', 340, 330, 'sequential ≈ 100–250 MB/s\n→ 1000× better than random', 'g', 'rect', 340],
    ['s1', 1010, 110, 'flash chips, no moving parts', 'b', 'rect', 340], ['s2', 1010, 220, 'random read ≈ 0.1 ms\n100k+ IOPS · GB/s sequential', 'g', 'rect', 340], ['s3', 1010, 330, 'write in pages, erase in big blocks\n→ write amplification, wear', 'a', 'rect', 340]],
  edges: [['h1', 'h2', '', 'xn'], ['h2', 'h3', '', 'xn'], ['s1', 's2', '', 'bn'], ['s2', 's3', '', 'bn']] },

// ---------------- 8. Containers ----------------
'os-08-containers': { w: 1350, h: 460, alt: 'Containers versus virtual machines: VMs each run a full guest kernel on a hypervisor; containers are ordinary processes sharing the host kernel, isolated by namespaces (what they can see) and limited by cgroups (how much CPU and memory they can use).',
  zones: [[20, 20, 620, 420, 'Virtual machines', 'x'], [680, 20, 650, 420, 'Containers', 'b']],
  nodes: [['vm1', 180, 120, 'App|guest OS kernel', 'x', 'rect', 200], ['vm2', 450, 120, 'App|guest OS kernel', 'x', 'rect', 200], ['hv', 320, 270, 'Hypervisor', 'p', 'rect', 400], ['hw1', 320, 370, 'Hardware', 'x', 'rect', 400],
    ['c1', 820, 120, 'App A|process', 'b', 'rect', 170], ['c2', 1005, 120, 'App B|process', 'b', 'rect', 170], ['c3', 1190, 120, 'App C|process', 'b', 'rect', 170],
    ['ns', 1005, 230, 'namespaces: own view of PIDs, network, files\ncgroups: CPU and memory limits', 'g', 'rect', 560], ['k', 1005, 330, 'ONE shared host kernel', 'p', 'rect', 500], ['hw2', 1005, 400, 'Hardware', 'x', 'rect', 500]],
  edges: [['vm1', 'hv', '', 'xn'], ['vm2', 'hv', '', 'xn'], ['hv', 'hw1', '', 'xn'], ['ns', 'k', '', 'gn'], ['k', 'hw2', '', 'pn']] },

'os-08-throttling': { w: 1350, h: 430, alt: 'CPU throttling with cgroup quotas: a container limited to 2 CPUs gets 200 ms of CPU time per 100 ms period; a burst using 8 threads spends the quota in 25 ms and is frozen for the remaining 75 ms, so requests see latency spikes even though average CPU looks low.',
  nodes: [['lim', 200, 200, 'limit: 2 CPUs|= 200 ms CPU per 100 ms period', 'b', 'rect', 300], ['burst', 580, 200, '8 threads busy\nquota used in 25 ms', 'a', 'rect', 250], ['thr', 920, 200, 'THROTTLED|frozen for 75 ms', 'r', 'rect', 230], ['p99', 1210, 200, 'p99 spikes\navg CPU looks fine', 'r', 'note', 230],
    ['fix', 700, 370, 'fix: thread pools sized to the limit (not host cores), higher limits or no CPU limit for latency services', 'g', 'note', 1060]],
  edges: [['lim', 'burst', '', 'b'], ['burst', 'thr', '', 'a'], ['thr', 'p99', '', 'r']] },
};
