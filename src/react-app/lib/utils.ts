import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? "s" : ""}`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears !== 1 ? "s" : ""}`;
}
