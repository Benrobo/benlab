import { uploadLimit } from "../config";
import env from "./config/env";
import { isAdminToken } from "./lib/admin";
import { handleMcpRequest } from "./mcp";
import { categoryService } from "./services/category.service";
import { datasetService } from "./services/dataset.service";
import { uploadService } from "./services/upload.service";
import { createLogger } from "./lib/logger";

const logger = createLogger("engine");

const isAdmin = (request: Request) =>
  isAdminToken(request.headers.get("authorization")?.replace(/^Bearer /, ""));

const notAdmin = () => Response.json({ error: "Wrong admin token" }, { status: 401 });

const mcpRoute = {
  POST: (request: Request) => handleMcpRequest(request),
  GET: () => new Response(null, { status: 405, headers: { allow: "POST" } }),
  DELETE: () => new Response(null, { status: 405, headers: { allow: "POST" } }),
};

export async function startEngine() {
  await Promise.all([categoryService.load(), datasetService.load()]);

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
          if (!isAdmin(request)) return notAdmin();
          const { label = "", description = "", subjects = [] } = await request.json();
          const isList =
            Array.isArray(subjects) && subjects.every((item) => typeof item === "string");
          if (typeof label !== "string" || typeof description !== "string" || !isList) {
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

      "/api/categories/:id": {
        PATCH: async (request) => {
          if (!isAdmin(request)) return notAdmin();
          const { archived, label, description, subjects } = await request.json();
          if (archived !== undefined) {
            if (typeof archived !== "boolean") {
              return Response.json({ error: "Send archived as true or false" }, { status: 400 });
            }
            const category = await categoryService.setArchived(request.params.id, archived);
            if (!category) return Response.json({ error: "No such category" }, { status: 404 });
            return Response.json(category);
          }
          const isText = (value: unknown) => value === undefined || typeof value === "string";
          const isList =
            Array.isArray(subjects) && subjects.every((item) => typeof item === "string");
          if (!isText(label) || !isText(description) || (subjects !== undefined && !isList)) {
            return Response.json(
              { error: "Send text for the name, description and search terms" },
              { status: 400 }
            );
          }
          const { category, problem } = await categoryService.edit(request.params.id, {
            label,
            description,
            subjects,
          });
          if (problem) return Response.json({ error: problem }, { status: 400 });
          return Response.json(category);
        },
      },

      "/api/photos": {
        GET: async () => Response.json(await datasetService.list()),
      },

      "/api/photos/:id": {
        DELETE: async (request) => {
          if (!isAdmin(request)) return notAdmin();
          const removed = await datasetService.remove(request.params.id);
          if (!removed)
            return Response.json({ error: "This photo is already gone" }, { status: 404 });
          return Response.json({ removed });
        },
      },

      "/api/uploads": {
        POST: async (request) => {
          const form = await request.formData();
          const files = form.getAll("files").filter((file): file is File => file instanceof File);
          const category = String(form.get("category") ?? "");
          if (!files.length || files.length > uploadLimit.files) {
            return Response.json(
              { error: `Send between 1 and ${uploadLimit.files} photos` },
              { status: 400 }
            );
          }
          return Response.json(
            await Promise.all(files.map((file) => uploadService.upload(file, category)))
          );
        },
      },

      "/mcp": mcpRoute,
      "/api/mcp": mcpRoute,

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
