/** Shared GraphQL endpoint for hotcol-ats (Candidate + Admin). Default port 4006. */
export function atsGraphqlUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_ATS_GRAPHQL_URL ||
    process.env.NEXT_PUBLIC_GRAPHQL_URL ||
    "https://hotcol-ats-backend.vercel.app/graphql";
  return raw.replace(/\/+$/, "").replace(/\/graphql$/i, "") + "/graphql";
}
