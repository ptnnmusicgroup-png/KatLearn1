"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/personal-pack-action.js");
exports.handler = createHandler(handler);
