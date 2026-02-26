import { StripeResource } from "../StripeResource";

const stripeMethod = StripeResource.method;

export const Customers = StripeResource.extend({
  basePath: "/",
  constructor: function (..._args: unknown[]) {
    return undefined;
  },
  create: stripeMethod({ method: "POST", fullPath: "/v1/customers" }),
  retrieve: stripeMethod({ method: "GET", fullPath: "/v1/customers/{customer}" }),
  list: stripeMethod({ method: "GET", fullPath: "/v1/customers" }),
  del: stripeMethod({ method: "DELETE", fullPath: "/v1/customers/{customer}" })
});
