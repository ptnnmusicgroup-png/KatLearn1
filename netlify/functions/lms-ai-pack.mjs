import apiHandler from "../../api/ai-pack.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/ai-pack" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
