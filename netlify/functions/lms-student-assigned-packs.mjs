import { createRequire } from "node:module";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

const require = createRequire(import.meta.url);
const apiHandler = require("../../api/student-assigned-packs.js");

export const config = { path: "/api/student-assigned-packs" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
