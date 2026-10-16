import apiHandler from "../../api/personal-pack.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/personal-pack" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
