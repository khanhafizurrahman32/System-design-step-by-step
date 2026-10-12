// Diagrams for the Computer Networking (Kurose & Ross) study notes. Same spec format as pilot.js.
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
// ---------------- Chapter 1 ----------------
'cn-01-internet': { w: 1400, h: 560, alt: 'The Internet as a network of networks: hosts at the edge connect through access networks (home, mobile, enterprise) to regional ISPs, which connect to tier-1 ISPs and content provider networks at internet exchange points.',
  zones: [[20, 20, 330, 520, 'Network edge', 't'], [380, 20, 330, 520, 'Access networks', 'a'], [740, 20, 640, 520, 'Network core', 'p']],
  nodes: [['h1', 185, 110, 'Laptop', 't', 'pill'], ['h2', 185, 250, 'Phone', 't', 'pill'], ['h3', 185, 390, 'Servers|in a data centre', 't'],
    ['a1', 545, 110, 'Home: cable / fibre|router + modem', 'a', 'rect', 280], ['a2', 545, 250, 'Mobile: 4G / 5G|base station', 'a', 'rect', 280], ['a3', 545, 390, 'Enterprise LAN|Ethernet + Wi-Fi', 'a', 'rect', 280],
    ['r1', 880, 180, 'Regional ISP', 'p'], ['r2', 880, 400, 'Regional ISP', 'p'], ['t1', 1230, 110, 'Tier-1 ISP|global backbone', 'p', 'rect', 230], ['ixp', 1230, 290, 'IXP|networks peer here', 'x', 'rect', 230], ['cp', 1230, 450, 'Content provider|own global network', 'g', 'rect', 250]],
  edges: [['h1', 'a1', ''], ['h2', 'a2', ''], ['h3', 'a3', ''], ['a1', 'r1', '', 'a'], ['a2', 'r1', '', 'a'], ['a3', 'r2', '', 'a'], ['r1', 't1', '', 'p'], ['r1', 'ixp', '', 'p'], ['r2', 'ixp', '', 'p'], ['ixp', 'cp', '', 'g'], ['t1', 'ixp', '', 'pd']] },

'cn-01-switching': { w: 1350, h: 470, alt: 'Circuit switching reserves a fixed share of every link for the whole call, so capacity sits idle when the user is silent; packet switching sends packets that share links on demand and queue at routers when the link is busy.',
  zones: [[20, 20, 630, 430, 'Circuit switching (old phone network)', 'x'], [690, 20, 640, 430, 'Packet switching (the Internet)', 'b']],
  nodes: [['c1', 110, 150, 'Caller', 't', 'pill'], ['s1', 335, 150, 'Switch', 'x'], ['c2', 560, 150, 'Callee', 't', 'pill'],
    ['n1', 335, 330, 'a fixed slice of each link is reserved\nfor the whole call, used or not\nguaranteed rate, but wasteful', 'x', 'note', 480],
    ['p1', 790, 100, 'Host A', 't', 'pill'], ['p2', 790, 230, 'Host B', 't', 'pill'], ['r', 1020, 165, 'Router|queue ▮▮▮', 'b'], ['p3', 1230, 165, 'Server', 'g', 'pill'],
    ['n2', 1010, 350, 'packets share the link on demand\nno reservation → far more users\nbut queues can grow and drop packets', 'b', 'note', 480]],
  edges: [['c1', 's1', '', 'x2'], ['s1', 'c2', '', 'x2'], ['p1', 'r', 'pkts', 'b'], ['p2', 'r', 'pkts', 'b'], ['r', 'p3', 'one at a time', 'b']] },

'cn-01-delay': { w: 1350, h: 460, alt: 'The four delays a packet meets at each router: processing (check header, pick output), queuing (wait behind other packets), transmission (push all bits onto the link, size divided by bandwidth) and propagation (travel along the wire at about two thirds the speed of light).',
  nodes: [['a', 120, 200, 'Router A', 'b'], ['p', 360, 90, '1 Processing|check header, choose output · µs', 'x', 'rect', 330], ['q', 360, 310, '2 Queuing|wait behind other packets · 0 → ms', 'a', 'rect', 330],
    ['t', 760, 200, '3 Transmission|push all bits onto the link\n= packet size ÷ link rate', 'p', 'rect', 330], ['pr', 1120, 90, '4 Propagation|travel the distance\n= length ÷ ~2×10⁸ m/s', 'g', 'rect', 300], ['b', 1200, 330, 'Router B', 'b']],
  edges: [['a', 'p', '', 'x'], ['p', 'q', '', 'x'], ['q', 't', '', 'a'], ['t', 'pr', '', 'p'], ['pr', 'b', '', 'g']],
  texts: [[675, 440, 'Example: 1,500-byte packet on a 100 Mb/s link = 0.12 ms to transmit; 1,000 km of fibre = 5 ms to propagate.', 'x', 17]] },

