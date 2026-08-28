/** Fetch-compatible function used for GitHub API requests. */
export type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;
