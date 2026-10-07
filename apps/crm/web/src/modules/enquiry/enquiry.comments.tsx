import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CornerUpLeft, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceMinimalEditor } from "@cxsun/ui/workspace/minimal-editor";
import { createEnquiryComment } from "./enquiry.services";
import { enquiryActivityQueryKey, enquiryCommentsQueryKey } from "./enquiry.hooks";
import { formatCommentByline } from "./enquiry.view-utils";
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
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
  const latestCommentId = topLevel.at(-1)?.id ?? null;
  const activeReplyTo = replyTo === latestCommentId ? replyTo : null;
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
                <div className="mt-1 flex flex-wrap items-center justify-end gap-4 text-xs text-muted-foreground">
                  {comment.id === latestCommentId ? (
                    <Button
                      className="mr-auto h-7 px-2.5 text-xs"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setReplyTo(comment.id)}
                    >
                      Reply
                    </Button>
                  ) : null}
                  <span className="text-right">
                    {formatCommentByline(comment.createdBy, comment.createdAt, now)}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="border-t border-border/70 bg-card p-3">
        {activeReplyTo ? (
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Replying to comment #{activeReplyTo}</span>
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
          placeholder={activeReplyTo ? "Write a reply…" : "Write a comment…"}
          onChange={setBody}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button
            disabled={!canSave}
            size="sm"
            type="button"
            onClick={() => save.mutate(activeReplyTo)}
          >
            {activeReplyTo ? <CornerUpLeft className="size-4" /> : <Send className="size-4" />}
            {activeReplyTo ? "Reply" : "Comment"}
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
