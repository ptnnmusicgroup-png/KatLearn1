import apiHandler from "../../api/study-progress.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/study-progress" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
