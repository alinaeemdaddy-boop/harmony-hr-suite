import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowRightLeft } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  priority: string;
  assigned_employee: { full_name: string };
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await supabase
        .from('general_tasks')
        .select(`
          *,
          assigned_employee:employees(full_name)
        `);

      const grouped = data?.reduce((acc, task) => {
        const col = task.status;
        acc[col] = acc[col] || [];
        acc[col].push(task);
        return acc;
      }, {} as Record<string, Task[]>);
      
      setTasks(grouped || {});
    } catch (error) {
      console.warn('Kanban fetch failed - DB setup needed');
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    const task = tasks[source.droppableId]?.[source.index];
    if (!task) return;

    try {
      await supabase
        .from('general_tasks')
        .update({ status: destination.droppableId })
        .eq('id', task.id);

      fetchTasks();
      toast({ title: 'Task Moved', description: `Updated to ${destination.droppableId}` });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'completed', title: 'Done', color: 'bg-emerald-100' }
  ];

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map(col => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided) => (
              <Card ref={provided.innerRef} {...provided.droppableProps} className="min-w-[300px] flex-1">
                <CardContent className="p-6 h-[500px]">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    {col.title}
                    <Badge className={col.color.replace('100', '500/20')}>
                      {tasks[col.id]?.length || 0}
                    </Badge>
                  </h3>
                  <div className="space-y-3 min-h-0 overflow-y-auto">
                    {tasks[col.id]?.map((task, index) => (
                      <Draggable draggableId={task.id} index={index} key={task.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                          >
                            <div className="font-medium text-sm truncate">{task.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {task.assigned_employee.full_name}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </CardContent>
              </Card>
            )}
          </Droppable>
        ))}
      </DragDropContext>
    </div>
  );
}
