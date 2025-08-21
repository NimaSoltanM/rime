/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as files from "../files.js";
import type * as invitations from "../invitations.js";
import type * as members from "../members.js";
import type * as messages from "../messages.js";
import type * as organizations from "../organizations.js";
import type * as schemas_auth from "../schemas/auth.js";
import type * as schemas_files from "../schemas/files.js";
import type * as schemas_invitations from "../schemas/invitations.js";
import type * as schemas_messages from "../schemas/messages.js";
import type * as schemas_organizations from "../schemas/organizations.js";
import type * as schemas_workspaces from "../schemas/workspaces.js";
import type * as utils from "../utils.js";
import type * as workspaces from "../workspaces.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  files: typeof files;
  invitations: typeof invitations;
  members: typeof members;
  messages: typeof messages;
  organizations: typeof organizations;
  "schemas/auth": typeof schemas_auth;
  "schemas/files": typeof schemas_files;
  "schemas/invitations": typeof schemas_invitations;
  "schemas/messages": typeof schemas_messages;
  "schemas/organizations": typeof schemas_organizations;
  "schemas/workspaces": typeof schemas_workspaces;
  utils: typeof utils;
  workspaces: typeof workspaces;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
