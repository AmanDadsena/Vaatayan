/**
 * Plans for a household. The rules planner works without AI; the merge takes
 * a model's wording but keeps every number from the deterministic model.
 */
export * from "./plans/core";
export { mergeModelPlan } from "./plans/merge";
export { buildRulePlan } from "./plans/rules";
