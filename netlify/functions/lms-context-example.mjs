import apiHandler from "../../api/context-example.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/context-example" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
