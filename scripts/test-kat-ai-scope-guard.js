"use strict";
const assert=require("node:assert/strict");
const {classifyKatAIRequest,OFF_SCOPE_MESSAGE,UNSAFE_MESSAGE}=require("../api/_kat-ai-scope-guard");

const cases=[
  [{focus:"Giải phương trình 2x + 5 = 15"},false,"off_topic"],
  [{focus:"Solve 2x + 5 = 15"},false,"off_topic"],
  [{focus:"Hãy giải bài tập Toán này"},false,"off_topic"],
  [{focus:"Explain photosynthesis"},false,"off_topic"],
  [{focus:"Translate this math problem into English"},true,"english_learning"],
  [{focus:"What does the word 'equation' mean in English?"},true,"english_learning"],
  [{focus:"Explain the difference between affect and effect"},true,"english_learning"],
  [{focus:"Write an insult in English"},false,"unsafe"],
  [{focus:"What does the English word 'idiot' mean?"},true,"english_learning"]
];

for(const [input,allowed,category] of cases){
  const result=classifyKatAIRequest(input);
  assert.equal(result.allowed,allowed,JSON.stringify(input));
  assert.equal(result.category,category,JSON.stringify(input));
}
assert.equal(classifyKatAIRequest({focus:"Giải phương trình x + 1 = 2"}).message,OFF_SCOPE_MESSAGE);
assert.equal(classifyKatAIRequest({focus:"Write an insult in English"}).message,UNSAFE_MESSAGE);
console.log("KatAI scope guard tests passed:",cases.length,"cases");
