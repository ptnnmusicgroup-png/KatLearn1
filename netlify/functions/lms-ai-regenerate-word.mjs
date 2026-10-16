import apiHandler from "../../api/ai-regenerate-word.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/ai-regenerate-word" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