'cn-01-layers': { w: 1350, h: 520, alt: 'The five-layer Internet stack and encapsulation: application data gets a transport header to become a segment, an IP header to become a datagram, and a link header and trailer to become a frame, which is sent as bits; each layer on the receiving side removes its own header.',
  nodes: [['l5', 220, 70, 'Application|HTTP, DNS, SMTP', 'g', 'rect', 300], ['l4', 220, 160, 'Transport|TCP, UDP', 'b', 'rect', 300], ['l3', 220, 250, 'Network|IP, routing', 'p', 'rect', 300], ['l2', 220, 340, 'Link|Ethernet, Wi-Fi', 'a', 'rect', 300], ['l1', 220, 430, 'Physical|bits on wire / radio', 'x', 'rect', 300],
    ['m', 900, 70, 'message:  [ data ]', 'g', 'rect', 420], ['s', 900, 160, 'segment:  [ TCP hdr · data ]', 'b', 'rect', 420], ['d', 900, 250, 'datagram:  [ IP hdr · TCP hdr · data ]', 'p', 'rect', 460], ['f', 900, 340, 'frame:  [ Eth hdr · IP · TCP · data · trailer ]', 'a', 'rect', 540], ['bits', 900, 430, '0110100101 …', 'x', 'rect', 300]],
  edges: [['l5', 'm', '', 'gd'], ['l4', 's', '', 'bd'], ['l3', 'd', '', 'pd'], ['l2', 'f', '', 'ad'], ['l1', 'bits', '', 'xd'], ['m', 's', '+ header', 'b'], ['s', 'd', '+ header', 'p'], ['d', 'f', '+ header', 'a'], ['f', 'bits', '', 'x']] },

// ---------------- Chapter 2 ----------------
'cn-02-http': seq('An HTTP exchange over a persistent connection: one TCP handshake, then several requests and responses reuse the same connection; a conditional GET with If-None-Match returns 304 Not Modified when the cached copy is still valid.',
  ['Browser|t', 'Web server|g'], [
    ['Browser', 'Web server', 'TCP handshake (1 RTT) + TLS', 'x'],
    ['Browser', 'Web server', 'GET /index.html', 'b'],
    ['Web server', 'Browser', '200 OK  (HTML, ETag: "v7", Cache-Control: max-age=60)', 'g'],
    ['Browser', 'Web server', 'GET /app.js   (same connection)', 'b'],
    ['Web server', 'Browser', '200 OK  (JavaScript)', 'g'],
    ['#', 0, 1, 'later, cache expired: ask "has it changed?"', 'a'],
    ['Browser', 'Web server', 'GET /index.html   If-None-Match: "v7"', 'b'],
    ['Web server', 'Browser', '304 Not Modified  (no body, reuse cache)', 'gd']], { w: 1100 }),

'cn-02-dns': { w: 1350, h: 540, alt: 'DNS resolution: the host asks its local resolver; on a cache miss the resolver asks a root server, which refers it to the .com TLD server, which refers it to the authoritative server for example.com, which returns the IP address; the resolver caches the answer for its TTL.',
  nodes: [['h', 120, 250, 'Your laptop|stub resolver', 't', 'rect', 200], ['r', 470, 250, 'Local resolver|ISP or 1.1.1.1 · caches', 'b', 'rect', 280],
    ['root', 1080, 80, 'Root server|"ask .com"', 'x', 'rect', 240], ['tld', 1080, 250, '.com TLD server|"ask ns1.example.com"', 'p', 'rect', 300], ['auth', 1080, 420, 'Authoritative server|example.com → 93.184.x.x', 'g', 'rect', 320]],
  edges: [['h', 'r', '1', 'b'], ['r', 'root', '2', 'x'], ['r', 'tld', '3', 'p'], ['r', 'auth', '4', 'g']],
  texts: [[675, 520, '1 laptop asks its resolver · 2–4 resolver walks the hierarchy (each answer is cached) · 5 IP returned to the laptop', 'x', 17]] },

'cn-02-cdn': { w: 1350, h: 470, alt: 'Content distribution: DNS sends each user to a nearby CDN edge server; the edge serves cached content and fetches from the origin only on a miss. Video is split into short chunks at several bitrates, and the DASH player chooses the bitrate for each chunk.',
  nodes: [['u1', 110, 120, 'User in Dhaka', 't', 'pill'], ['u2', 110, 340, 'User in Paris', 't', 'pill'], ['dns', 450, 230, 'CDN DNS|picks nearest edge', 'p', 'rect', 240],
    ['e1', 800, 120, 'Edge: Singapore|cache', 'a', 'rect', 230], ['e2', 800, 340, 'Edge: Frankfurt|cache', 'a', 'rect', 230], ['o', 1200, 230, 'Origin|video in 2 s chunks\n× 240p … 4K', 'g', 'rect', 240]],
  edges: [['u1', 'dns', '', 'pd'], ['u2', 'dns', '', 'pd'], ['u1', 'e1', 'chunks', 'a'], ['u2', 'e2', 'chunks', 'a'], ['e1', 'o', 'miss only', 'gd'], ['e2', 'o', '', 'gd']] },

