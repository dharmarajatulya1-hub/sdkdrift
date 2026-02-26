import { StripeResource } from "../StripeResource";

const stripeMethod = StripeResource.method;

export const OAuth = StripeResource.extend({
  basePath: "/",

  authorizeUrl(
    params: { response_type?: "code"; client_id?: string },
    options: { express?: boolean }
  ) {
    const path = options?.express ? "express/oauth/authorize" : "oauth/authorize";
    return `https://connect.stripe.com/${path}?client_id=${params?.client_id ?? ""}`;
  },

  token: stripeMethod({
    method: "POST",
    path: "oauth/token",
    host: "connect.stripe.com"
  }),

  deauthorize(spec: { client_id?: string }, ...args: unknown[]) {
    return stripeMethod({
      method: "POST",
      path: "oauth/deauthorize",
      host: "connect.stripe.com"
    }).apply(this, [spec, ...args]);
  }
});
