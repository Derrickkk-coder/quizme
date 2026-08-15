import { prisma } from "./prisma";

const DEFAULT_BANDS = [
  { grade: "A", minPercent: 80, maxPercent: 100, label: "Excellent" },
  { grade: "B", minPercent: 70, maxPercent: 79, label: "Very Good" },
  { grade: "C", minPercent: 60, maxPercent: 69, label: "Good" },
  { grade: "D", minPercent: 50, maxPercent: 59, label: "Credit" },
  { grade: "E", minPercent: 40, maxPercent: 49, label: "Pass" },
  { grade: "F", minPercent: 0, maxPercent: 39, label: "Fail" },
];

export async function gradeForPercent(percent: number): Promise<string> {
  const bands = await prisma.gradeBand.findMany();
  const source = bands.length > 0 ? bands : DEFAULT_BANDS;
  const rounded = Math.round(percent);
  const match = source.find((b) => rounded >= b.minPercent && rounded <= b.maxPercent);
  return match?.grade ?? source[source.length - 1].grade;
}

export async function ensureDefaultGradeBands(): Promise<void> {
  const count = await prisma.gradeBand.count();
  if (count === 0) {
    await prisma.gradeBand.createMany({ data: DEFAULT_BANDS });
  }
}
