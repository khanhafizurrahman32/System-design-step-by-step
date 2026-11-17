// Diagrams for the data-structure deep dives: B-trees / B+ trees and Merkle trees.
// Same spec format as pilot.js.
module.exports = {
// ---------------- B-trees and B+ trees ----------------
'concept-btree-lookup': { w: 1350, h: 460, alt: 'Looking up key 251 in a B-tree index. The root page holds the boundaries 100, 200 and 300, so the search follows the pointer for keys 200 to 300. That child page splits the range further into 200 to 250, 250 to 270 and 270 to 300, so the search follows the pointer for 250 to 270. The leaf page holds keys 250 to 270 in order, including 251 with its row or a pointer to it. Three page reads find any key among billions.',
  nodes: [['root', 675, 70, 'Root page|[ 100 · 200 · 300 ]', 'b', 'rect', 360],
    ['c1', 200, 210, 'keys < 100', 'x', 'rect', 200], ['c2', 470, 210, '100 – 200', 'x', 'rect', 200], ['c3', 820, 210, 'Page 200 – 300|[ 250 · 270 ]', 'b', 'rect', 290], ['c4', 1170, 210, '≥ 300', 'x', 'rect', 170],
    ['l1', 560, 360, '200 – 250', 'x', 'rect', 190], ['l2', 820, 360, 'Leaf 250 – 270|250, 251 ✓, 255, 262, 268', 'g', 'rect', 300], ['l3', 1100, 360, '270 – 300', 'x', 'rect', 190]],
  edges: [['root', 'c1', '', 'xn'], ['root', 'c2', '', 'xn'], ['root', 'c3', '1 · 251 is in 200–300', 'b'], ['root', 'c4', '', 'xn'],
    ['c3', 'l1', '', 'xn'], ['c3', 'l2', '2 · 250–270', 'b'], ['c3', 'l3', '', 'xn']],
  texts: [[200, 380, '3 page reads, whatever the size', 'g', 18], [200, 410, '(top levels usually cached in RAM)', 'x', 16]] },

'concept-btree-vs-bplus': { w: 1350, h: 480, alt: 'B-tree versus B+ tree. In the original B-tree, every node, internal or leaf, stores keys together with their values or row pointers, so a key is stored only once wherever it lands. In a B+ tree, internal nodes hold only keys as signposts, so more of them fit per page and the tree is shallower; every value lives in the leaves, and the leaves are linked to their neighbours, so a range scan walks along the leaves without going back up the tree. Most databases use B+ trees and call them B-trees.',
  zones: [[20, 20, 620, 440, 'B-tree (original)', 'p'], [680, 20, 650, 440, 'B+ tree (what databases use)', 'g']],
  nodes: [['br', 330, 100, '[ 40 · 80 ]|+ their rows', 'p', 'rect', 300], ['b1', 130, 260, '[ 10 · 25 ]|+ their rows', 'p', 'rect', 170], ['b2', 330, 260, '[ 55 · 70 ]|+ their rows', 'p', 'rect', 170], ['b3', 530, 260, '[ 90 ]|+ its row', 'p', 'rect', 150],
    ['bn', 330, 390, 'values in every node\nfewer keys fit per page', 'p', 'note', 330],
    ['pr', 1005, 100, '[ 40 · 80 ]|keys only', 'g', 'rect', 300], ['p1', 800, 260, '10, 25', 'b', 'rect', 150], ['p2', 1005, 260, '40, 55, 70', 'b', 'rect', 170], ['p3', 1210, 260, '80, 90', 'b', 'rect', 150],
    ['pn', 1005, 390, 'all values in the leaves\nleaves linked → fast range scans', 'g', 'note', 360]],
  edges: [['br', 'b1', '', 'pn'], ['br', 'b2', '', 'pn'], ['br', 'b3', '', 'pn'],
    ['pr', 'p1', '', 'gn'], ['pr', 'p2', '', 'gn'], ['pr', 'p3', '', 'gn'], ['p1', 'p2', '', 'b2'], ['p2', 'p3', '', 'b2']] },

'concept-btree-split': { w: 1350, h: 460, alt: 'A page split when inserting into a full B-tree leaf. Before: the leaf holds 250, 255, 262 and 268 and is full. Inserting 259 does not fit, so the database splits the leaf into two half-full pages, 250 255 and 259 262 268, and adds a new separator key, 259, to the parent page with a pointer to the new page. If the parent is also full, it splits too, and a split that reaches the root makes the tree one level taller. Every page written is logged in the write-ahead log first so a crash halfway through cannot leave the tree corrupted.',
  zones: [[20, 20, 520, 420, 'Before: leaf is full', 'x'], [580, 20, 750, 420, 'After inserting 259', 'g']],
  nodes: [['pa', 280, 100, 'Parent|[ … 250 · 270 … ]', 'b', 'rect', 260], ['lf', 280, 250, 'Leaf (full)|250, 255, 262, 268', 'r', 'rect', 280], ['ins', 280, 370, 'insert 259 → no room', 'r', 'note', 280],
    ['pb', 955, 100, 'Parent|[ … 250 · 259 · 270 … ]', 'b', 'rect', 340], ['n1', 790, 250, 'Leaf A|250, 255', 'g', 'rect', 210], ['n2', 1120, 250, 'Leaf B (new)|259, 262, 268', 'g', 'rect', 250],
    ['note', 955, 370, 'parent full too? it splits; a root split adds a level', 'a', 'note', 520]],
  edges: [['pa', 'lf', '', 'b'], ['pb', 'n1', '', 'b'], ['pb', 'n2', 'new pointer', 'g'], ['n1', 'n2', '', 'b2']] },

'concept-btree-range': { w: 1350, h: 420, alt: 'A range scan on a B+ tree: find orders with ids between 255 and 420. The database descends from the root once to the leaf holding 255, then reads forward along the linked leaves, 255 to 270, 270 to 300, 300 to 420, without going back up the tree, and stops at the first key above 420. Because keys are stored in sorted order, ORDER BY on the index key also comes for free.',
  nodes: [['root', 400, 70, 'Root|[ 100 · 200 · 300 ]', 'b', 'rect', 320], ['mid', 400, 190, 'Page 200 – 300', 'b', 'rect', 240],
    ['a', 260, 330, 'Leaf|255 ✓ 262 ✓ 268 ✓', 'g', 'rect', 240], ['b', 560, 330, 'Leaf|275 ✓ 288 ✓ 296 ✓', 'g', 'rect', 240], ['c', 860, 330, 'Leaf|310 ✓ … 420 ✓', 'g', 'rect', 220], ['d', 1140, 330, 'Leaf|431 ✗ stop', 'x', 'rect', 200],
    ['q', 1050, 120, 'WHERE id BETWEEN 255 AND 420', 't', 'note', 380]],
  edges: [['root', 'mid', 'descend once', 'b'], ['mid', 'a', '', 'b'], ['a', 'b', 'next leaf', 'g'], ['b', 'c', '', 'g'], ['c', 'd', '', 'xd']] },

// ---------------- Merkle trees ----------------
'concept-merkle-build': { w: 1350, h: 470, alt: 'Building a Merkle tree. The data is split into blocks A, B, C and D. Each block is hashed: H(A), H(B), H(C), H(D). Pairs of hashes are concatenated and hashed again: H(AB) from H(A) and H(B), H(CD) from H(C) and H(D). Finally H(AB) and H(CD) are hashed into the root hash. Changing any single byte in any block changes its leaf hash, every hash above it, and the root.',
  nodes: [['root', 675, 70, 'Root hash|H( H(AB) + H(CD) )', 'p', 'rect', 320],
    ['ab', 375, 180, 'H(AB)|H( H(A) + H(B) )', 'b', 'rect', 260], ['cd', 975, 180, 'H(CD)|H( H(C) + H(D) )', 'b', 'rect', 260],
    ['ha', 225, 290, 'H(A)', 'g', 'rect', 140], ['hb', 525, 290, 'H(B)', 'g', 'rect', 140], ['hc', 825, 290, 'H(C)', 'g', 'rect', 140], ['hd', 1125, 290, 'H(D)', 'g', 'rect', 140],
    ['a', 225, 400, 'block A|keys 0–999', 'x', 'db', 170], ['b', 525, 400, 'block B', 'x', 'db', 150], ['c', 825, 400, 'block C', 'x', 'db', 150], ['d', 1125, 400, 'block D', 'x', 'db', 150]],
  edges: [['a', 'ha', 'hash', 'g'], ['b', 'hb', '', 'g'], ['c', 'hc', '', 'g'], ['d', 'hd', '', 'g'], ['ha', 'ab', '', 'b'], ['hb', 'ab', '', 'b'], ['hc', 'cd', '', 'b'], ['hd', 'cd', '', 'b'], ['ab', 'root', '', 'p'], ['cd', 'root', '', 'p']] },

'concept-merkle-compare': { w: 1350, h: 500, alt: 'Two replicas find their differences with Merkle trees. Each replica builds a tree over the same key ranges. Step 1: they exchange root hashes; they differ, so something is out of sync. Step 2: they compare the two children; the left halves match, so that whole half, half the data, is skipped. Step 3: on the right side they compare the next level and find that only the block for keys in the 2000s differs. Step 4: only that block is sent and repaired. Instead of comparing every key, the replicas exchanged a handful of hashes.',
  zones: [[20, 20, 510, 460, 'Replica 1', 'b'], [820, 20, 510, 460, 'Replica 2', 'p']],
  nodes: [['r1', 275, 80, 'root 7f3a', 'r', 'rect', 170], ['l1', 140, 200, 'left 91c2', 'g', 'rect', 160], ['g1', 400, 200, 'right 2b7e', 'r', 'rect', 160],
    ['x1', 320, 320, '2000s|e41d', 'r', 'rect', 140], ['y1', 460, 320, '3000s|08aa', 'g', 'rect', 120],
    ['r2', 1075, 80, 'root c519', 'r', 'rect', 170], ['l2', 940, 200, 'left 91c2', 'g', 'rect', 160], ['g2', 1200, 200, 'right 6d04', 'r', 'rect', 160],
    ['x2', 1120, 320, '2000s|9f60', 'r', 'rect', 140], ['y2', 1260, 320, '3000s|08aa', 'g', 'rect', 120],
    ['s1', 675, 80, '1 · roots differ', 'a', 'pill', 230], ['s2', 675, 200, '2 · left equal: skip half', 'g', 'pill', 250], ['s3', 675, 320, '3 · only the 2000s differ', 'a', 'pill', 250], ['s4', 675, 430, '4 · sync just that range', 'g', 'pill', 250]],
  edges: [['r1', 'l1', '', 'xn'], ['r1', 'g1', '', 'xn'], ['g1', 'x1', '', 'xn'], ['g1', 'y1', '', 'xn'], ['r2', 'l2', '', 'xn'], ['r2', 'g2', '', 'xn'], ['g2', 'x2', '', 'xn'], ['g2', 'y2', '', 'xn'],
    ['x1', 's4', '', 'ad'], ['x2', 's4', '', 'ad']] },

'concept-merkle-proof': { w: 1350, h: 470, alt: 'A Merkle inclusion proof. A client trusts only the root hash, for example from a signed log head. To prove that block C is in the dataset, the server sends block C plus two sibling hashes: H(D) and H(AB). The client hashes C to get H(C), combines it with H(D) to get H(CD), combines H(AB) with H(CD) to get a root, and checks that it equals the trusted root. For a million blocks the proof is only about 20 hashes, because the tree is 20 levels deep.',
  nodes: [['root', 675, 70, 'Root hash|trusted (signed)', 'p', 'rect', 280],
    ['ab', 375, 190, 'H(AB)|sent in proof', 'a', 'rect', 230], ['cd', 975, 190, 'H(CD)|computed', 'g', 'rect', 230],
    ['ha', 225, 310, 'H(A)', 'x', 'rect', 130], ['hb', 525, 310, 'H(B)', 'x', 'rect', 130], ['hc', 825, 310, 'H(C)|computed', 'g', 'rect', 170], ['hd', 1125, 310, 'H(D)|sent in proof', 'a', 'rect', 200],
    ['c', 825, 420, 'block C|the record to prove', 't', 'db', 230], ['n', 300, 420, 'proof size = tree depth: ~20 hashes for 1M blocks', 'g', 'note', 500]],
  edges: [['c', 'hc', 'hash', 'g'], ['hc', 'cd', '', 'g'], ['hd', 'cd', '', 'a'], ['cd', 'root', '', 'g'], ['ab', 'root', '', 'a'], ['ha', 'ab', '', 'xdn'], ['hb', 'ab', '', 'xdn']] },
};
