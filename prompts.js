/**
 * prompts.js
 *
 * Centralized meditation prompt pool for uboth.
 * getTodayPrompt() returns the same prompt for all couples on a given calendar
 * date — creating a gentle sense of shared community without any social layer.
 *
 * Pool size: 41 prompts → repeats every ~41 days.
 */

const PROMPTS = [
  // Presence
  'Breathe together. Stay present.',
  'Presence is a choice. Choose it now.',
  'Notice where you touch. Stay here.',
  'Arrive fully. You\'re here now.',
  'Come back to your breath. Come back to each other.',

  // Body & ground
  'Root down together. Feel the ground beneath you both.',
  'Breathe in sync. Let your rhythms meet.',
  'Feel your weight. Let it drop.',
  'Let your shoulders drop.',
  'Soften your face. Soften everything.',

  // Release
  'Let go of what you\'re holding. Breathe it out.',
  'Open to each other. Soften what\'s hard.',
  'Release the day. It can wait.',
  'Set down what you\'ve been carrying.',
  'You don\'t have to fix anything right now.',

  // Gratitude
  'Gratitude lives in the small things. Find one.',
  'You are here. That is enough.',
  'This moment is a gift. Receive it.',
  'Notice what\'s good right now.',
  'You chose each other. Remember why.',

  // Connection
  'Two breaths, one rhythm.',
  'Feel the warmth between you.',
  'This is what care looks like.',
  'Be held. Let yourself be held.',
  'Two hearts, synchronizing slowly.',

  // Stillness
  'Quiet the noise. Find the stillness together.',
  'Five minutes. Just this.',
  'Nothing is needed. Only presence.',
  'Rest in the space between thoughts.',
  'No rush. No end goal. Just now.',

  // Softness
  'Breathe into the warmth between you.',
  'Be gentle with yourselves today.',
  'Stillness is not empty. It\'s full.',
  'Honor the pause. It matters.',

  // Time of day / season
  'Morning light or evening dark — you\'re here.',
  'Whatever today held, this moment is yours.',
  'After everything, there is still this.',
  'Let the day\'s noise fade. Find the quiet core.',

  // Depth
  'Just two people. Just breath. That\'s everything.',
  'The breath connects what words cannot.',
  'Returning to each other, again and again.',
];

/**
 * Returns today's prompt — consistent for all users on the same calendar date.
 * Uses day-of-year so the prompt rotates daily and the same couple always
 * sees the same prompt when they open the app on a given day.
 */
export function getTodayPrompt() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return PROMPTS[dayOfYear % PROMPTS.length];
}
