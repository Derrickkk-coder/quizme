import { GroupedMessage, formatDivider } from "../../utils/chatFormat";
import { initials } from "../../utils/format";

export function MessageBubble({ item, isMine }: { item: GroupedMessage; isMine: boolean }) {
  const { message, showSenderName, isLastInRun, showDivider } = item;

  return (
    <div>
      {showDivider && (
        <div className="my-3 text-center text-[11px] font-medium text-ink-400">{formatDivider(message.createdAt)}</div>
      )}
      <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""} ${isLastInRun ? "mb-2.5" : "mb-0.5"}`}>
        {!isMine && (
          <div className={`h-6 w-6 shrink-0 ${isLastInRun ? "" : "invisible"}`}>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-200 text-[10px] font-bold text-ink-600">
              {initials(message.sender.name)}
            </div>
          </div>
        )}

        <div className={`flex max-w-[72%] flex-col ${isMine ? "items-end" : "items-start"}`}>
          {showSenderName && !isMine && <p className="mb-0.5 ml-1 text-[11px] font-medium text-ink-400">{message.sender.name}</p>}
          <div
            className={`whitespace-pre-wrap break-words px-3.5 py-2 text-[14.5px] leading-snug ${
              isMine
                ? `bg-gradient-to-br from-brand-500 to-brand-600 text-white ${isLastInRun ? "rounded-2xl rounded-br-md" : "rounded-2xl"}`
                : `bg-ink-100 text-ink-900 ${isLastInRun ? "rounded-2xl rounded-bl-md" : "rounded-2xl"}`
            }`}
          >
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}
