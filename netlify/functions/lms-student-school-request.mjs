import { createRequire } from "node:module";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

const require = createRequire(import.meta.url);
const apiHandler = require("../../api/student-school-request.js");

export const config = { path: "/api/student-school-request" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
