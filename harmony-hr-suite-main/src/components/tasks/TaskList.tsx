import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload } from "lucide-react";
import { format } from "date-fns";

export interface Task {
    task_id: string;
    title: string;
    description: string | null;
    owner_id: string | null;
    due_date: string | null;
    status: "pending" | "in_progress" | "done" | "blocked";
    evidence_url: string | null;
}

interface TaskListProps {
    caseId: string;
    type: "onboarding" | "offboarding";
}

export const TaskList = ({ caseId, type }: TaskListProps) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);

    // ---------------------------------------------------------------------
    // Load tasks for the given case
    // ---------------------------------------------------------------------
    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("tasks" as any)
                .select("*")
                .eq("case_id", caseId)
                .order("due_date", { ascending: true });

            if (error) console.error("Task load error:", error);
            else if (data) setTasks(data as unknown as Task[]);
            setLoading(false);
        };
        fetch();
    }, [caseId]);

    // ---------------------------------------------------------------------
    // Toggle status (pending → in_progress → done)
    // ---------------------------------------------------------------------
    const toggleStatus = async (task: Task) => {
        const nextStatus: Task["status"] =
            task.status === "pending"
                ? "in_progress"
                : task.status === "in_progress"
                    ? "done"
                    : "pending";

        const { error } = await supabase
            .from("tasks" as any)
            .update({ status: nextStatus })
            .eq("task_id", task.task_id);

        if (!error) {
            setTasks((prev) =>
                prev.map((t) => (t.task_id === task.task_id ? { ...t, status: nextStatus } : t))
            );
        } else {
            console.error("Status update failed:", error);
        }
    };

    // ---------------------------------------------------------------------
    // Upload evidence – stored in Supabase storage bucket `evidence`
    // ---------------------------------------------------------------------
    const uploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>, task: Task) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setUploading(task.task_id);

        const filePath = `${task.task_id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error("Upload error:", uploadError);
        } else {
            const publicUrl = supabase.storage.from("evidence").getPublicUrl(filePath).data.publicUrl;
            const { error: dbError } = await supabase
                .from("tasks" as any)
                .update({ evidence_url: publicUrl })
                .eq("task_id", task.task_id);
            if (!dbError) {
                setTasks((prev) =>
                    prev.map((t) => (t.task_id === task.task_id ? { ...t, evidence_url: publicUrl } : t))
                );
            }
        }
        setUploading(null);
    };

    // ---------------------------------------------------------------------
    // Add new task
    // ---------------------------------------------------------------------
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const { data, error } = await supabase
            .from("tasks" as any)
            .insert({
                case_id: caseId,
                title: newTaskTitle,
                status: "pending",
                due_date: new Date().toISOString() // Default to today
            })
            .select() // create returns the object
            .single();

        if (error) {
            console.error("Add task error:", error);
        } else if (data) {
            setTasks([...tasks, data as unknown as Task]);
            setNewTaskTitle("");
        }
    };

    // ---------------------------------------------------------------------
    // Delete task
    // ---------------------------------------------------------------------
    const deleteTask = async (taskId: string) => {
        if (!confirm("Delete this task?")) return;
        const { error } = await supabase
            .from("tasks" as any)
            .delete()
            .eq("task_id", taskId);
        if (!error) {
            setTasks(tasks.filter((t) => t.task_id !== taskId));
        } else {
            console.error("Delete task warning:", error);
        }
    };

    // ---------------------------------------------------------------------
    // Render UI
    // ---------------------------------------------------------------------
    return (
        <div className="p-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 rounded-xl shadow">
            <h3 className="text-xl font-semibold mb-4 capitalize">{type} checklist</h3>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100">
                                <TableHead>Task</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Evidence</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map((t) => (
                                <TableRow key={t.task_id} className="hover:bg-gray-50 transition-colors">
                                    <TableCell className="font-medium">{t.title}</TableCell>
                                    <TableCell>{t.owner_id ? `${t.owner_id.slice(0, 4)}...` : "—"}</TableCell>
                                    <TableCell>{t.due_date ? format(new Date(t.due_date), "MMM d") : "—"}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={t.status === "done" ? "default" : "secondary"}
                                            className="cursor-pointer"
                                            onClick={() => toggleStatus(t)}
                                        >
                                            {t.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {t.evidence_url ? (
                                            <a
                                                href={t.evidence_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 underline text-sm"
                                            >
                                                View
                                            </a>
                                        ) : (
                                            <label className="flex items-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-indigo-600">
                                                <Upload className="w-3 h-3" />
                                                <span>Up</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    disabled={uploading === t.task_id}
                                                    onChange={(e) => uploadEvidence(e, t)}
                                                />
                                            </label>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <button
                                            onClick={() => deleteTask(t.task_id)}
                                            className="text-red-400 hover:text-red-600"
                                        >
                                            &times;
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <form onSubmit={addTask} className="mt-4 flex gap-2">
                        <input
                            type="text"
                            placeholder="Add a new task..."
                            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                            disabled={!newTaskTitle.trim()}
                        >
                            Add
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};
