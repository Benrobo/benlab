import { uploadLimit } from "../config";
import env from "./config/env";
import { handleMcpRequest } from "./mcp";
import { categoryService } from "./services/category.service";
import { collectionService } from "./services/collection.service";
import { datasetService } from "./services/dataset.service";
import { reviewService } from "./services/review.service";
import { uploadService } from "./services/upload.service";
import { createLogger } from "./lib/logger";

const logger = createLogger("engine");

export async function startEngine() {
  await Promise.all([categoryService.load(), datasetService.load(), reviewService.load()]);

  Bun.serve({
    port: env.PORT,
    idleTimeout: 255,
    error: (error) => {
      logger.error("Request failed", error);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    },
    routes: {
      "/api/categories": {
        GET: () => Response.json(categoryService.list()),
        POST: async (request) => {
          const { label = "", description = "", subjects } = await request.json();
          if (typeof label !== "string" || typeof description !== "string" || !description.trim()) {
            return Response.json(
              { error: "Give the category a name and a description" },
              { status: 400 }
            );
          }
          const { category, problem } = await categoryService.add({ label, description, subjects });
          if (problem) return Response.json({ error: problem }, { status: 400 });
          return Response.json(category);
        },
      },

      "/api/photos": {
        GET: async () => Response.json(await datasetService.list()),
      },

      "/api/photos/:id": {
        DELETE: async (request) => {
          const removed = await datasetService.remove(request.params.id);
          if (!removed)
            return Response.json({ error: "This photo is already gone" }, { status: 404 });
          return Response.json({ removed });
        },
      },

      "/api/collection": {
        GET: () => Response.json(collectionService.status()),
        POST: () => {
          collectionService.start();
          return Response.json(collectionService.status());
        },
        DELETE: () => {
          collectionService.stop();
          return Response.json(collectionService.status());
        },
      },

      "/api/uploads": {
        POST: async (request) => {
          const form = await request.formData();
          const files = form.getAll("files").filter((file): file is File => file instanceof File);
          if (!files.length || files.length > uploadLimit.files) {
            return Response.json(
              { error: `Send between 1 and ${uploadLimit.files} photos` },
              { status: 400 }
            );
          }
          return Response.json(await Promise.all(files.map((file) => uploadService.upload(file))));
        },
      },

      "/api/mcp": {
        POST: (request) => handleMcpRequest(request),
        GET: () => new Response(null, { status: 405, headers: { allow: "POST" } }),
        DELETE: () => new Response(null, { status: 405, headers: { allow: "POST" } }),
      },

      "/api/download": {
        GET: async (request) => {
          const category = new URL(request.url).searchParams.get("category") ?? "all";
          if (category !== "all" && !categoryService.find(category)) {
            return Response.json({ error: "Unknown category" }, { status: 400 });
          }
          return new Response(await datasetService.zip(category), {
            headers: {
              "content-type": "application/zip",
              "content-disposition": 'attachment; filename="packaging-waste-dataset.zip"',
            },
          });
        },
      },
    },
  });

  logger.info(
    `Running on http://localhost:${env.PORT} with ${(await datasetService.list()).length} photos`
  );
}
