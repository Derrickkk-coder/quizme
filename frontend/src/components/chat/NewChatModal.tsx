import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeacherClasses, getTeacherSubjects } from "../../api/teacher";
import { createChatGroup } from "../../api/chat";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Modal } from "../ui/Modal";
import { ChatGroup } from "../../types";

export function NewChatModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (group: ChatGroup) => void }) {
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const subjectsQuery = useQuery({ queryKey: ["teacher", "subjects"], queryFn: getTeacherSubjects, enabled: open });
  const classesQuery = useQuery({ queryKey: ["teacher", "classes"], queryFn: getTeacherClasses, enabled: open });

  const mutation = useMutation({
    mutationFn: () => createChatGroup(subjectId, classId),
    onSuccess: (res) => {
      showToast("Chat ready", "success");
      queryClient.invalidateQueries({ queryKey: ["chat", "groups"] });
      onCreated(res.data);
      setSubjectId("");
      setClassId("");
      onClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  function handleClose() {
    setSubjectId("");
    setClassId("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Start a class chat"
      footer={
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" disabled={!subjectId || !classId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Creating…" : "Start chat"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-500">Every student in the class you pick will be able to see and post in this chat.</p>
        <div>
          <label className="label">Subject</label>
          <select required className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select subject</option>
            {subjectsQuery.data?.data.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Class</label>
          <select required className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classesQuery.data?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
