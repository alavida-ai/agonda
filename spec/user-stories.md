# Operations System — User & Agent Stories

18 human stories, 5 agent stories. Stress-tested against 12 Week Year and Phoenix Project methodology.

## Human Stories

### S1: Alex — Weekly Priority Setting

> As Alex, I want to see all active commitments, their owners, and their deadlines in one place, so I can set the team's weekly priorities without reconstructing everything from memory.

**Currently:** I scan MEMORY.md, re-read CONTINUE.md files, check Linear, recall Slack conversations. 30+ minutes to reconstruct current state. Things fall through cracks.

---

### S2: Thomas — Daily Self-Service

> As Thomas, I want to know what I need to do today and why it matters, without asking Alex or reading architecture files.

**Currently:** I message Alex on Slack. If he's busy, I'm blocked. I don't know what's urgent vs what can wait. I have no way to self-serve my own task list.

---

### S3: Chicote — Bridging Linear and Context

> As Chicote, I want to see which of my Linear tickets are highest priority and whether there's already an active workspace working on the same problem, so I can pick up work with full context instead of starting blind.

**Currently:** I check Linear for my assigned tickets but can't tell if someone (or an agent) has already been working on this in a workspace. I duplicate effort or miss existing research. I ask Alex to connect the dots.

---

### S4: Alex — Unplanned Work Awareness

> As Alex, I want to see how much unplanned work displaced our planned tactics each week, so I can tell whether we have an execution problem or a firefighting problem.

**Currently:** When we miss commitments, I don't know if we failed to execute or if surprise work ate our time. The cause is invisible, so I can't fix the pattern.

---

### S5: Thomas — Commitment Capture

> As Thomas, I want commitments made in meetings and Slack to land somewhere durable, so they don't evaporate and resurface as missed deadlines.

**Currently:** We agree "landing page ships Monday" in a call. There's no artifact. A week later nobody remembers, or I remember differently than Alex. Commitments live in memory and die there.

---

### S6: Alex — Work Type Balance

> As Alex, I want to see the split between revenue-generating work and internal infrastructure work across the team, so I can catch when we're over-investing in the engine and under-investing in selling.

**Currently:** I have a gut feeling we spend too much time on architecture and not enough on client-facing work. But I can't see it — no categorization exists. The ratio is invisible.

---

### S10: Alex — Stale Work Cleanup and Synthesis

> As Alex, I want to see which workspaces are stale or silently finished, so I can either close them or synthesize their insights into domain knowledge before archiving — capturing the value instead of losing it.

**Currently:** 16 of 42 workspaces are stale. I don't know if they're done, blocked, or forgotten. The ones that ARE done have uncaptured learnings, decisions, and research that will be lost when I eventually delete them. Closing a workspace without synthesizing is throwing away work.

---

### S11: Alex — Execution Trend

> As Alex, I want to see whether our weekly execution scores are improving, flat, or declining over time, so I can intervene early rather than discovering at the end of a cycle that we've been drifting.

**Currently:** No execution scoring exists. I find out we missed a goal when the deadline passes. There's no early warning signal. By the time I notice, weeks have been wasted.

---

### S13: Team — Coordination Without Sync Meetings

> As a team member, I want to see what the rest of the team accomplished and what's blocked, so I can unblock others or adjust my own work without scheduling a call.

**Currently:** I ask Alex on Slack. Or we wait for the next meeting. Async coordination doesn't exist — every handoff or priority question requires synchronous communication.

---

### S14: Alex — Constraint Visibility

> As Alex, I want to see when I'm the bottleneck — when work is waiting on me specifically — so I can delegate or unblock before things stall.

**Currently:** I don't know what's blocked on me until someone chases me. Thomas waits silently. Chicote works around it. I find out days later that I was holding things up.

---

### S16: Team — Weekly Honest Assessment

> As the team, we need a short weekly ritual where we honestly confront what we did and didn't do, so we catch drift in weeks not months and hold each other accountable without it feeling punitive.

**Currently:** No structured check-in exists. We discover missed commitments when deadlines pass. There's no regular moment to ask "did we actually do what we said?" Feedback cycles are quarterly at best — by then, small misses have compounded into failed goals.

---

### S17: Alex — WIP Awareness Before Starting New Work

> As Alex, I want to see how much work is already in flight before starting something new, so I can decide whether to open another workspace or finish what's already open.

**Currently:** I start new workspaces whenever a new idea or problem arrives. 16 of 42 are stale. Each open workspace is invisible WIP that fragments attention and creates context-switching. I never consciously choose "finish this before starting that" because I can't see the full picture at the moment I'm about to start.

---

### S18: Chicote — Connecting Engineering Work to Goals

> As Chicote, I want to understand how my Linear tickets connect to the team's goals, so I can prioritize between tickets based on what matters strategically rather than just what's assigned to me.

**Currently:** I see my ticket queue in Linear but tickets don't carry goal context. Deploying the identity quantum and fixing a CI config look the same — both are assigned, both have due dates. I don't know which one moves the needle on a goal we committed to.

---

### S19: Team — Creating the 12-Week Commitment

> As the team, we need to create a shared plan at the start of each cycle where each person commits to their own tactics, so the plan reflects real capacity and real commitment — not just Alex's wishlist.

**Currently:** Alex decides what everyone should do. Thomas and Chicote receive instructions. There's no moment where each person looks at the plan and says "yes, I commit to this." Without personal commitment, tactics are assignments, not ownership.

**Methodology basis:** 12WY Commitment principle — "the shift from 'if' to 'how.' Four keys: strong desire, keystone actions, count the costs, act on commitments not feelings." A plan Alex wrote alone is Alex's plan. A plan each person committed to is THE plan.

---

