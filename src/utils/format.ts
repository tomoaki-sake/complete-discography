/**
 * Formats a duration given in milliseconds into a string with the format "MM:SS".
 *
 * @param ms - The duration in milliseconds.
 * @returns A string representing the formatted duration in "MM:SS" format.
 */
export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
