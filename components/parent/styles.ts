// Shared class names for parent screens: buttons are full width and at least 64px tall.

const big =
  "flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-center text-xl font-bold";

export const primaryButton = `${big} bg-primary text-primary-foreground hover:bg-primary-hover`;

export const secondaryButton = `${big} border-4 border-primary bg-surface text-primary hover:bg-background`;

export const textLink = "inline-flex min-h-12 items-center gap-2 text-lg font-bold text-primary underline underline-offset-4";
