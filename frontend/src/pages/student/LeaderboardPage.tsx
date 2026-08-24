import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";
import { getLeaderboard } from "../../api/student";
import { PageLoader } from "../../components/ui/Spinner";
import { SectionCard } from "../../components/ui/SectionCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatPercent } from "../../utils/format";

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-ink-200 text-ink-600",
  3: "bg-orange-100 text-orange-700",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-ink-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-500" />;
  return <span className="text-sm font-semibold text-ink-400">{rank}</span>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["student", "leaderboard"], queryFn: getLeaderboard });

  if (isLoading) return <PageLoader />;
  const board = data?.data;
  if (!board) return null;

  const you = board.rows.find((r) => r.isYou);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Leaderboard</h1>
        <p className="mt-1 text-sm text-ink-500">
          {board.class ? `Ranked by average score across all quizzes in ${board.class}.` : "Ranked by average score across all your quizzes."}
        </p>
      </div>

      {board.rows.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description="Once you and your classmates start completing quizzes, standings will show up here."
          icon={<Trophy className="h-8 w-8" />}
        />
      ) : (
        <>
          {you && (
            <SectionCard>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  #{you.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">Your rank</p>
                  <p className="text-xs text-ink-500">
                    {formatPercent(you.averagePercentage ?? 0)} average across {you.quizzesCompleted} quiz{you.quizzesCompleted === 1 ? "" : "zes"}
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Class standings">
            <div className="divide-y divide-ink-100">
              {board.rows.map((row) => (
                <div
                  key={row.studentId}
                  className={`flex items-center gap-4 py-3 ${row.isYou ? "rounded-lg bg-brand-50/60 px-3 -mx-3" : ""}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${RANK_STYLES[row.rank] ?? "bg-ink-100 text-ink-500"}`}>
                    <RankBadge rank={row.rank} />
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
                    {initials(row.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {row.name} {row.isYou && <span className="text-xs font-normal text-brand-600">(You)</span>}
                    </p>
                    <p className="text-xs text-ink-400">
                      {row.quizzesCompleted} quiz{row.quizzesCompleted === 1 ? "" : "zes"} completed
                    </p>
                  </div>
                  <span className="badge-brand shrink-0">{formatPercent(row.averagePercentage ?? 0)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
