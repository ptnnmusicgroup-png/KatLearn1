import apiHandler from "../../api/admin-hub.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/admin-hub" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
