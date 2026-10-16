import apiHandler from "../../api/student-school-request.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/student-school-request" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
