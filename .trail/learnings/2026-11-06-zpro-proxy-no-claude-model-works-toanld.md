---
title: "zpro proxy: no Claude model works with the current key (2026-11-06)"
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 1, tokens: 12300 }
touches:
  - CLAUDE.md
  - supabase/functions/chat/agent.test.ts
  - supabase/functions/chat/agent.ts
  - supabase/functions/chat/handler.test.ts
  - supabase/functions/chat/handler.ts
  - supabase/functions/chat/system-prompt.test.ts
  - supabase/functions/chat/system-prompt.ts
  - supabase/functions/chat/tools.test.ts
  - supabase/functions/chat/tools.ts
---

## Decided
- On 2026-11-06 I tried every Claude model the zpro proxy (LLM_BASE_URL) lists, using the key in supabase/functions/.env. None works. Haiku 4.5, Sonnet 4.5/4.6/5, Opus 4.6/4.7 and Fable 5.1 return 404 model_not_found ("not supported by any configured account in this group"). Opus 4.8/5, Fable 5 and the -on1 variants return 401 "All available accounts exhausted", both at first and on retry. The Anthropic-style /v1/messages endpoint returns 502 "Upstream authentication failed" for opus-5 and 404 for sonnet-5.
- To use Claude for the chatbot, the project needs another source: an official Anthropic API key, or a proxy group that actually serves Claude.

## Tried and ruled out
- The /models list as proof of access: it lists 14 Claude ids, and none of them answers.

## Watch out
- llm.ts and agent.ts are built on the OpenAI SDK types (ChatCompletionMessageParam, tool_calls). Moving to the official Anthropic SDK means changing the message and tool format in agent.ts, llm.ts and the tests, not only the 3 env vars.
