# Callers — X Brand Package

## Display name
**Callers**

## Suggested @username options
1. `@callerslaunch`
2. `@callersdotlol`
3. `@thecallerspad`
4. `@calleditfirst`
5. `@paythecallers`

## Bio (≤160 chars)
> Open a call window before your coin exists. Whoever calls it first is written into its Pump.fun fee split and gets paid on every trade. callerslaunch.lol

## Profile
- PFP: `/public/branding/pfp.png` (pixel megaphone)
- Banner: `/public/branding/banner.png`
- Pinned: launch tweet below.

---

## Launch tweet (main)

> every memecoin runs on people calling it. they take the reputational risk of being early and loud, and they get paid in clout while the dev earns a fee on every trade their calling caused.
>
> Callers fixes the accounting. you open a call window before your coin exists — 15, 30 or 60 minutes — and anyone can call it by signing a message. free, no transaction.
>
> when you launch, the first callers are written straight into the coin's Pump.fun fee-sharing config, weighted so the earliest caller earns the most. from then on Pump.fun pays them directly on every single trade. nothing routes through us.
>
> shares aren't handed out by the dev to their friends. they're earned by showing up first.
>
> callerslaunch.lol

## Short launch tweet

> call a coin before it exists, get written into its fee split at launch, get paid by pump.fun on every trade after that.
>
> earliest caller earns the most. callerslaunch.lol

## Technical launch tweet

> how it works under the hood:
>
> creator opens a call window; callers sign an ed25519 message proving wallet ownership (no tx, no cost). at launch we build one atomic Jito bundle:
>
> tx1 pump.fun create_v2 (+ optional dev buy)
> tx2 create_fee_sharing_config + update_fee_shares_v2 — creator + up to 9 callers, bps summing to 10000, weighted by call order
> tx3 fees
> tx4 an on-chain certificate of the split
>
> 9 callers is pump.fun's ceiling (10 shareholders, creator takes one), not a number we picked.
>
> callerslaunch.lol/api/verify/<mint>

## Follow-up tweets (5)

1. > the difference from creator-assigned fee splits: nobody picks you. you open the window, and whoever calls first gets the slot. patronage vs. earning it.

2. > earliest caller earns the most — linear weights. with 3 callers on a 50/50 split that's 25.01% / 16.66% / 8.33% of the creator fee stream. forever, on every trade.

3. > important and we're not burying it: pump.fun lets a coin's creator edit their fee config after launch. no launchpad can remove that power. so we record the split on-chain at launch and flag any change in red on the coin's page. we make it visible, not impossible.

4. > a call costs nothing. you sign a message, you don't send a transaction. the signature just proves you control the wallet that gets paid.

5. > also true: a creator can call their own coin from alt wallets. every caller address is public on the coin's page. look before you assume a call window means a crowd.

## Thread — how it works

> 1/ Callers is a pump.fun launchpad where a share of a coin's creator fees goes to the people who called it before it existed. here's the whole thing 🧵

> 2/ the problem: callers are the distribution. they find coins early and put their reputation on it. the dev earns a fee on every trade that calling produces. the caller earns a screenshot.

> 3/ other launchpads let a creator assign fee shares to chosen wallets or handles. that's useful but it's patronage — the dev decides who eats. we wanted the share to be *earned*.

> 4/ so: before the coin exists, the creator opens a call window (15/30/60 min) and picks how much of their fee stream callers get. they get a link. there is nothing to buy yet — only to call.

> 5/ anyone can call. you sign a message — "I am calling launch <id> as <address>" — with your wallet. free, no transaction, no approval. the signature proves you control the address that would get paid.

> 6/ order matters. callers split their portion with linear weights, so caller #1 earns the biggest slice and caller #9 the smallest. being first is worth something, which is the entire point.

> 7/ why 9? pump.fun's fee sharing supports 10 shareholders and the creator takes one slot. that's a protocol ceiling, not a design choice.

> 8/ at launch it's one atomic Jito bundle: create_v2 (+ optional dev buy), then create_fee_sharing_config and update_fee_shares_v2 writing every caller in. same slot or nothing — nobody trades before the callers are in.

> 9/ after that we're out of the loop entirely. pump.fun's own fee distribution pays each shareholder their bps on every trade, on the curve and after graduation. we never hold or forward the money.

> 10/ the honest caveat: pump.fun lets the creator edit that fee config later. we can't prevent it and neither can any other launchpad. what we do is write the original split into an on-chain certificate at launch and compare it to the live config forever — if a creator cuts their callers out, the coin's page says ALTERED in red, permanently.

> 11/ other things that are true: a fee share of a coin that never trades is worth zero, and a creator can call their own coin from alt wallets. caller addresses are all public. judge accordingly.

> 12/ real pump.fun token, real curve, real graduation. the only difference is who gets paid: callerslaunch.lol

## Content rules
- Never say "guaranteed", "locked", or "forever" about the split. It is editable by the creator — say so in any thread longer than three posts.
- Lead with the mechanic, not with earnings potential. Never imply expected returns.
- When quoting percentages, use real numbers from the weighting (25.01 / 16.66 / 8.33 on a 3-caller 50/50).

## Relationship to the sibling pads (internal note)
Fifth launchpad on the shared infrastructure after SlotZero (locks the dev bag), Thaw (melts it), Pyre (burns it) and Launchpad Inu (theme + registry). Callers is about *distributing* the creator fee rather than constraining the dev's supply. Nearest external comparison is Bags' fee splitting — differentiate on **earned vs. assigned** shares, never claim to have invented fee sharing.
