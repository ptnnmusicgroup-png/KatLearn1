"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/game-action.js");
exports.handler = createHandler(handler);