'cn-02-p2p': { w: 1300, h: 460, alt: 'Client-server versus peer-to-peer distribution of one file to N peers: with client-server, the server uploads N copies so time grows linearly with N; with P2P, every peer that has pieces uploads them to others, so upload capacity grows with N and time levels off.',
  zones: [[20, 20, 600, 420, 'Client-server', 'x'], [660, 20, 620, 420, 'Peer-to-peer (BitTorrent)', 'g']],
  nodes: [['s', 320, 100, 'Server|uploads N copies', 'x'], ['c1', 120, 300, 'Peer', 't', 'pill'], ['c2', 320, 300, 'Peer', 't', 'pill'], ['c3', 520, 300, 'Peer', 't', 'pill'],
    ['n1', 320, 400, 'time grows ∝ N', 'x', 'note'],
    ['s2', 970, 100, 'Seed', 'g'], ['q1', 770, 300, 'Peer|pieces 1,4', 't'], ['q2', 970, 300, 'Peer|pieces 2,3', 't'], ['q3', 1170, 300, 'Peer|piece 5', 't'], ['n2', 970, 400, 'every peer also uploads → capacity grows with N', 'g', 'note']],
  edges: [['s', 'c1', '', 'x'], ['s', 'c2', '', 'x'], ['s', 'c3', '', 'x'], ['s2', 'q1', '', 'g'], ['s2', 'q3', '', 'g'], ['q1', 'q2', '', 'g2'], ['q2', 'q3', '', 'g2']] },

// ---------------- Chapter 3 ----------------
'cn-03-demux': { w: 1350, h: 470, alt: 'Demultiplexing: one server IP receives segments for several sockets. UDP delivers by destination port only; TCP delivers by the four-tuple of source IP, source port, destination IP and destination port, so each client connection gets its own socket.',
  nodes: [['a', 120, 100, 'Client A|10.0.0.5 : 51000', 't', 'rect', 230], ['b', 120, 250, 'Client B|10.0.0.9 : 51000', 't', 'rect', 230], ['c', 120, 400, 'DNS query|from anywhere', 't', 'rect', 230],
    ['os', 600, 250, 'Server OS\nlooks at the headers', 'x', 'rect', 240],
    ['s1', 1080, 100, 'TCP socket for A|(10.0.0.5, 51000, srv, 443)', 'b', 'rect', 360], ['s2', 1080, 250, 'TCP socket for B|(10.0.0.9, 51000, srv, 443)', 'b', 'rect', 360], ['s3', 1080, 400, 'UDP socket :53|one socket for everyone', 'g', 'rect', 300]],
  edges: [['a', 'os', '→ :443', ''], ['b', 'os', '→ :443', ''], ['c', 'os', '→ :53', ''], ['os', 's1', '', 'b'], ['os', 's2', '', 'b'], ['os', 's3', '', 'g']] },

'cn-03-pipelining': { w: 1350, h: 470, alt: 'Stop-and-wait sends one packet per round trip, leaving the link idle; pipelining keeps a window of N packets in flight. Go-Back-N resends everything after a loss; Selective Repeat resends only the lost packet.',
  zones: [[20, 20, 420, 430, 'Stop-and-wait', 'x'], [460, 20, 420, 430, 'Go-Back-N', 'a'], [900, 20, 430, 430, 'Selective Repeat', 'g']],
  nodes: [['sw', 230, 140, 'send 1 → wait for ACK\nsend 2 → wait …', 'x', 'rect', 300], ['sw2', 230, 330, '1 packet per RTT\n1,500 B / 30 ms ≈ 0.4 Mb/s\non a 1 Gb/s link!', 'x', 'note', 300],
    ['gb', 670, 140, 'window: 1 2 3 4 5 in flight\n3 lost → receiver drops 4, 5', 'a', 'rect', 340], ['gb2', 670, 330, 'timeout → resend 3, 4, 5\nsimple receiver, wasted resends', 'a', 'note', 320],
    ['sr', 1115, 140, 'window: 1 2 3 4 5 in flight\n3 lost → receiver buffers 4, 5', 'g', 'rect', 340], ['sr2', 1115, 330, 'resend only 3\nper-packet ACKs + buffering', 'g', 'note', 300]],
  edges: [['sw', 'sw2', '', 'xd'], ['gb', 'gb2', '', 'ad'], ['sr', 'sr2', '', 'gd']] },

'cn-03-tcp-handshake': seq('TCP connection life: SYN, SYN-ACK and ACK open the connection and agree on starting sequence numbers; data segments carry sequence numbers and cumulative ACKs; FIN and ACK in each direction close it.',
  ['Client|t', 'Server|g'], [
    ['Client', 'Server', 'SYN  seq = 1000', 'b'],
    ['Server', 'Client', 'SYN-ACK  seq = 5000, ack = 1001', 'g'],
    ['Client', 'Server', 'ACK  ack = 5001     (connection open: 1 RTT)', 'b'],
    ['Client', 'Server', 'data: bytes 1001–2460  (seq = 1001)', 'b'],
    ['Server', 'Client', 'ACK  ack = 2461   "send me byte 2461 next"', 'gd'],
    ['#', 0, 1, 'no ACK before the timeout (≈ RTT + 4 × deviation)? resend. 3 duplicate ACKs? resend at once', 'a'],
    ['Client', 'Server', 'FIN', 'x'],
    ['Server', 'Client', 'ACK, then FIN', 'xd'],
    ['Client', 'Server', 'ACK   (client waits 2 × max segment life, then closes)', 'x']], { w: 1150 }),

