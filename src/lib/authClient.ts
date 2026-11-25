"use client";

import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Better Auth in the browser: starts sign-in, reads and ends the session (cookie-based). */
export const authClient = createAuthClient({ plugins: [magicLinkClient()] });
