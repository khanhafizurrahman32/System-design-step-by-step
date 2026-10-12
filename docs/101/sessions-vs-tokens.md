---
title: "Sessions vs tokens"
description: "Server-side sessions or self-contained tokens: where the login state lives, and what that costs."
---

# Sessions vs tokens

<span class="lvl lvl-i">Intermediate</span>

![Sessions vs tokens](../diagrams/101-sessions-tokens.svg)

After login, every request has to say who it comes from. There are two ways to do it.

**Server-side session.** The server creates a random session ID, stores `session ID → user` in a store such as Redis, and sends the ID in a cookie. Each request costs a lookup, but **logout and revocation are instant**: delete the row.

**Self-contained token** (usually a JWT). The server signs a token holding the user ID, roles and expiry. Any server can verify it with the public key, with **no lookup**, which suits many services and regions. The catch is that a valid token stays valid until it expires. So keep **access tokens short-lived** (5–15 minutes) and pair them with a **refresh token** that is checked against a store and can be revoked.

Browsers: put either in an `HttpOnly`, `Secure`, `SameSite` cookie, not in `localStorage`, where any injected script can read it.

## When to use it

- **Sessions**: a classic web app with one backend, or where instant logout matters (banking, admin tools).
- **Tokens**: many services or regions, mobile apps and third-party APIs. Short access tokens plus revocable refresh tokens.

> [!TIP]
> **Say this in the interview:** "The gateway validates a short-lived JWT locally, so services don't hit a session store on every call. Refresh tokens live in a database so we can revoke them; worst case, a stolen access token works for 10 minutes."

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>What is the main advantage of a server-side session?</summary>

Instant revocation: logging out or banning a user just deletes the session row.

</details>

<details class="question" markdown>
<summary>Why keep JWT access tokens short-lived?</summary>

They can't easily be revoked; any server will accept them until they expire. Short lifetimes limit the damage of a stolen token.

</details>

<details class="question" markdown>
<summary>Where should a browser keep its session ID or token?</summary>

In an HttpOnly, Secure, SameSite cookie, not localStorage, where injected scripts can read it.

</details>

## Related

- [JWT](jwt.md)
- [OAuth 2.0](oauth.md)
- [API gateway](api-gateway.md)
