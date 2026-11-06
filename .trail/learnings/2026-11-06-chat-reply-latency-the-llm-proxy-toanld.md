---
title: "Chat reply latency: the LLM proxy dominates, not our code"
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 8, tokens: 50510 }
---

## Decided
- Measured on 2026-11-06 with minimal requests ("reply with one word: ok", 5 output tokens) sent straight to LLM_BASE_URL (api.zpro.io.vn, model gpt-6-luna): 2 s to 33 s for the same request. The proxy is unstable, and that is where the chat time goes.
- Every chat message makes at least 2 LLM calls in agent.ts runAgent (round 1 calls a tool, round 2 writes the reply), so proxy latency is doubled or worse. Stats questions can take 3 or more rounds. TIMEOUT_MILLISECONDS is 30 s, so slow rounds end in a 504.
- Speed-ups proposed to the owner, none implemented yet: (1) skip round 2 when a round only calls propose_transaction and have the server write the reply, which roughly halves recording time; (2) move to a stable provider, which needs only the 3 env vars; (3) run consumeQuota and fetchCategories in parallel, a minor gain; (4) streaming, not worth it yet (needs function and app changes).

## Tried and ruled out
- Reasoning effort as the cause: reasoning_effort "none" still took 10.8 s and "low" took 33 s. Usage reports no reasoning tokens. gpt-6-luna does not accept "minimal" (it accepts none/low/medium/high/xhigh/max).
- Switching to another model on the same proxy: gpt-5.6-luna and gpt-6-luna both take about 2 s when the proxy is calm, and gpt-5.6 took 10 s. claude-sonnet-5 on the proxy returns "Upstream access forbidden".

## Watch out
- Latency varies widely from minute to minute, so take several samples before blaming or crediting a change.
- These were direct LLM calls, not end-to-end in-app timings. The eval kit (eval/run.ts) does not record timings.
