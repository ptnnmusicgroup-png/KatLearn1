import apiHandler from "../../api/personal-pack-action.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/personal-pack-action" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
