# Scoring, ranks and anti-cheat

Everything here is implemented in two places that are tested to agree: TypeScript in
`src/lib/games` and `src/lib/tiers.ts` (unit-tested), and SQL in
`supabase/migrations/20261117000700_progression.sql` (integration-tested).

## The eight trials

| Trial | Rules | Score |
|---|---|---|
| Reaction Time | Wait for the field to turn gold (random 1.5–4.5 s), then click/tap/Space. Five attempts; early presses do not count. | Mean of 5 attempts, ms |
| Sequence Memory | 3×3 tiles flash in a sequence that grows by one each round; repeat it. One mistake ends. Keys 1–9 work. | Longest sequence repeated |
| Aim Trainer | 30 targets, one at a time, at random positions. | Mean time per target, ms |
| Number Memory | A number is shown for 1.2 s + 0.5 s per digit, then typed back. +1 digit per success; one mistake ends. | Longest number recalled |
| Verbal Memory | Words one at a time: Seen or New (keys S/N). Three lives. | Correct answers |
| Chimp Test | Numbers on an 8×5 field; after 1 is chosen the rest hide. Start at 4; +1 per success; three strikes end. | Most numbers completed |
| Visual Memory | Tiles light for 1.1 s in a grid that grows (3×3 → 8×8, tiles = level + 2). Three wrong tiles cost a life; three lives. | Highest level completed |
| Typing | Type a passage exactly. Clock starts at the first key. | Net WPM = (characters/5 per minute) × accuracy |

Timing uses `performance.now()`. Reaction time starts when the gold frame is committed and is refined
to the painted frame with `requestAnimationFrame`.

## Ratings (0–100)

Each score maps to a rating by linear interpolation between fixed anchors, clamped at 0 and 100.
The anchors are an editorial reference scale, **not** population norms.

| Trial | Score | Better | Anchors (score → rating) |
|---|---|---|---|
| Reaction Time | milliseconds | lower | 150→100, 180→92, 200→85, 225→72, 250→58, 275→45, 300→34, 350→20, 400→10, 500→0 |
| Sequence Memory | steps remembered | higher | 0→0, 3→10, 5→25, 7→40, 9→55, 11→68, 13→78, 15→86, 18→93, 22→98, 26→100 |
| Aim Trainer | milliseconds per target | lower | 250→100, 300→94, 350→85, 400→74, 450→62, 500→50, 600→32, 700→18, 900→0 |
| Number Memory | digits remembered | higher | 0→0, 4→10, 6→25, 7→40, 8→52, 9→63, 10→72, 12→85, 14→92, 17→98, 20→100 |
| Verbal Memory | correct answers | higher | 0→0, 20→10, 40→28, 60→45, 80→58, 100→68, 130→80, 170→90, 230→97, 300→100 |
| Chimp Test | numbers in order | higher | 0→0, 5→10, 7→22, 9→38, 11→52, 13→64, 15→75, 18→86, 22→94, 27→99, 30→100 |
| Visual Memory | level reached | higher | 0→0, 3→10, 5→22, 7→36, 9→50, 11→62, 13→73, 15→82, 18→91, 22→97, 26→100 |
| Typing | net words per minute | higher | 0→0, 20→8, 35→22, 50→40, 65→55, 80→68, 95→79, 110→87, 130→94, 150→98, 170→100 |

**Percentiles** shown to members are computed live against members: the share of members whose best
is worse than yours, counting ties as half (`public.game_percentile`). With fewer than two members
the site says so instead of showing a number.

## The Echelon score (0–1,000)

```
Mind     = round( 5 × Σ best_rating[g] / 8 )        over the 8 trials (unplayed = 0)   → 0–500
Practice = round( 2.5 × min(distinct_practice_days, 100) )                           → 0–250
Voice    = min( reputation, 250 )                                                     → 0–250
Echelon  = Mind + Practice + Voice                                                    → 0–1000

reputation = 2 × upvotes received on threads and replies
           + 15 × replies marked as the accepted answer
```

A practice day is a UTC day with at least one saved (unflagged) result. Recomputed by
`public.recompute_member` after every saved result, logged test, vote and accepted answer.

## Tiers

| Tier | Name | From | Opens |
|---|---|---|---|
| I | Initiate | 0 | Pewter profile theme |
| II | Associate | 100 | Bronze theme |
| III | Fellow | 250 | Silver theme, **the Inner Room** |
| IV | Savant | 450 | Gold theme |
| V | Luminary | 650 | Platinum theme |
| VI | Laureate | 850 | Obsidian theme |

A tier, once reached, is kept (`tier = max(previous tier, tier_for_score(score))`), so a lost vote
never demotes anyone. Every promotion is recorded in `tier_events` and notified.

Examples: playing all eight trials at rating 50 on ten different days gives 250 + 25 = 275 (Fellow).
Laureate needs, for example, an average rating of 90 (450) plus 100 practice days (250) plus 150
reputation.

## Marks (achievements)

First Trial · Full Battery (all 8) · Ten Bests · Top Decile (≥ 90th percentile with ≥ 20 members) ·
Daily Discipline · Seven Dailies · Three Days / A Full Week / Thirty Days (streaks) · First Word
(thread) · In Dialogue (reply) · Well Received (10 upvotes) · Widely Read (50) · The Answer (accepted
answer) · Cartographer (a Directory result) · Fellow · Laureate.

## Streaks and the daily challenge

The daily game rotates through the eight trials by UTC date (`public.daily_game`, mirrored in
`dailyGame()`). A streak counts consecutive practice days ending today or yesterday.

## Anti-cheat

1. **Sessions.** `POST /api/games/start` issues a single-use session id (stored server-side). Results
   are only accepted against an unused session of the same member and game, within 2 hours.
2. **Raw observations, not scores.** The client sends attempt times, levels or keystroke counts; the
   server recomputes the score (`evaluate()` in `src/lib/games/validate.ts`).
3. **Schema validation.** Payloads that break the rules (wrong number of attempts, impossible levels,
   typing counts inconsistent with the passage) are rejected.
4. **Physical time.** Each result has a minimum duration (for example the sum of reaction times plus
   five minimum waits; the time needed to replay every sequence). Finishing faster than the trial can
   run is flagged.
5. **Human floors.** Flagged as implausible: reaction mean < 120 ms or any attempt < 100 ms, aim mean
   < 170 ms, sequence > 60, number span > 40, verbal > 1,500, visual level > 45, typing > 220 net WPM
   or > 25 keys per second.
6. **Flagged results** are stored but excluded from bests, leaderboards, percentiles and the score
   until a moderator clears them (`/mod/flagged`, audited).
7. **Database guard.** Members cannot insert results at all (`revoke insert`); only the server, after
   these checks, writes with the service role. Starts are rate-limited (400 per hour).