'cn-03-congestion': { w: 1350, h: 470, alt: 'TCP congestion window over time: slow start doubles the window every round trip until a threshold, then congestion avoidance adds one segment per round trip; a loss halves the window (multiplicative decrease), giving the sawtooth shape of AIMD.',
  nodes: [['ss', 230, 360, 'Slow start|window doubles each RTT\n1 → 2 → 4 → 8 …', 'b', 'rect', 300], ['ca', 640, 200, 'Congestion avoidance|+1 segment per RTT\n(additive increase)', 'g', 'rect', 300],
    ['loss', 1040, 90, 'Loss detected|3 dup ACKs → window ÷ 2\ntimeout → back to 1', 'r', 'rect', 320], ['saw', 1040, 330, 'Sawtooth: probe up slowly,\nback off fast → fair sharing', 'p', 'note', 330]],
  edges: [['ss', 'ca', 'reach threshold', 'b'], ['ca', 'loss', 'probing for bandwidth', 'g'], ['loss', 'saw', '', 'pd']],
  texts: [[675, 450, 'Throughput ≈ window ÷ RTT. Modern variants: CUBIC (Linux default) and BBR, which models bandwidth and RTT instead of waiting for loss.', 'x', 17]] },

// ---------------- Chapter 4 ----------------
'cn-04-router': { w: 1400, h: 470, alt: 'Inside a router: packets arrive at input ports, where a longest-prefix-match lookup in the forwarding table picks the output port; the switching fabric moves them across; output ports queue and schedule them. The control plane (routing processor) builds the forwarding table.',
  nodes: [['rp', 700, 70, 'Routing processor (control plane)|runs OSPF / BGP, builds the forwarding table', 'p', 'rect', 520],
    ['i1', 200, 220, 'Input port 1|lookup: longest prefix match', 'b', 'rect', 290], ['i2', 200, 380, 'Input port 2|lookup + small queue', 'b', 'rect', 290],
    ['sf', 700, 300, 'Switching fabric|memory · bus · crossbar', 'x', 'rect', 280], ['o1', 1200, 220, 'Output port 1|queue ▮▮▮ + scheduler', 'a', 'rect', 290], ['o2', 1200, 380, 'Output port 2|queue ▮ + scheduler', 'a', 'rect', 290]],
  edges: [['rp', 'i1', 'table', 'pd'], ['rp', 'i2', '', 'pd'], ['i1', 'sf', '', 'b'], ['i2', 'sf', '', 'b'], ['sf', 'o1', '', 'a'], ['sf', 'o2', '', 'a']] },

'cn-04-lpm': { w: 1300, h: 430, alt: 'Longest prefix match: the destination 11.1.2.5 matches two forwarding-table entries, 11.1.0.0/16 and 11.1.2.0/24; the router chooses the more specific /24 and sends the packet out interface 2.',
  nodes: [['pkt', 160, 200, 'Packet to|11.1.2.5', 't', 'rect', 200],
    ['t1', 650, 80, '11.0.0.0/8      → interface 0   ✓ match', 'x', 'rect', 520], ['t2', 650, 170, '11.1.0.0/16    → interface 1   ✓ match', 'a', 'rect', 520], ['t3', 650, 260, '11.1.2.0/24    → interface 2   ✓ longest', 'g', 'rect', 520], ['t4', 650, 350, '0.0.0.0/0        → interface 3   (default)', 'x', 'rect', 520],
    ['out', 1150, 260, 'out interface 2', 'g', 'pill']],
  edges: [['pkt', 't3', 'compare prefixes', 'b'], ['t3', 'out', '', 'g']] },

'cn-04-nat': { w: 1350, h: 450, alt: 'Network address translation: devices on the home network use private addresses; the NAT router rewrites each outgoing packet source to its single public IP and a new port, records the mapping in a table, and reverses it for replies.',
  zones: [[20, 20, 420, 410, 'Home network 192.168.1.0/24', 't']],
  nodes: [['l', 230, 110, 'Laptop|192.168.1.10 : 3345', 't', 'rect', 260], ['p', 230, 300, 'Phone|192.168.1.11 : 3345', 't', 'rect', 260],
    ['nat', 700, 205, 'NAT router|public IP 203.0.113.7', 'a', 'rect', 280], ['tab', 700, 380, '5001 ↔ 192.168.1.10:3345\n5002 ↔ 192.168.1.11:3345', 'a', 'note', 320], ['srv', 1160, 205, 'Web server|93.184.x.x : 443', 'g', 'rect', 250]],
  edges: [['l', 'nat', '', 't'], ['p', 'nat', '', 't'], ['nat', 'srv', 'src 203.0.113.7 : 5001', 'g'], ['nat', 'tab', '', 'ad']] },

