---
title: "NVIDIA API models for the chat function: Mistral Large 4 recommended"
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 51, tokens: 50407 }
---

## Decided
- Provider: NVIDIA (OpenAI-compatible). LLM_BASE_URL must be `https://integrate.api.nvidia.com/v1` with no `/chat/completions`, because the OpenAI SDK appends that path itself. Model ids are vendor/name, e.g. `mistralai/mistral-large-4-1t-a52b`.
- Recommended model: mistralai/mistral-large-4-1t-a52b. Clean eval on 2026-11-06: 28 passed, 7 refusals all fine, 1 504, and 2 known non-issues (biggest-this-week, which every model fails, and empty-period, which answers correctly but wording differs from the grader). Every draft-* question passed. The card correction ("không, 35k", "hôm qua chứ") called propose_transaction with replaces=1 in 5 of 5 runs. A first round usually takes 2–6 s, with occasional NVIDIA stalls of 12–31 s.

## Tried and ruled out
- stepfun-ai/step-5-preview: the fastest (1–7 s per round, eval in 201 s versus 444 s for Mistral), but in 4 of 5 runs it answered a card correction by writing a fake "[Thẻ 1: Chi 35.000 đ …]" line as text instead of calling the tool. The user would see a "corrected" card that does not exist and save the old amount. It is also a preview model.
- minimaxai/minimax-m3.1-flash took 84 s for "ok". deepseek-ai/deepseek-v4.1-flash, z-ai/glm-5.3-flash and openai/gpt-oss-20b gave no answer within 90 s. moonshotai/kimi-k2.6 returns 404 for this account. nvidia/nemotron-3.5-lightning spends about 500 reasoning tokens on "ok" and in round 1 called list_categories or nothing instead of proposing. google/gemma-4-31b-it is correct but takes 13–47 s.

## Watch out
- Sending 8 models' requests at once made most of them time out; probe models one after another.
- `pkill -f "functions serve chat"` inside the same Bash command kills that shell too (exit 144). Find the PID with `ps -eo pid,args | grep "[f]unctions serve chat"` in a separate call instead.
- Saving supabase/functions/.env in the IDE during an eval restarts `functions serve`, and the rest of the run fails with 502.
