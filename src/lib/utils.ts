import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function safeJson(response: Response) {
  const contentType = response.headers.get("content-type");
  const text = await response.text();
  
  // Intercept Vite/Cloud Run HTML error pages
  if (text.startsWith("<!DOCTYPE html>") || text.includes("<html")) {
    throw new Error("Received HTML error page. The server might be restarting or unavailable. Please try again.");
  }
  
  if (contentType && contentType.includes("application/json")) {
    try {
       const data = JSON.parse(text);
       if (response.status === 401 && data.error === 'META_TOKEN_EXPIRED') {
         localStorage.removeItem('meta_token');
         window.dispatchEvent(new Event('meta_token_expired'));
       }
       return data;
    } catch (e: any) {
       throw new Error(`Invalid JSON format from server: ${e.message}`);
    }
  }

  if (text.includes("Rate exceeded")) {
    throw new Error("Rate limit exceeded. Please wait a moment and try again.");
  }
  if (response.status === 401 && text.includes("META_TOKEN_EXPIRED")) {
    localStorage.removeItem('meta_token');
    window.dispatchEvent(new Event('meta_token_expired'));
    throw new Error("META_TOKEN_EXPIRED");
  }
  throw new Error(text || "Invalid response from server");
}
