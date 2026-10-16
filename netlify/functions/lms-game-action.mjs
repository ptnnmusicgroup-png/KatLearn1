import apiHandler from "../../api/game-action.js";
import { invokeLegacyApi } from "../lib/legacy-api.mjs";

export const config = { path: "/api/game-action" };

export default function handler(request, context) {
  return invokeLegacyApi(request, context, apiHandler);
}
