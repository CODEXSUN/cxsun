import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveIdea, createIdea, listIdeas, updateIdea } from "./ideas.services";
import type { IdeaSavePayload } from "./ideas.types";

const queryKey = ["project-manager", "ideas"] as const;

export function useIdeasQuery() {
  return useQuery({ queryFn: listIdeas, queryKey });
}

export function useIdeasMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey });
  return {
    archive: useMutation({ mutationFn: archiveIdea, onSuccess: refresh }),
    create: useMutation({ mutationFn: createIdea, onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ input, uuid }: { input: IdeaSavePayload; uuid: string }) =>
        updateIdea(uuid, input),
      onSuccess: refresh
    })
  };
}
