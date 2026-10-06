import { AppError } from "@cxsun/framework/errors";
import sanitizeHtml from "sanitize-html";
import { IdeasRepository } from "./ideas.repository.js";
import type { IdeaSavePayload } from "./ideas.types.js";

export class IdeasService {
  constructor(private readonly repository = new IdeasRepository()) {}

  list() {
    return this.repository.list();
  }

  async get(uuid: string) {
    const idea = await this.repository.find(uuid);
    if (!idea) throw AppError.notFound("Idea was not found.");
    return idea;
  }

  create(input: IdeaSavePayload, actorEmail: string) {
    return this.repository.create(normalize(input), actorEmail);
  }

  async update(uuid: string, input: IdeaSavePayload, actorEmail: string) {
    const idea = await this.repository.update(uuid, normalize(input), actorEmail);
    if (!idea) throw AppError.notFound("Idea was not found.");
    return idea;
  }

  async archive(uuid: string, actorEmail: string) {
    const idea = await this.repository.archive(uuid, actorEmail);
    if (!idea) throw AppError.notFound("Idea was not found.");
    return idea;
  }
}

function normalize(input: IdeaSavePayload): IdeaSavePayload {
  return {
    ...input,
    assignee: input.assignee.trim(),
    content: sanitizeHtml(input.content, {
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["style"],
        img: ["src", "alt", "title"]
      },
      allowedSchemesByTag: { img: ["http", "https", "data"] },
      allowedStyles: {
        "*": {
          "background-color": [/^#[0-9a-f]{3,8}$/iu],
          color: [/^#[0-9a-f]{3,8}$/iu],
          "text-align": [/^(left|center|right|justify)$/u]
        }
      },
      allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "mark", "s", "span", "u"],
      exclusiveFilter: (frame) =>
        frame.tag === "img" &&
        Boolean(
          frame.attribs.src?.startsWith("data:") &&
          !/^data:image\/(png|jpeg|gif|webp);base64,/iu.test(frame.attribs.src)
        )
    }),
    title: input.title.trim()
  };
}
