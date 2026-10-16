import apiHandler from "../../api/student-assigned-packs.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/student-assigned-packs" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
