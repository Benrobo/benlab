# Packaging Waste Dataset

Collects casual photos of packaging waste in Nigeria for data annotation, sorted into three categories:

| Category        | What counts                                                |
| --------------- | ---------------------------------------------------------- |
| `water-bottle`  | Plastic water or soft drink bottles                        |
| `sachet-water`  | Pure water sachets                                         |
| `packaged-food` | Food wrappers and packs (Indomie nylons, biscuits, snacks) |

The goal is 1000 photos (334 per category). A photo is kept only if it shows one dominant item (at most 4) of a single category. It must be not in use, attached to anything or for sale, have no people in it, and not be an ad, a product shot or a design.

Live at https://packaging-waste-dataset.benlab.space

## How it works

- **Collection**: each category runs as its own background job (`engine/jobs`). A job searches Bing and Brave images, downloads each result and skips duplicates, then asks a vision model on OpenRouter to classify it. Accepted photos are saved to R2.
- **Uploads**: you upload 1–5 photos (max 5 MB each) from the UI. The browser shrinks them first. Each photo goes to `tmp/` in R2 while it's classified, then it's moved to `images/<category>/` or deleted. Collection pauses while uploads are being checked.
- **Classification**: `engine/services/ai/classifier.service.ts` returns `{ category, confidence, reason }`. Photos with a category and confidence of at least 0.7 are kept. The model is set in `engine/services/ai/models.ts`.
- **Storage**: the R2 bucket `packaging-waste-dataset` holds `images/<category>/<id>.jpg` and `manifest.json`. The manifest is re-read every 3 seconds and saved with conditional writes, so local and production engines can share the bucket safely.
- **Review**: every photo the collector checks locally is linked into `review/<model>/<category>/<result>/` and logged in `review/log.jsonl`, for checking what the classifier accepts and rejects.

## Run locally

```sh
bun install
cp .env.example .env
bun dev
```

The UI runs on http://localhost:5199 and the engine on port 5200.

## Environment

| Variable               | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `OPENROUTER_API_KEY`   | Classification                               |
| `MCP_TOKEN`            | Access token for the MCP server              |
| `BRAVE_SEARCH_API_KEY` | Brave image search (optional)                |
| `R2_ACCESS_KEY_ID`     | R2 credentials                               |
| `R2_SECRET_ACCESS_KEY` | R2 credentials                               |
| `R2_ENDPOINT`          | `https://<account>.r2.cloudflarestorage.com` |
| `R2_BUCKET`            | `packaging-waste-dataset`                    |
| `R2_PUBLIC_URL`        | Public URL of the bucket                     |

## Deploy

```sh
bun run deploy
```

The UI is served as Worker static assets. `/api/*` goes to the engine, which runs in a Cloudflare Container (`worker/index.ts`, `Dockerfile`). Secrets are set with `wrangler secret bulk`.

## API

| Method   | Path                         | Purpose                         |
| -------- | ---------------------------- | ------------------------------- |
| `GET`    | `/api/photos`                | Kept photos                     |
| `DELETE` | `/api/photos/:id`            | Remove a photo                  |
| `GET`    | `/api/collection`            | Collection status per category  |
| `POST`   | `/api/collection`            | Start collecting                |
| `DELETE` | `/api/collection`            | Stop collecting                 |
| `POST`   | `/api/uploads`               | Upload and classify 1–5 photos  |
| `GET`    | `/api/download?category=all` | Zip of photos with `labels.csv` |
| `POST`   | `/api/mcp`                   | MCP server for AI agents        |

## AI agents (MCP)

AI agents like Claude or ChatGPT can collect photos themselves through the MCP server at `/api/mcp`. The agent does the searching and judging with its own vision. It gets the exact prompt our classifier uses, but our classifier never checks what it adds.

| Tool             | Purpose                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `get_guidelines` | What the dataset is for, the categories and the rules             |
| `get_progress`   | Photos saved and still needed per category                        |
| `list_photos`    | Photos already in the dataset                                     |
| `view_image`     | See an image by URL, base64 or photo id, and check for duplicates |
| `add_photo`      | Add a photo with its category and a reason                        |
| `remove_photo`   | Remove a photo that breaks the rules                              |

Every request needs the `MCP_TOKEN`, sent as `Authorization: Bearer <token>` or as `?token=<token>` for apps that only take a URL. The robot button in the UI shows how to connect Claude, ChatGPT, Claude Code and other MCP clients.

## Structure

```
config.ts                 categories, goal, upload limits
engine/
  server.ts               routes
  mcp.ts                  MCP server and tools for AI agents
  jobs/                   background jobs, one per category
  services/               collector, upload, dataset, search, image, review
  services/ai/            classifier and models
  config/                 env, R2, paths
src/                      React UI
worker/index.ts           Cloudflare Worker and container
```
