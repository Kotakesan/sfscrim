"use client";

// Better Auth クライアント（React フック付き）。Header の avatar dropdown / Logout / Login で使う。
// Cookie ベースの session なので baseURL は同オリジンで OK。

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { useSession, signOut } = authClient;