'cn-04-dhcp': seq('DHCP: a device joining a network broadcasts Discover, a DHCP server Offers an address, the device Requests it, and the server sends an Ack with the address, subnet mask, default gateway, DNS server and lease time.',
  ['New device|t', 'DHCP server|p'], [
    ['New device', 'DHCP server', 'DISCOVER  (broadcast: "any DHCP server?")', 'b'],
    ['DHCP server', 'New device', 'OFFER  192.168.1.23, lease 24 h', 'p'],
    ['New device', 'DHCP server', 'REQUEST  "I\'ll take 192.168.1.23"', 'b'],
    ['DHCP server', 'New device', 'ACK  + mask /24, gateway 192.168.1.1, DNS 1.1.1.1', 'g']], { w: 1000 }),

'cn-04-sdn-match': { w: 1300, h: 430, alt: 'Generalized forwarding: a flow table matches on fields from several layers such as ports, MAC and IP addresses and TCP ports, and applies an action such as forward, drop, modify or send to the controller. One abstraction covers routers, switches, firewalls and NAT.',
  nodes: [['pkt', 150, 210, 'Packet|header fields', 't', 'rect', 180],
    ['m1', 640, 80, 'dst IP 10.2.0.0/16          →  forward port 3', 'b', 'rect', 560], ['m2', 640, 170, 'TCP dst port 22               →  drop (firewall)', 'r', 'rect', 560], ['m3', 640, 260, 'src IP 10.1.0.5, port 80  →  rewrite src (NAT)', 'a', 'rect', 560], ['m4', 640, 350, 'no match                          →  send to controller', 'p', 'rect', 560],
    ['c', 1150, 350, 'SDN controller', 'p']],
  edges: [['pkt', 'm1', 'match + action', 'b'], ['m4', 'c', '', 'pd']] },

// ---------------- Chapter 5 ----------------
'cn-05-ls-dv': { w: 1350, h: 470, alt: 'Two families of routing algorithms. Link-state: every router floods its links to all others, so each has the full map and runs Dijkstra. Distance-vector: each router only tells its neighbours its current distances, and they update with Bellman-Ford until values settle.',
  zones: [[20, 20, 640, 430, 'Link-state (OSPF, IS-IS)', 'b'], [690, 20, 640, 430, 'Distance-vector (RIP, BGP-like)', 'g']],
  nodes: [['u', 140, 140, 'u', 'b', 'circle'], ['v', 340, 90, 'v', 'b', 'circle'], ['w', 540, 140, 'w', 'b', 'circle'], ['x', 340, 230, 'x', 'b', 'circle'],
    ['n1', 340, 360, 'everyone floods its links to everyone\n→ each router has the whole map\n→ runs Dijkstra locally', 'b', 'note', 420],
    ['a', 800, 160, 'A|"I reach D in 3"', 'g', 'rect', 190], ['b', 1060, 160, 'B|"I reach D in 1"', 'g', 'rect', 190], ['d', 1265, 160, 'D', 'g', 'circle'],
    ['n2', 1010, 360, 'tell only neighbours your distances\nmin over neighbours (cost + their distance)\nrepeat until nothing changes', 'g', 'note', 480]],
  edges: [['u', 'v', '2', 'bn'], ['v', 'w', '3', 'bn'], ['u', 'x', '1', 'bn'], ['x', 'w', '2', 'bn'], ['v', 'x', '2', 'bn'], ['b', 'a', 'my vector', 'g'], ['d', 'b', '', 'g']] },

'cn-05-bgp': { w: 1400, h: 470, alt: 'Routing between autonomous systems: inside each AS an intra-domain protocol such as OSPF finds paths; between ASes, BGP sessions advertise reachable prefixes with their AS path, and each AS picks routes by its own policy, such as preferring customers over peers over providers.',
  zones: [[20, 20, 400, 400, 'AS 100 (your ISP)', 'b'], [500, 20, 400, 400, 'AS 200 (transit)', 'p'], [980, 20, 400, 400, 'AS 300 (content)', 'g']],
  nodes: [['a1', 120, 130, 'r', 'b', 'circle'], ['a2', 320, 130, 'border', 'b'], ['a3', 220, 300, 'r', 'b', 'circle'], ['b1', 600, 130, 'border', 'p'], ['b2', 800, 130, 'border', 'p'], ['b3', 700, 300, 'r', 'p', 'circle'],
    ['c1', 1080, 130, 'border', 'g'], ['c2', 1280, 300, 'servers|8.8.8.0/24', 'g']],
  edges: [['a1', 'a2', 'OSPF', 'bn'], ['a1', 'a3', '', 'bn'], ['a2', 'b1', 'eBGP', 'pd2'], ['b1', 'b3', 'iBGP', 'pn'], ['b2', 'b3', '', 'pn'], ['b2', 'c1', 'eBGP', 'pd2'], ['c1', 'c2', '', 'gn']],
  texts: [[700, 455, 'Advertisement flows right → left: "8.8.8.0/24, AS path 300" → "8.8.8.0/24, AS path 200 300". Each AS chooses by policy, then shortest AS path.', 'x', 17]] },

