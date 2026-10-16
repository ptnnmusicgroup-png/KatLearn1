import { createRequire } from "node:module";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

const require = createRequire(import.meta.url);
const apiHandler = require("../../api/personal-packs.js");

export const config = { path: "/api/personal-packs" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
