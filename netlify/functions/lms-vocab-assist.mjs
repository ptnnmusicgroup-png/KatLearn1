import { createRequire } from "node:module";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

const require = createRequire(import.meta.url);
const apiHandler = require("../../api/vocab-assist.js");

export const config = { path: "/api/vocab-assist" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
