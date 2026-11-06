# Legacy: autonomous collection and AI classification

This is the code the engine used to find and label photos on its own. It was removed so that photos only come from labelled uploads and MCP agents, and the system has no AI of its own. It is kept here, outside the build, in case we want the engine to collect by itself again.

It is a snapshot of the engine at commit `59a337b`, in the same folder layout.

## What it did

- **Collection** (`engine/services/collection.service.ts`, `engine/jobs/`): the play button started one background job per category, all running at the same time on a p-queue.
- **Search** (`engine/services/search.service.ts`): each job searched Bing image results and the Brave image API with the category's search terms combined with places (`""`, Nigeria, Lagos, Abuja, nairaland). Results were cached in `.cache/search/<category>.json`. All Brave calls shared one queue, 1.1 s apart, because Brave allows 1 request per second.
- **Collector** (`engine/services/collector.service.ts`): 8 workers per category downloaded each result and skipped blocked sites (stock photo sites, shops) and titles. It then skipped near duplicates and sent a 384 px preview to the classifier. Accepted photos were saved to R2 and Redis. Workers paused while uploads were being checked.
- **Classification** (`engine/services/ai/classifier.service.ts`): an OpenRouter vision model returned `{ category, confidence, reason }`, and a photo was kept when it had a category and a confidence of at least 0.7. The model was set in `engine/services/ai/models.ts`; the last one used was `nvidia/nemotron-3.5-super-vl:free`, paced at 18 requests a minute. A daily cap on AI checks was counted in Redis.
- **Uploads** (`engine/services/upload.service.ts`): an uploaded photo went to `tmp/` in R2 while it was classified, then it was moved to `images/<category>/` or deleted.
- **Review** (`engine/services/review.service.ts`): every checked photo was hard linked into `review/<model>/<category>/<result>/` with a line in `log.jsonl`, for checking what the classifier accepted and rejected.
- **UI** (`src/control-bar.tsx`): the play and stop button, plus checked and added counts.

## Bringing it back

1. Copy the files back into `engine/` and `src/`, replacing the current `upload.service.ts` and `control-bar.tsx`.
2. Install the dependencies: `bun add ai @openrouter/ai-sdk-provider p-queue`.
3. Add `OPENROUTER_API_KEY` and, optionally, `BRAVE_SEARCH_API_KEY` back to `engine/config/env.ts`, `.env` and the Dokploy env.
4. In `config.ts`, add back `export const aiChecksPerDay = 1000`. The classifier has its own copy of the photo rules, so swap it to `photoRules` from `config.ts` to keep the classifier and MCP agents on the same rules. Also restore `REVIEW_DIR` and `cachedSearchPath` in `engine/config/paths.ts`.
5. In `engine/server.ts`, add back the `/api/collection` routes (`GET` status, `POST` start, `DELETE` stop) and load `reviewService` on start.
6. In the UI, add back the collection API calls in `src/api.ts` and the collection query in `src/app.tsx`. Then add a Worker rate limit for `/api/collection`.

These files were written against the code at that commit. Expect small differences: for example, uploads now take a category, and `datasetService` no longer has `isCategoryFull`.
