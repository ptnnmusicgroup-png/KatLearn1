import apiHandler from "../../api/personal-packs.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/personal-packs" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
