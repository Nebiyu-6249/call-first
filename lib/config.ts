// Product-wide settings. Change the product name here and nowhere else.

export const APP_NAME = "Second Look";

export const APP_TAGLINE = "A calm second opinion on messages and calls that worry you.";

// Used when a circle has not set its own emergency number.
export const DEFAULT_EMERGENCY_NUMBER = "999";

export const DISCLAIMER =
  `${APP_NAME} gives a second opinion, not a guarantee.`;

export function emergencyLine(emergencyNumber: string = DEFAULT_EMERGENCY_NUMBER): string {
  return `${DISCLAIMER} In an emergency, call ${emergencyNumber}.`;
}
