import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 *
 * Uses clsx to handle conditional classes and tailwind-merge
 * to properly merge Tailwind utility classes
 *
 * @example
 * cn('px-2 py-1', 'px-4') // returns 'py-1 px-4' (px-4 overrides px-2)
 * cn('text-red-500', isActive && 'text-blue-500') // conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
