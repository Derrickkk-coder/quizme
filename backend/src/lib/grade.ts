import { prisma } from "./prisma";

export const DEFAULT_BANDS = [
  { grade: "A", minPercent: 80, maxPercent: 100, label: "Excellent" },
  { grade: "B", minPercent: 70, maxPercent: 79, label: "Very Good" },
  { grade: "C", minPercent: 60, maxPercent: 69, label: "Good" },
  { grade: "D", minPercent: 50, maxPercent: 59, label: "Credit" },
  { grade: "E", minPercent: 40, maxPercent: 49, label: "Pass" },
  { grade: "F", minPercent: 0, maxPercent: 39, label: "Fail" },
];

type GradeBandLike = { grade: string; minPercent: number; maxPercent: number };

export function matchGrade(percent: number, bands: GradeBandLike[]): string {
  const rounded = Math.round(percent);
  const match = bands.find((b) => rounded >= b.minPercent && rounded <= b.maxPercent);
  return match?.grade ?? bands[bands.length - 1].grade;
}

// Bands ordered best-to-worst, for building grade-distribution charts.
export async function getOrderedGradeBands(): Promise<GradeBandLike[]> {
  const bands = await prisma.gradeBand.findMany({ orderBy: { minPercent: "desc" } });
  return bands.length > 0 ? bands : DEFAULT_BANDS;
}

export async function gradeForPercent(percent: number): Promise<string> {
  const bands = await prisma.gradeBand.findMany();
  const source = bands.length > 0 ? bands : DEFAULT_BANDS;
  return matchGrade(percent, source);
}

export async function ensureDefaultGradeBands(): Promise<void> {
  const count = await prisma.gradeBand.count();
  if (count === 0) {
    await prisma.gradeBand.createMany({ data: DEFAULT_BANDS });
  }
}
