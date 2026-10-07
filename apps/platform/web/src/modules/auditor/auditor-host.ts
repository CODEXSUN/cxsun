import { createAuditorClientGateway } from "@cxsun/auditor-web/modules/client/gateway";
import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";

export const auditorClientGateway = createAuditorClientGateway((path, options) => {
  if (options?.method === "POST") {
    return apiPost(path, JSON.parse(String(options.body)), "tenant");
  }
  if (options?.method === "PUT") {
    return apiPut(path, JSON.parse(String(options.body)), "tenant");
  }
  return apiGet(path, "tenant");
});
