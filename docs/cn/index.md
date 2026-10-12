---
title: "Computer Networking, chapter by chapter"
description: "Study notes on Computer Networking: A Top-Down Approach (Kurose and Ross), drawn as diagrams and connected to system design."
---

# Computer Networking, chapter by chapter

> These pages are study notes in our own words and diagrams on *Computer Networking: A Top-Down Approach* by James Kurose and Keith Ross, connected to system design. They don't replace the book, which is worth reading in full.

Every system you design runs on a network, and many interview answers depend on it: why far-away users are slow, why connection reuse matters, how a CDN finds the nearest server, why mobile clients disconnect, what an L4 load balancer can and can't see. These pages cover the book chapter by chapter. Each section explains **why** the problem exists and **how** the solution works, then shows where it appears in system design interviews.

![The five-layer stack and encapsulation](../diagrams/cn-01-layers.svg)

The book goes **top-down**: it starts with the applications you already use (the web, DNS, video) and works down the stack to the wires and radio. Each layer relies on the one below it.

| Chapter | Layer | What you'll learn | Why it matters for system design |
|---|---|---|---|
| [1. Computer networks and the Internet](01-computer-networks-and-the-internet.md) | Overview | Edge, access and core; packet switching; four kinds of delay; layering | Where latency comes from; why distance beats bandwidth |
| [2. The application layer](02-application-layer.md) | Application | HTTP and caching, DNS, CDNs and video streaming, P2P, sockets | Caching headers, DNS-based routing and failover, CDNs |
| [3. The transport layer](03-transport-layer.md) | Transport | Ports, UDP, building reliability, TCP handshake, flow and congestion control | Connection pooling, TCP vs UDP, head-of-line blocking |
| [4. The network layer: data plane](04-network-layer-data-plane.md) | Network | Inside a router, longest prefix match, IP addressing, DHCP, NAT, IPv6, match + action | VPC design, NAT gateways, why IP rate limits are coarse |
| [5. The network layer: control plane](05-network-layer-control-plane.md) | Network | Link-state and distance-vector routing, OSPF, BGP, SDN, ICMP | Anycast, multi-region routing, software-defined cloud networks |
| [6. The link layer and LANs](06-link-layer-and-lans.md) | Link | Error detection, multiple access, MAC and ARP, switches, data centre networks | Rack and zone failure domains, ECMP, a request end to end |
| [7. Wireless and mobile networks](07-wireless-and-mobile-networks.md) | Link (wireless) | Wi-Fi, 4G and 5G, mobility and handover | Designing for flaky mobile clients, offline-first, QUIC |
| [8. Security in computer networks](08-security.md) | All layers | Cryptography, signatures and certificates, TLS, IPsec, firewalls | mTLS between services, webhook signatures, DDoS defence |

## How to use these pages

- **New to networking?** Read chapters 1–3 in order, then [What happens when you type a URL](../101/type-a-url.md), which ties them together.
- **Preparing for interviews?** Read each chapter's "In the system design interview" section and do the self-check questions.
- **Going deeper?** Read chapters 4–6 for how packets actually move, and pair chapter 8 with the [Security & auth](../101/index.md#security-auth) explainers.

## Related

- [System Design 101](../101/index.md): one-screen explainers of TCP vs UDP, HTTP versions, HTTPS, API gateways and more.
- [Networking essentials](../core-concepts/networking.md): the short version for interviews.
- [DDIA Ch 8](../ddia/08-trouble-with-distributed-systems.md): what unreliable networks mean for distributed systems.
