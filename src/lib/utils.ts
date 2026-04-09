export function groupByDate<T extends { date: string }>(items: T[]) {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    (grouped[item.date] ??= []).push(item);
  }
  return {
    dates: Object.keys(grouped).sort(),
    byDate: grouped,
  };
}

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};