'cn-05-sdn': { w: 1300, h: 450, alt: 'Software-defined networking control plane: network applications such as routing, access control and load balancing run on a logically centralised controller, which computes flow tables and installs them on simple switches through a southbound API like OpenFlow.',
  nodes: [['a1', 300, 70, 'Routing app', 'p'], ['a2', 650, 70, 'Access control app', 'p'], ['a3', 1000, 70, 'Load balancer app', 'p'],
    ['c', 650, 210, 'SDN controller (logically centralised, replicated)|network view · topology · flow state', 'b', 'rect', 640],
    ['s1', 300, 380, 'switch|flow table', 'x'], ['s2', 650, 380, 'switch|flow table', 'x'], ['s3', 1000, 380, 'switch|flow table', 'x']],
  edges: [['a1', 'c', 'northbound API', 'pd'], ['a2', 'c', '', 'pd'], ['a3', 'c', '', 'pd'], ['c', 's1', 'OpenFlow', 'b'], ['c', 's2', '', 'b'], ['c', 's3', '', 'b'], ['s1', 's2', '', 'xn'], ['s2', 's3', '', 'xn']] },

'cn-05-traceroute': seq('Traceroute uses ICMP: it sends probes with TTL 1, 2, 3 and so on; each router that decrements TTL to zero drops the probe and replies with ICMP Time Exceeded, revealing itself and the round-trip time; the destination finally replies Port Unreachable.',
  ['Your host|t', 'Router 1|x', 'Router 2|x', 'Destination|g'], [
    ['Your host', 'Router 1', 'probe, TTL = 1', 'b'],
    ['Router 1', 'Your host', 'ICMP Time Exceeded  (router 1, 3 ms)', 'r'],
    ['Your host', 'Router 2', 'probe, TTL = 2', 'b'],
    ['Router 2', 'Your host', 'ICMP Time Exceeded  (router 2, 9 ms)', 'r'],
    ['Your host', 'Destination', 'probe, TTL = 3', 'b'],
    ['Destination', 'Your host', 'ICMP Port Unreachable  → done (31 ms)', 'g']], { w: 1250 }),

// ---------------- Chapter 6 ----------------
'cn-06-arp': seq('ARP inside one LAN: the host knows the gateway IP but needs its MAC address; it broadcasts an ARP request to every device on the LAN, the gateway replies with its MAC address, and the host caches the mapping and sends the Ethernet frame.',
  ['Laptop 192.168.1.10|t', 'Switch|x', 'Gateway 192.168.1.1|p'], [
    ['#', 0, 0, 'Need MAC for 192.168.1.1', 'a'],
    ['Laptop 192.168.1.10', 'Switch', 'ARP request to ff:ff:ff:ff:ff:ff  "who has .1?"', 'b'],
    ['Switch', 'Gateway 192.168.1.1', 'flooded to every port', 'xd'],
    ['Gateway 192.168.1.1', 'Laptop 192.168.1.10', 'ARP reply  ".1 is at 3c:22:fb:…"', 'p'],
    ['Laptop 192.168.1.10', 'Gateway 192.168.1.1', 'Ethernet frame to 3c:22:fb:…  carrying the IP packet', 'g']], { w: 1250 }),

'cn-06-switch': { w: 1300, h: 450, alt: 'A self-learning Ethernet switch: when a frame arrives it records the source MAC address and port in its table; it forwards to the known port for the destination, or floods to all ports if the destination is unknown. Entries expire after a while.',
  nodes: [['a', 150, 100, 'Host A|MAC aa', 't'], ['b', 150, 350, 'Host B|MAC bb', 't'], ['sw', 600, 225, 'Switch', 'x', 'rect', 200], ['c', 1050, 100, 'Host C|MAC cc', 't'], ['d', 1050, 350, 'Host D|MAC dd', 't'],
    ['tab', 600, 400, 'table: aa → port 1 · cc → port 3\n(learned from source addresses, expire after ~5 min)', 'x', 'note', 600]],
  edges: [['a', 'sw', '1  frame aa → cc', 'b'], ['sw', 'c', '3  known: send only here', 'g'], ['b', 'sw', '2', 'n'], ['sw', 'd', '4', 'n']],
  texts: [[600, 60, 'Unknown destination? Flood out of every port except the one it came in on.', 'x', 17]] },

