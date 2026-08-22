import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Plus, Send, Trash2, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiErrorMessage } from "../../api/client";
import { deleteChatGroup, getChatMessages, listChatGroups, markChatGroupRead, sendChatMessage } from "../../api/chat";
import { useChatSocket } from "../../hooks/useChatSocket";
import { groupMessages } from "../../utils/chatFormat";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { NewChatModal } from "../../components/chat/NewChatModal";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ChatGroup, ChatMessage } from "../../types";

export default function ChatPage() {
  const { user } = useAuth();
  const role = user!.role as "TEACHER" | "STUDENT";
  const isTeacher = role === "TEACHER";
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [draft, setDraft] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatGroup | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const groupsQuery = useQuery({
    queryKey: ["chat", "groups"],
    queryFn: () => listChatGroups(role),
    refetchInterval: 20000,
  });

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", selectedGroupId],
    queryFn: () => getChatMessages(role, selectedGroupId!),
    enabled: !!selectedGroupId,
  });

  const groups = groupsQuery.data?.data ?? [];
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
  const messages = messagesQuery.data?.data ?? [];

  function mergeMessage(list: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
    if (list.some((m) => m.id === incoming.id)) return list;
    return [...list, incoming].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  function bumpGroupPreview(groupId: string, message: ChatMessage, isActive: boolean) {
    queryClient.setQueryData<{ data: ChatGroup[] } | undefined>(["chat", "groups"], (old) => {
      if (!old) return old;
      return {
        data: old.data.map((g) =>
          g.id === groupId
            ? { ...g, lastMessage: message, unreadCount: isActive || message.senderId === user!.id ? 0 : g.unreadCount + 1 }
            : g
        ),
      };
    });
  }

  const { joinGroup } = useChatSocket((message) => {
    const isActive = message.groupId === selectedGroupId;
    if (isActive) {
      queryClient.setQueryData<{ data: ChatMessage[] } | undefined>(["chat", "messages", message.groupId], (old) =>
        old ? { data: mergeMessage(old.data, message) } : old
      );
      if (message.senderId !== user!.id) {
        markChatGroupRead(role, message.groupId).catch(() => {});
      }
    }
    bumpGroupPreview(message.groupId, message, isActive);
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, selectedGroupId]);

  function selectGroup(group: ChatGroup) {
    setSelectedGroupId(group.id);
    setMobileView("thread");
    if (group.unreadCount > 0) {
      markChatGroupRead(role, group.id).catch(() => {});
      queryClient.setQueryData<{ data: ChatGroup[] } | undefined>(["chat", "groups"], (old) =>
        old ? { data: old.data.map((g) => (g.id === group.id ? { ...g, unreadCount: 0 } : g)) } : old
      );
    }
  }

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendChatMessage(role, selectedGroupId!, text),
    onSuccess: (res) => {
      queryClient.setQueryData<{ data: ChatMessage[] } | undefined>(["chat", "messages", selectedGroupId], (old) =>
        old ? { data: mergeMessage(old.data, res.data) } : old
      );
      bumpGroupPreview(selectedGroupId!, res.data, true);
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => deleteChatGroup(groupId),
    onSuccess: () => {
      showToast("Chat deleted", "success");
      setDeleteTarget(null);
      setSelectedGroupId(null);
      setMobileView("list");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), "error");
      setDeleteTarget(null);
    },
  });

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedGroupId) return;
    setDraft("");
    sendMutation.mutate(text);
  }

  function handleCreated(group: ChatGroup) {
    joinGroup(group.id);
    queryClient.setQueryData<{ data: ChatGroup[] } | undefined>(["chat", "groups"], (old) =>
      old && !old.data.some((g) => g.id === group.id) ? { data: [group, ...old.data] } : old
    );
    selectGroup(group);
  }

  if (groupsQuery.isLoading) return <PageLoader />;

  const grouped = groupMessages(messages);

  return (
    <div className="flex h-[calc(100vh-9.5rem)] min-h-[420px] overflow-hidden rounded-2xl border border-ink-200 bg-surface">
      {/* Sidebar */}
      <div className={`w-full shrink-0 flex-col border-r border-ink-200 sm:flex sm:w-80 ${mobileView === "thread" ? "hidden" : "flex"}`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3.5">
          <h1 className="text-base font-semibold text-ink-900">Chats</h1>
          {isTeacher && (
            <button className="btn-ghost btn-sm" onClick={() => setNewChatOpen(true)} title="New chat">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!groups.length ? (
            <div className="p-4">
              <EmptyState
                icon={<MessageCircle className="h-6 w-6" />}
                title="No chats yet"
                description={isTeacher ? "Start a chat for a class you teach." : "Your teacher hasn't started a class chat yet."}
                action={
                  isTeacher ? (
                    <button className="btn-primary btn-sm" onClick={() => setNewChatOpen(true)}>
                      <Plus className="h-4 w-4" /> New chat
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul>
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => selectGroup(g)}
                    className={`flex w-full items-center gap-3 border-b border-ink-50 px-4 py-3 text-left transition-colors hover:bg-ink-50 ${
                      selectedGroupId === g.id ? "bg-brand-50" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                      {g.class.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900">{g.subject.name}</p>
                        {g.lastMessage && (
                          <span className="shrink-0 text-[11px] text-ink-400">
                            {new Date(g.lastMessage.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-ink-500">
                          {g.class.name}
                          {g.lastMessage ? ` · ${g.lastMessage.text}` : " · No messages yet"}
                        </p>
                        {g.unreadCount > 0 && (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                            {g.unreadCount > 9 ? "9+" : g.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex min-w-0 flex-1 flex-col sm:flex ${mobileView === "list" ? "hidden" : "flex"}`}>
        {!selectedGroup ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="Select a chat" description="Pick a class chat from the list to start messaging." />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
              <button className="btn-ghost btn-sm -ml-1 sm:hidden" onClick={() => setMobileView("list")}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                {selectedGroup.class.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{selectedGroup.subject.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-ink-400">
                  <Users className="h-3 w-3" /> {selectedGroup.class.name}
                </p>
              </div>
              {isTeacher && (
                <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleteTarget(selectedGroup)} title="Delete chat">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {messagesQuery.isLoading ? (
                <PageLoader />
              ) : !messages.length ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-ink-400">No messages yet — say hello 👋</p>
                </div>
              ) : (
                grouped.map((item) => <MessageBubble key={item.message.id} item={item} isMine={item.message.senderId === user!.id} />)
              )}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-100 p-3">
              <input
                className="input flex-1 rounded-full"
                placeholder="iMessage"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sendMutation.isPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-opacity hover:bg-brand-700 disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>

      {isTeacher && <NewChatModal open={newChatOpen} onClose={() => setNewChatOpen(false)} onCreated={handleCreated} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this chat?"
        message={`This permanently deletes "${deleteTarget?.subject.name} · ${deleteTarget?.class.name}" and all its messages for everyone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
