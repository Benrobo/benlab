# Packaging Waste Dataset

Collects casual photos of packaging waste in Nigeria for data annotation, sorted into three categories:

| Category        | What counts                                                |
| --------------- | ---------------------------------------------------------- |
| `water-bottle`  | Plastic water or soft drink bottles                        |
| `sachet-water`  | Pure water sachets                                         |
| `packaged-food` | Food wrappers and packs (Indomie nylons, biscuits, snacks) |

There is no limit on how many photos the dataset or a category can have. A photo is kept only if it shows one dominant item (at most 4) of a single category. It must be not in use, attached to anything or for sale, have no people in it, and not be an ad, a product shot or a design.

Live at https://packaging-waste-dataset.benlab.space

## How it works

There is no AI in the system. Photos come from two places, and whoever adds a photo labels it:

- **Uploads**: people upload 1–5 photos (max 5 MB each) from the UI and pick the category they show. The browser shrinks them first, and the engine rejects unreadable photos and duplicates.
- **AI agents (MCP)**: agents like Claude or ChatGPT search the web, judge each photo with their own vision against the rules, and add it with a category. See below.
- **Storage**: Redis holds the categories and the photo list, with keys prefixed `packaging-waste-dataset:`. Images live in the R2 bucket `packaging-waste-dataset` under `images/<category>/<id>.jpg`.
- **Categories**: the Categories button adds a category with a name, a description of what counts, and search terms. The three defaults in `config.ts` are saved to Redis on first start.
- **Admin token**: deleting photos and archiving or restoring categories need `Authorization: Bearer <ADMIN_TOKEN>`. The UI asks for it once and saves it in the browser. MCP agents can add photos and add or edit categories, but can't archive or delete anything. Category text is checked for length, links, markup and line breaks, and agents get it as quoted data, never as instructions.
- **Rules**: the photo rules live in `config.ts` (`photoRules`) and are sent to agents in the MCP guidelines.

## Run locally

```sh
bun install
cp .env.example .env
docker run -d -p 6379:6379 redis:8-alpine
bun dev
```

The UI runs on http://localhost:5199 and the engine on port 5200.

## Environment

| Variable               | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `R2_ACCESS_KEY_ID`     | R2 credentials                                 |
| `R2_SECRET_ACCESS_KEY` | R2 credentials                                 |
| `R2_ENDPOINT`          | `https://<account>.r2.cloudflarestorage.com`   |
| `R2_BUCKET`            | `packaging-waste-dataset`                      |
| `R2_PUBLIC_URL`        | Public URL of the bucket                       |
| `REDIS_URL`            | Redis, defaults to `redis://localhost:6379`    |
| `ADMIN_TOKEN`          | Needed to delete photos and archive categories |

## Deploy

- **Engine**: a Dokploy application built from the `Dockerfile` in this folder, at https://packaging-waste-dataset.api.benlab.space. Redis is a separate Dokploy Redis service in the same project.
- **UI**: `bun run deploy` builds the UI and deploys it as a Cloudflare Worker with static assets. The Worker rate limits `/api/*` per IP and forwards it to the engine at `ENGINE_URL`. MCP goes straight to the engine.

## API

| Method   | Path                         | Purpose                           |
| -------- | ---------------------------- | --------------------------------- |
| `GET`    | `/api/photos`                | Kept photos                       |
| `DELETE` | `/api/photos/:id`            | Remove a photo                    |
| `POST`   | `/api/uploads`               | Upload 1–5 photos with a category |
| `GET`    | `/api/download?category=all` | Zip of photos with `labels.csv`   |
| `POST`   | `/mcp`                       | MCP server for AI agents          |

## AI agents (MCP)

AI agents like Claude or ChatGPT can collect photos themselves through the MCP server at `https://packaging-waste-dataset.api.benlab.space/mcp`. The agent does the searching and judging with its own vision. It gets the dataset rules in the guidelines, and nothing else checks what it adds.

| Tool             | Purpose                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `get_guidelines` | What the dataset is for, the categories and the rules             |
| `get_progress`   | Photos saved and still needed per category                        |
| `list_photos`    | Photos already in the dataset                                     |
| `view_image`     | See an image by URL, base64 or photo id, and check for duplicates |
| `add_photo`      | Add a photo with its category and a reason                        |
| `add_category`   | Add a category of packaging waste with search terms               |
| `edit_category`  | Improve a category's name, description or search terms            |

Connect with just that URL, no token needed. The robot button in the UI shows how to connect Claude, ChatGPT, Claude Code and other MCP clients.

## Structure

```
config.ts                 default categories, photo rules, upload limits, engine URL
engine/
  server.ts               routes
  mcp.ts                  MCP server and tools for AI agents
  services/               upload, agent, dataset, category, image
  config/                 env, R2, Redis, paths
src/                      React UI
worker/index.ts           Cloudflare Worker: UI, rate limits, proxy to the engine
```