'cn-06-datacenter': { w: 1400, h: 530, alt: 'A leaf-spine data centre network: every leaf (top-of-rack) switch connects to every spine switch, so any two servers are at most leaf-spine-leaf apart, with many equal-cost paths that ECMP spreads traffic across. A border layer connects to the Internet.',
  nodes: [['bd', 700, 60, 'Border routers → Internet', 'p', 'rect', 360],
    ['s1', 350, 180, 'Spine 1', 'b'], ['s2', 580, 180, 'Spine 2', 'b'], ['s3', 820, 180, 'Spine 3', 'b'], ['s4', 1050, 180, 'Spine 4', 'b'],
    ['l1', 250, 330, 'Leaf / ToR', 'a'], ['l2', 550, 330, 'Leaf / ToR', 'a'], ['l3', 850, 330, 'Leaf / ToR', 'a'], ['l4', 1150, 330, 'Leaf / ToR', 'a'],
    ['r1', 250, 430, 'rack of servers', 'x', 'note'], ['r4', 1150, 430, 'rack of servers', 'x', 'note']],
  edges: [['bd', 's1', '', 'pn'], ['bd', 's4', '', 'pn'], ['s1', 'l1', '', 'bn'], ['s1', 'l2', '', 'bn'], ['s1', 'l3', '', 'bn'], ['s1', 'l4', '', 'bn'], ['s2', 'l1', '', 'bn'], ['s2', 'l2', '', 'bn'], ['s2', 'l3', '', 'bn'], ['s2', 'l4', '', 'bn'],
    ['s3', 'l1', '', 'bn'], ['s3', 'l2', '', 'bn'], ['s3', 'l3', '', 'bn'], ['s3', 'l4', '', 'bn'], ['s4', 'l1', '', 'bn'], ['s4', 'l2', '', 'bn'], ['s4', 'l3', '', 'bn'], ['s4', 'l4', '', 'bn']],
  texts: [[700, 510, 'Any server → any server: leaf → spine → leaf. 4 equal-cost paths, spread by ECMP hashing.', 'x', 17]] },

'cn-06-day': { w: 1450, h: 520, alt: 'A day in the life of a web request: the laptop joins the network with DHCP, uses ARP to find the gateway MAC address, asks DNS for the server IP, opens a TCP connection and TLS session routed across ISPs by BGP and OSPF, then sends the HTTP request and gets the page.',
  nodes: [['s1', 160, 90, '1 DHCP|get IP, gateway, DNS', 'a', 'rect', 250], ['s2', 480, 90, '2 ARP|gateway\'s MAC', 'a', 'rect', 220], ['s3', 800, 90, '3 DNS (UDP)|www.example.com → IP', 'p', 'rect', 290], ['s4', 1180, 90, '4 Routing|frames hop LAN → ISP → …', 'p', 'rect', 320],
    ['s5', 1180, 300, '5 TCP handshake|SYN, SYN-ACK, ACK', 'b', 'rect', 290], ['s6', 800, 300, '6 TLS|keys + certificate', 'b', 'rect', 250], ['s7', 480, 300, '7 HTTP GET|over TCP over IP', 'g', 'rect', 240], ['s8', 160, 300, '8 Page renders|+ more requests', 'g', 'rect', 250]],
  edges: [['s1', 's2', ''], ['s2', 's3', ''], ['s3', 's4', ''], ['s4', 's5', ''], ['s5', 's6', ''], ['s6', 's7', ''], ['s7', 's8', '']],
  texts: [[725, 450, 'Every layer from this book in one click: link (Ethernet/Wi-Fi), network (IP, OSPF, BGP),', 'x', 17], [725, 480, 'transport (UDP for DNS, TCP for the page) and application (DHCP, DNS, TLS, HTTP).', 'x', 17]] },

// ---------------- Chapter 7 ----------------
'cn-07-hidden': { w: 1300, h: 430, alt: 'The hidden terminal problem in Wi-Fi: stations A and C can both hear the access point but not each other, so carrier sensing fails and their frames collide at the access point. RTS/CTS lets the access point reserve the channel; CSMA/CA uses random backoff and link-layer ACKs.',
  nodes: [['a', 180, 220, 'Station A', 't', 'pill'], ['ap', 650, 220, 'Access point', 'p', 'rect', 220], ['c', 1120, 220, 'Station C', 't', 'pill'],
    ['wall', 650, 80, 'A and C can\'t hear each other (distance, walls)', 'r', 'note', 520], ['fix', 650, 370, 'Fix: RTS → CTS ("C, stay quiet for 2 ms") · random backoff · ACK every frame', 'g', 'note', 900]],
  edges: [['a', 'ap', 'frame', 'b'], ['c', 'ap', 'frame', 'b'], ['ap', 'fix', '', 'gd']] },

'cn-07-cellular': { w: 1400, h: 470, alt: '4G and 5G cellular architecture: the phone connects by radio to a base station; the base stations connect to the mobile core, where the mobility management entity handles signalling and handover, and the serving and packet gateways carry user data out to the Internet. The home subscriber server holds the subscriber records.',
  nodes: [['ph', 120, 230, 'Phone|SIM = identity', 't', 'rect', 190], ['bs1', 420, 130, 'Base station|(eNodeB / gNB)', 'a', 'rect', 240], ['bs2', 420, 330, 'Base station', 'a', 'rect', 220],
    ['mme', 780, 90, 'MME / AMF|signalling, handover', 'p', 'rect', 260], ['hss', 1150, 90, 'HSS / UDM|subscriber records', 'p', 'rect', 240],
    ['sgw', 780, 330, 'Serving gateway|anchor while moving', 'b', 'rect', 260], ['pgw', 1080, 330, 'Packet gateway', 'b', 'rect', 220], ['net', 1310, 230, 'Internet', 'g', 'pill']],
  edges: [['ph', 'bs1', 'radio', 't'], ['ph', 'bs2', 'handover', 'td'], ['bs1', 'mme', 'control', 'pd'], ['mme', 'hss', '', 'pd'], ['bs1', 'sgw', 'data', 'b'], ['bs2', 'sgw', '', 'b'], ['sgw', 'pgw', 'tunnel', 'b'], ['pgw', 'net', '', 'g']] },

