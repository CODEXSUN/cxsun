import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerEnquiryRoutes, type EnquiryRequestContext } from "./enquiry.routes.js";

export const enquiryModule = {
  key: "crm.enquiry",
  register: (
    app: FastifyInstance,
    context: (request: FastifyRequest) => Promise<EnquiryRequestContext>
  ) => registerEnquiryRoutes(app, context)
};
