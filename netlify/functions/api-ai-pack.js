"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/ai-pack.js");
exports.handler = createHandler(handler);
