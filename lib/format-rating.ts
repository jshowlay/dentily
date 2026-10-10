/** Google rating for UI — always one decimal (e.g. 3.0, 4.8). */
export function formatRatingDisplay(rating: number | null | undefined): string {
  if (rating == null || rating === undefined || Number.isNaN(Number(rating))) {
    return "—";
  }
  return Number(rating).toFixed(1);
}
