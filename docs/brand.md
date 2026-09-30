# Callers — Brand Identity

## Name

**Callers** — in memecoin culture a "caller" is the person who spots a coin and tells people about it. They take the reputational risk of being early and are paid in nothing but clout. This launchpad pays them instead.

Ticker: `$CALLER`.

## Coin

- **Coin name:** Callers
- **Ticker:** `$CALLER`

Launched through its own call window, with the first callers written into its fee split — the platform running its own mechanic on itself.

## Tagline

**"The people who called it get paid."**

Secondary: "Call it before it exists." / "Earned, not handed out."

## Voice
Plain and a little blunt. The mechanic is generous, so the copy doesn't need to oversell — it needs to be precise about what is and isn't guaranteed. The single most important brand commitment: **never imply the split is permanent**, because Pump.fun lets creators edit it. Say that out loud, everywhere, and make the verifier the answer.

## Key vocabulary
- **Call window** — the pre-launch period when anyone can call the coin.
- **Call** — a wallet signature claiming a slot. Free, no transaction.
- **The split** — the on-chain fee-sharing config: creator + up to 9 callers.
- Avoid "reward", "airdrop", "allocation" — those imply tokens. Callers earn **fees**, not supply.

## Visual identity

**Aesthetic:** the shared phosphor/terminal system with a signal-magenta accent — broadcast, alert, attention. Hot but not cheap; magenta on near-black with a light pink highlight.

### Color system
| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0A0C` | page background |
| `surface` | `#111114` | cards, panels |
| `surface-2` | `#1A1A1F` | inputs, raised |
| `line` | `#26262C` | borders |
| `text` | `#E8E6E1` | primary text |
| `muted` | `#8B8B93` | secondary text |
| `magenta` (accent) | `#FF3E9D` | callers, CTAs, live windows |
| `magenta-dim` | `#5C1338` | borders, fills |
| `pink-hi` | `#FFA3CE` | highlights, broadcast arcs |
| `steel` | `#C4C6D2` | the megaphone's hardware |
| `amber` | `#FFB224` | warnings, closed windows |
| `red` | `#FF5C5C` | errors, **ALTERED** splits |

(In code the CSS token is still `--color-green` for component reuse; its value is the magenta above.)

### Typography
- **Display / logo:** Silkscreen (pixel).
- **UI / body:** Space Grotesk.
- **Data / code:** JetBrains Mono — percentages and addresses.

### Logo
Wordmark `CALLERS` in Silkscreen: `CALL` in text-white, `ERS` in magenta. Mark: a **pixel megaphone** — steel mouthpiece, magenta cone opening right, handle beneath, three light-pink broadcast arcs.

### Signature UI details
- A **live countdown** on every open call window. Urgency is the product.
- The split table **re-weights visibly** as callers arrive — the landing demo is just this, animated.
- On a coin's page, an altered split renders in **red with the original value struck through by an arrow** (`25.01% → removed`). Accountability should look like accountability.

## Asset specs
- PFP `/public/branding/pfp.png`: 1024×1024, megaphone, ≤8 colors.
- Banner `/public/branding/banner.png`: 1500×500, wordmark + tagline + `CALL IT + IT LAUNCHES + YOU EARN = EVERY TRADE.`
- OG `/public/branding/og.png`: 1200×630.
- Favicon: 32×32 megaphone derivative.

## Product one-liner
"This is Pump.fun, except a share of the creator fees goes to whoever called the coin before it existed."
