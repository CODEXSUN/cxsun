import sanitizeHtml from "sanitize-html";

const options: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "blockquote", "code", "pre"],
  allowedAttributes: {},
  allowedSchemes: []
};

export function sanitizeCommentHtml(value: string) {
  return sanitizeHtml(value, options).trim();
}

export function commentPlainText(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
