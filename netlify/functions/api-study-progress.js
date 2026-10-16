"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/study-progress.js");
exports.handler = createHandler(handler);