### S20: Alex — Distinguishing Execution Failure from Plan Failure

> As Alex, when we miss our execution target, I need to determine whether we failed to do the tactics or whether the tactics themselves were wrong, so I don't change a good plan prematurely and don't persist with a broken one.

**Currently:** When something doesn't work, the instinct is to redesign. I can't tell whether the plan failed or we just didn't do it.

**Methodology basis:** 12WY — "if score < 85%, >60% of the time it's an execution breakdown, not a plan content breakdown. Don't change the plan prematurely — execute it first."

---

## Agent Stories

### S7: Agent — Session Priority Discovery

> As an agent starting a session, I need to discover what's most important right now and what's due this week, so I can orient my work toward what matters instead of just continuing where the last session left off.

**Currently:** I read MEMORY.md (200-line cap, often stale) and the workspace's CONTINUE.md if I'm in a worktree. I have no way to know whether this workspace is urgent, deprioritized, or superseded by something else.

---

### S8: Agent — Workspace Purpose

> As an agent entering a workspace, I need to know why this workspace exists, what it's trying to deliver, and who it's for, so my output serves the actual goal rather than just the workbench's generic purpose.

**Currently:** I read the workbench's goal.md which describes what the workbench IS ("a platform workbench for designing architecture changes"), not what this specific workspace needs to achieve. The `.workbench` file has name and domain only. I work without purpose context.

---

### S9: Agent — Avoiding Duplicate Work

> As an agent, I need to know if related work has already been done elsewhere in the system, so I don't waste time re-researching solved problems or produce conclusions that contradict existing decisions.

**Currently:** I only see the workspace I'm in. Decisions, research, and conclusions from other workspaces are invisible to me. I can't tell if my question has already been answered.

---

### S12: Agent — Building on Previous Learnings

> As an agent, I need to access insights and patterns from previous work that have been synthesized into domain knowledge, so I can build on what the team has already learned instead of starting from zero.

**Currently:** Domain knowledge exists but I don't always know which domain holds relevant learnings for my current task. Previous workspace work gets synthesized into domains, but the connection between "what I'm working on now" and "what's already been learned about this" isn't obvious.

---

### S15: Agent — Connecting Workspace to Plan

> As an agent, I need to understand how the workspace I'm in connects to the team's broader goals, so I can prioritize my work within the workspace accordingly.

**Currently:** I know what this workspace is delivering (CONTINUE.md) but not whether it's urgent, strategic, or deprioritized. A workspace building the landing page and a workspace exploring a research question look the same to me. I can't weigh tradeoffs without knowing what matters most right now.

---

## Story Coverage Matrix

### By Layer

| Layer | Stories | Coverage |
|-------|---------|----------|
| Direction | S1, S7, S15, S18, S19 | Priority setting, agent discovery, goal-work connection, plan creation |
| Work Execution | S2, S3, S5 | Daily task visibility, Linear-workspace bridging, commitment capture |
| Visibility | S6, S10, S17 | Work type balance, stale cleanup, WIP awareness |
| Honesty | S4, S11, S16, S20 | Unplanned work, execution trend, weekly ritual, breakdown diagnosis |
| Learning | S12 | Building on synthesized domain knowledge |
| Cross-cutting | S8, S9, S13, S14 | Workspace purpose, duplicate avoidance, async coordination, constraint visibility |

### By Persona

| Persona | Stories | Count |
|---------|---------|-------|
| Alex | S1, S4, S6, S10, S11, S14, S17, S20 | 8 |
| Thomas | S2, S5 | 2 |
| Chicote | S3, S18 | 2 |
| Team | S13, S16, S19 | 3 |
| Agent | S7, S8, S9, S12, S15 | 5 |

### By Gap (from goal.md)

| Gap | Stories |
|-----|---------|
| No Direction | S1, S7, S15, S18, S19 |
| No Breadth of Visibility | S3, S6, S8, S10, S17 |
| Learnings Evaporate | S9, S12 |
| Coordination Is Synchronous | S2, S5, S13, S14 |

### By Methodology

| Methodology Concept | Stories |
|---------------------|---------|
| 12WY: Vision | S19 (plan creation reconnects with vision) |
| 12WY: Planning | S1, S7, S15, S19 |
| 12WY: Process Control | S16 (WAM), S11 (scorecard trend) |
| 12WY: Measurement | S4, S11, S20 |
| 12WY: Commitment | S19 (personal commitment to tactics) |
| 12WY: Accountability | S16 (weekly honest assessment) |
| 12WY: Breakdown diagnosis | S20 (execution vs plan content) |
| 12WY: Lead vs lag | S11, S18 |
| Phoenix: Make work visible | S1, S2, S3, S6, S17 |
| Phoenix: Four types of work | S6 |
| Phoenix: Unplanned work | S4 |
| Phoenix: Theory of Constraints | S14 |
| Phoenix: WIP limits | S17 |
| Phoenix: Fast feedback (Second Way) | S11, S16 |
| Phoenix: Continuous learning (Third Way) | S12 |

### Methodology Concepts Not Requiring Stories

| Concept | Why No Story Needed |
|---------|-------------------|
| 12WY: Time Use (strategic/buffer/breakout blocks) | Personal productivity habit, not an operations system feature |
| 12WY: Emotional Cycle of Change | Addressed by S11 (execution trend shows progress through the Valley) and S16 (WAM provides encouragement) |
| 12WY: Greatness in the Moment | Philosophical principle, not a system feature |
| 12WY: 13th Week Review | Deferred (O3) — design after first cycle completes |
| Phoenix: First Way (fast flow) | Addressed by S17 (WIP), S10 (close stale work). Batch size reduction is process, not tooling. |
| Phoenix: Third Way (experimentation) | How the team already works. Not a gap. |
