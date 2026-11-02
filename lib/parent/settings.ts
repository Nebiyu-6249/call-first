// Settings the parent device keeps locally. The family chooses them; the parent never has to.

export type TextSize = "large" | "xl";

const TEXT_SIZE_KEY = "secondlook.textSize";

export function readTextSize(): TextSize {
  try {
    return localStorage.getItem(TEXT_SIZE_KEY) === "xl" ? "xl" : "large";
  } catch {
    return "large";
  }
}

export function writeTextSize(size: TextSize): void {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, size);
  } catch {
    // Storage can be unavailable (private mode); the default size still works.
  }
}
