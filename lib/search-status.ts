/** Legacy rows may still use "success" from earlier versions. */
export function isSearchCompletedLike(status: string): boolean {
  return status === "completed" || status === "success";
}

export function canExportLeadPack(status: string, leadCount: number): boolean {
  return isSearchCompletedLike(status) && leadCount > 0;
}
