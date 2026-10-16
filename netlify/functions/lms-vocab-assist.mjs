import apiHandler from "../../api/vocab-assist.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/vocab-assist" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
