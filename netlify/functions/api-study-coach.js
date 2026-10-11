"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/study-coach.js");
exports.handler = createHandler(handler);
