import { categories, uploadLimit } from "../config";
import env from "./config/env";
import { handleMcpRequest } from "./mcp";
import { collectionService } from "./services/collection.service";
import { datasetService } from "./services/dataset.service";
import { reviewService } from "./services/review.service";
import { uploadService } from "./services/upload.service";
import { createLogger } from "./lib/logger";

const logger = createLogger("engine");

const downloadableCategories = new Set(["all", ...categories.map(({ id }) => id)]);

export async function startEngine() {
  await Promise.all([datasetService.load(), reviewService.load()]);

  Bun.serve({
    port: env.PORT,
    idleTimeout: 255,
    error: (error) => {
      logger.error("Request failed", error);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    },
    routes: {
      "/api/photos": {
        GET: async () => Response.json(await datasetService.list()),
      },

      "/api/photos/:id": {
        DELETE: async (request) => {
          const removed = await datasetService.remove(request.params.id);
          return Response.json({ removed }, { status: removed ? 200 : 404 });
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

      "/api/mcp": (request) => handleMcpRequest(request),

      "/api/download": {
        GET: async (request) => {
          const category = new URL(request.url).searchParams.get("category") ?? "all";
          if (!downloadableCategories.has(category)) {
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
