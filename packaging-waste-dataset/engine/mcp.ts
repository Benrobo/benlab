import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { places } from "../config";
import { classificationPrompt } from "./services/ai/classifier.service";
import { agentService } from "./services/agent.service";
import { categoryService } from "./services/category.service";
import { datasetService } from "./services/dataset.service";

const createGuidelines = () => {
  const categories = categoryService.list();
  const searchExamples = categories
    .map(({ subjects }) => `"${subjects[0]} ${places[1]}"`)
    .join(", ");
  return `# Packaging waste dataset

You are collecting photos of packaging waste in Nigeria for a data annotation dataset. There is no limit, so add as many good photos as you can find for each of the ${categories.length} categories, starting with the ones that have the fewest. You are the judge: find photos on the internet with your own search tools, look at each one with your own vision, and only add photos that follow every rule. Nothing checks your choices after you add them, so be strict.

## How to judge a photo
Judge every photo exactly the way our own classifier does. This is its prompt:

${classificationPrompt()}

## How to work
1. Call get_progress to see how many photos each category has.
2. Search the web for real photos taken in Nigeria, for example ${searchExamples}. Try places like ${places.filter(Boolean).join(", ")}. News articles, blogs, forums and social posts are better sources than stock photo sites, shops or product pages.
3. Call view_image on a candidate to see it and check it isn't already in the dataset.
4. Call add_photo with the direct image URL (or base64 data), the category and a short reason. Add the page the image came from as pageUrl when you have it.
5. Use list_photos and view_image with a photoId to review saved photos, and remove_photo for any that break the rules.

Images must be at least 320px on the shortest side and not transparent or SVG. Duplicates and near duplicates are rejected. If a kind of packaging waste is missing, add_category creates a new category.`;
};

function createServer() {
  const guidelines = createGuidelines();
  const categoryIds = categoryService.ids() as [string, ...string[]];
  const server = new McpServer(
    { name: "packaging-waste-dataset", version: "1.0.0" },
    { instructions: guidelines }
  );
  const answer = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  });

  server.registerTool(
    "get_guidelines",
    {
      description:
        "What the dataset is for, the categories, and the rules every photo must follow.",
      annotations: { readOnlyHint: true },
    },
    () => ({ content: [{ type: "text", text: guidelines }] })
  );

  server.registerTool(
    "get_progress",
    {
      description: "How many photos each category has and how many it still needs.",
      annotations: { readOnlyHint: true },
    },
    async () => answer(await agentService.progress())
  );

  server.registerTool(
    "list_photos",
    {
      description: "List photos already in the dataset, newest first.",
      inputSchema: {
        category: z.enum(categoryIds).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ category, limit, offset }) => {
      const photos = (await datasetService.list())
        .filter((photo) => !category || photo.category === category)
        .reverse();
      return answer({
        total: photos.length,
        photos: photos
          .slice(offset, offset + limit)
          .map(({ id, category, imageUrl, url, page, source, reason }) => ({
            id,
            category,
            imageUrl,
            from: page ?? url,
            source,
            reason,
          })),
      });
    }
  );

  server.registerTool(
    "view_image",
    {
      description:
        "See an image from a URL, from base64 data or from the dataset by photoId. Also says whether it is already in the dataset.",
      inputSchema: {
        imageUrl: z.string().url().optional(),
        imageBase64: z.string().optional(),
        pageUrl: z.string().url().optional().describe("The page the image is on"),
        photoId: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (source) => {
      const { image, problem, ...details } = await agentService.viewImage(source);
      if (!image) return { ...answer({ problem }), isError: true };
      return {
        content: [
          { type: "image", data: image.toString("base64"), mimeType: "image/jpeg" },
          { type: "text", text: JSON.stringify(details) },
        ],
      };
    }
  );

  server.registerTool(
    "add_photo",
    {
      description:
        "Add a photo to the dataset. Only add photos you have looked at that follow every rule in the guidelines. Send imageUrl or imageBase64.",
      inputSchema: {
        category: z.enum(categoryIds),
        reason: z.string().min(3).describe("Why this photo fits, in a short sentence"),
        imageUrl: z.string().url().optional().describe("Direct link to the image file"),
        imageBase64: z.string().optional(),
        pageUrl: z.string().url().optional().describe("The page the image is on"),
      },
    },
    async (photo) => {
      if (!photo.imageUrl && !photo.imageBase64) {
        return {
          ...answer({ added: false, problem: "Send imageUrl or imageBase64" }),
          isError: true,
        };
      }
      const result = await agentService.addPhoto(photo);
      return { ...answer(result), isError: !result.added };
    }
  );

  server.registerTool(
    "add_category",
    {
      description:
        "Add a new category of packaging waste. Only add one when no existing category fits.",
      inputSchema: {
        label: z.string().min(2).describe("Short name, for example Soft drink cans"),
        description: z
          .string()
          .min(5)
          .describe("What counts, written like the existing category descriptions"),
        subjects: z
          .array(z.string())
          .optional()
          .describe("A few web search terms for finding photos of it"),
      },
    },
    async (newCategory) => {
      const result = await categoryService.add(newCategory);
      return { ...answer(result), isError: Boolean(result.problem) };
    }
  );

  server.registerTool(
    "remove_photo",
    {
      description: "Remove a photo from the dataset that breaks the rules.",
      inputSchema: { id: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const removed = await datasetService.remove(id);
      return { ...answer({ removed }), isError: !removed };
    }
  );

  return server;
}

export async function handleMcpRequest(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await createServer().connect(transport);
  return transport.handleRequest(request);
}
