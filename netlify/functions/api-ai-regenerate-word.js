"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/ai-regenerate-word.js");
exports.handler = createHandler(handler);
