import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CornerUpLeft, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceMinimalEditor } from "@cxsun/ui/workspace/minimal-editor";
import { createEnquiryComment } from "./enquiry.services";
import { enquiryActivityQueryKey, enquiryCommentsQueryKey } from "./enquiry.hooks";
import { formatDateTime } from "./enquiry.view-utils";
import type { EnquiryComment } from "./enquiry.types";

export function EnquiryComments({
  enquiryId,
  comments,
  loading
}: {
  enquiryId: number;
  comments: EnquiryComment[];
  loading: boolean;
}) {
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const save = useMutation({
    mutationFn: (parentId: number | null) =>
      createEnquiryComment(enquiryId, body, parentId, "html"),
    onSuccess: async () => {
      setBody("");
      setReplyTo(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: enquiryCommentsQueryKey(enquiryId) }),
        client.invalidateQueries({ queryKey: enquiryActivityQueryKey(enquiryId) })
      ]);
      toast.success("Comment added");
    },
    onError: (error) => toast.error("Unable to add comment", { description: error.message })
  });
  const topLevel = comments.filter((comment) => comment.parentId === null);
  const target = topLevel.find((comment) => comment.id === replyTo) ?? topLevel.at(-1);
  const canSave = hasText(body) && !save.isPending;

  return (
    <section className="flex min-h-[34rem] flex-col bg-card">
      <div className="border-b border-border/70 px-4 py-2 text-xs text-muted-foreground">
        {topLevel.length} {topLevel.length === 1 ? "comment" : "comments"} ·{" "}
        {comments.length - topLevel.length}{" "}
        {comments.length - topLevel.length === 1 ? "reply" : "replies"}
      </div>
      <div className="min-h-0 flex-1 px-4 py-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading comments…</p> : null}
        {!loading && comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : null}
        {comments.map((comment) => (
          <article
            key={comment.id}
            className={`border-b border-border/60 py-3 last:border-b-0 ${comment.parentId ? "ml-8 border-l-2 pl-3" : ""}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full border border-border p-1.5 text-muted-foreground">
                {comment.parentId ? (
                  <CornerUpLeft className="size-3" />
                ) : (
                  <MessageSquare className="size-3" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                {comment.bodyFormat === "html" ? (
                  <div
                    className="prose prose-sm max-w-none break-words rounded-md bg-muted/25 px-3 py-2 text-sm [&_p]:my-0 [&_p+p]:mt-2"
                    dangerouslySetInnerHTML={{ __html: comment.body }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words rounded-md bg-muted/25 px-3 py-2 text-sm">
                    {comment.body}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {comment.createdBy} · {formatDateTime(comment.createdAt)}
                  </span>
                  {!comment.parentId ? (
                    <button
                      className="cursor-pointer text-primary hover:underline"
                      type="button"
                      onClick={() => setReplyTo(comment.id)}
                    >
                      Reply
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="border-t border-border/70 bg-card p-3">
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Replying to comment #{replyTo}</span>
            <button
              className="cursor-pointer text-primary hover:underline"
              type="button"
              onClick={() => setReplyTo(null)}
            >
              Cancel reply
            </button>
          </div>
        ) : null}
        <WorkspaceMinimalEditor
          className="[&_.tiptap]:min-h-24"
          content={body}
          placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
          onChange={setBody}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button disabled={!canSave} size="sm" type="button" onClick={() => save.mutate(null)}>
            <Send className="size-4" /> Comment
          </Button>
          <Button
            disabled={!canSave || !target}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => save.mutate(target?.id ?? null)}
          >
            <CornerUpLeft className="size-4" /> Reply
          </Button>
        </div>
      </div>
    </section>
  );
}

function hasText(html: string) {
  if (!html) return false;
  return Boolean(new DOMParser().parseFromString(html, "text/html").body.textContent?.trim());
}
