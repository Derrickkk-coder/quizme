import { ChatMessage } from "../types";

const GROUP_WINDOW_MS = 3 * 60 * 1000;
const DIVIDER_GAP_MS = 15 * 60 * 1000;

export interface GroupedMessage {
  message: ChatMessage;
  showSenderName: boolean;
  isLastInRun: boolean;
  showDivider: boolean;
}

export function groupMessages(messages: ChatMessage[]): GroupedMessage[] {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const t = new Date(message.createdAt).getTime();

    const sameSenderAsPrev = !!prev && prev.senderId === message.senderId && t - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
    const sameSenderAsNext =
      !!next && next.senderId === message.senderId && new Date(next.createdAt).getTime() - t < GROUP_WINDOW_MS;

    return {
      message,
      showSenderName: !sameSenderAsPrev,
      isLastInRun: !sameSenderAsNext,
      showDivider: !prev || t - new Date(prev.createdAt).getTime() > DIVIDER_GAP_MS,
    };
  });
}

export function formatDivider(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` ${time}`;
}