'cn-07-mobility': { w: 1350, h: 450, alt: 'Indirect routing for a mobile device: a correspondent sends to the device\'s permanent home address; the home network forwards (tunnels) packets to the visited network, which delivers them to the device; the device can reply directly. Cellular networks keep the device\'s IP anchored at the gateway in the same way.',
  nodes: [['cor', 150, 400, 'Correspondent', 't', 'rect', 200], ['home', 560, 90, 'Home network|knows where you are now', 'b', 'rect', 300], ['vis', 1080, 200, 'Visited network|care-of address', 'a', 'rect', 260], ['mob', 1080, 400, 'Mobile device|keeps its address', 't', 'rect', 240]],
  edges: [['cor', 'home', '1 to permanent address', 'b'], ['home', 'vis', '2 tunnel', 'bd'], ['vis', 'mob', '3', 'a'], ['mob', 'cor', '4 reply (direct)', 'g']] },

// ---------------- Chapter 8 ----------------
'cn-08-crypto': { w: 1350, h: 470, alt: 'Symmetric versus public-key cryptography: symmetric encryption uses one shared secret key and is fast, but the key must be shared securely; public-key cryptography uses a public key to encrypt or verify and a private key to decrypt or sign, which solves key distribution but is slow, so TLS uses it to agree on a symmetric session key.',
  zones: [[20, 20, 630, 430, 'Symmetric (AES, ChaCha20)', 'b'], [680, 20, 650, 430, 'Public-key (RSA, elliptic curves)', 'p']],
  nodes: [['a1', 130, 140, 'Alice', 't', 'pill'], ['k1', 335, 140, 'same key K', 'b'], ['b1', 540, 140, 'Bob', 't', 'pill'], ['n1', 335, 330, 'fast: GB/s\nproblem: how do we share K?', 'b', 'note', 360],
    ['a2', 760, 140, 'Alice', 't', 'pill'], ['k2', 990, 140, 'encrypt with\nBob\'s PUBLIC key', 'p', 'rect', 220], ['b2', 1215, 140, 'Bob decrypts|with PRIVATE key', 't', 'rect', 200], ['n2', 1005, 330, 'no shared secret needed\nslow → used to agree on a\nsymmetric session key (TLS)', 'p', 'note', 360]],
  edges: [['a1', 'k1', 'encrypt', 'b'], ['k1', 'b1', 'decrypt', 'b'], ['a2', 'k2', '', 'p'], ['k2', 'b2', '', 'p']] },

'cn-08-signature': { w: 1350, h: 470, alt: 'Digital signatures and certificates: the sender hashes a message and encrypts the hash with its private key to sign it; anyone verifies with the sender\'s public key. A certificate is a CA\'s signature binding a name to a public key, so the receiver can trust that the public key really belongs to the sender.',
  nodes: [['m', 140, 130, 'Message', 't', 'rect', 170], ['h', 420, 130, 'hash (SHA-256)|fixed-size fingerprint', 'x', 'rect', 260], ['sig', 760, 130, 'sign with Bob\'s\nPRIVATE key', 'p', 'rect', 230], ['out', 1120, 130, 'message + signature', 'g', 'rect', 260],
    ['ver', 1120, 300, 'Receiver: hash message,\ncheck signature with\nBob\'s PUBLIC key', 'g', 'rect', 280], ['ca', 640, 340, 'Certificate|CA signs "this public key belongs to bob.com"', 'a', 'rect', 460]],
  edges: [['m', 'h', '', 'x'], ['h', 'sig', '', 'p'], ['sig', 'out', '', 'g'], ['out', 'ver', '', 'g'], ['ca', 'ver', 'trust the key', 'ad']] },

'cn-08-firewall': { w: 1400, h: 470, alt: 'Network defences: a firewall at the edge filters packets by rules on addresses, ports and connection state; an intrusion detection system inspects traffic contents for attack signatures; a VPN or IPsec tunnel encrypts traffic between sites across the public Internet.',
  nodes: [['net', 120, 230, 'Internet', 'x', 'pill'], ['fw', 420, 230, 'Firewall|stateless rules + stateful\n(allow replies to our connections)', 'r', 'rect', 380], ['ids', 760, 100, 'IDS / IPS|inspects contents for\nattack signatures', 'a', 'rect', 260],
    ['dmz', 760, 360, 'DMZ|public web servers', 'b', 'rect', 220], ['in', 1100, 230, 'Internal network', 'g', 'rect', 230], ['br', 1300, 420, 'Branch office', 'g', 'rect', 190]],
  edges: [['net', 'fw', '', 'x'], ['fw', 'ids', 'copy', 'ad'], ['fw', 'dmz', 'port 443 only', 'b'], ['fw', 'in', 'established only', 'g'], ['in', 'br', 'VPN / IPsec tunnel', 'gdC']] },
};
