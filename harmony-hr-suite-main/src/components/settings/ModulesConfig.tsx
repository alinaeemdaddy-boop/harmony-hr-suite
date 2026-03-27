
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Module {
    id: string;
    name: string;
    key: string;
    description: string;
    is_active: boolean;
}

export function ModulesConfig() {
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        setLoading(true);
        const { data, error } = await (supabase as any)
            .from('modules')
            .select('*')
            .order('name');

        if (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to load modules', variant: 'destructive' });
        } else {
            setModules(data as unknown as Module[] || []);
        }
        setLoading(false);
    };

    if (loading) {
        return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">System Modules</h3>
                <p className="text-sm text-muted-foreground">Reference list of all available system modules.</p>
            </div>

            <div className="border rounded-lg bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[200px]">Module Name</TableHead>
                            <TableHead>Key</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {modules.map((m) => (
                            <TableRow key={m.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Package className="h-4 w-4 text-slate-500" />
                                    {m.name}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {m.key}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {m.description}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={m.is_active ? 'default' : 'secondary'} className={m.is_active ? 'bg-green-600' : ''}>
                                        {m.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Card className="bg-indigo-50 border-indigo-100">
                <CardContent className="pt-6">
                    <p className="text-sm text-indigo-800">
                        <strong>Note:</strong> Module availability is controlled globally here. To assign modules to specific users, use the <strong>User Management</strong> tab.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
