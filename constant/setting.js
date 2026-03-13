// Default project task settings
export const DEFAULT_SETTINGS = {
  textSplitMinLength: 2500,
  textSplitMaxLength: 4000,
  questionGenerationLength: 240,
  questionMaskRemovingProbability: 60,
  huggingfaceToken: '',
  concurrencyLimit: 5,
  visionConcurrencyLimit: 5,
  multiTurnSystemPrompt: '',
  multiTurnScenario: '',
  multiTurnRounds: 2,
  multiTurnRoleA: '',
  multiTurnRoleB: '',
  imageMultiTurnFirstQuestion: '',
  imageMultiTurnFollowUpQuestion: '',
  imageMultiTurnAutoFollowUp: true,
  evalQuestionTypeRatios: {
    true_false: 1,
    single_choice: 1,
    multiple_choice: 1,
    short_answer: 1,
    open_ended: 1
  }
};
