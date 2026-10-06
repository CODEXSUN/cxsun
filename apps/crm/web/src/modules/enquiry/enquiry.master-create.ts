import { useQueryClient } from "@tanstack/react-query";
import { createListIn, listInQueryKey } from "../list-in/index";
import { createPriority, priorityQueryKey } from "../priority/index";
import { createStatus, statusQueryKey } from "../status/index";
import { prioritySwatch, statusIcon } from "../../crm-colors";

export function useEnquiryMasterCreate() {
  const client = useQueryClient();
  return {
    listIn: async (name: string) => {
      const record = await createListIn({ name, sortOrder: 1000 });
      await client.invalidateQueries({ queryKey: listInQueryKey });
      return { label: record.name, value: String(record.id) };
    },
    status: async (name: string) => {
      const record = await createStatus({ name, sortOrder: 1000 });
      await client.invalidateQueries({ queryKey: statusQueryKey });
      return {
        label: record.name,
        value: String(record.id),
        leadingIcon: statusIcon(record.code)
      };
    },
    priority: async (name: string) => {
      const record = await createPriority({ name, sortOrder: 1000 });
      await client.invalidateQueries({ queryKey: priorityQueryKey });
      return {
        label: record.name,
        value: String(record.id),
        swatchClassName: prioritySwatch(record.code)
      };
    }
  };
}
