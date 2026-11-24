import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function safeJson(response: Response) {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  if (text.includes("Rate exceeded")) {
    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
  }
  throw new Error(text || "Invalid response from server");
}
