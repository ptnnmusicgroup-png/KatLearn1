import apiHandler from "../../api/study-coach.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/study-coach" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
