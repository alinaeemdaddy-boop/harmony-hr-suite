
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Search, Filter, LogOut, MoreHorizontal, FileDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { CreateOffboardingDialog } from "@/components/offboarding/CreateOffboardingDialog";
import { toast } from "sonner";

interface Employee {
    full_name: string;
    email: string;
    designation: string;
}

interface OffboardingCase {
    case_id: string;
    employee_id: string;
    status: string;
    notice_date: string;
    last_working_day: string | null;
    employee?: Employee;
}

export default function Offboarding() {
    const navigate = useNavigate();
    const [cases, setCases] = useState<OffboardingCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof OffboardingCase; direction: "asc" | "desc" } | null>(null);

    const fetchCases = async () => {
        setLoading(true);
        const { data, error } = await (supabase as any)
            .from("offboarding_cases")
            .select(`
                *,
                employee:employees!offboarding_cases_employee_id_fkey (
                    full_name,
                    email,
                    designation
                )
            `)
            .order("notice_date", { ascending: false });

        if (error) {
            console.warn("Offboarding cases table not available:", error.message);
        } else if (data) {
            setCases(data as unknown as OffboardingCase[]);
        }
        setLoading(false);
    };

    const seedData = async () => {
        try {
            const { count, error: countError } = await (supabase as any).from("offboarding_cases").select("*", { count: "exact", head: true });
            if (countError) return;
            if (count && count > 0) return;

            const { data: employees } = await supabase.from("employees").select("id").limit(2);
            if (!employees || employees.length === 0) return;

            const sampleCases = [
                {
                    employee_id: employees[0].id,
                    initiated_by: employees[0].id,
                    status: "active",
                    notice_date: format(new Date(), "yyyy-MM-dd"),
                    last_working_day: format(new Date(Date.now() + 86400000 * 30), "yyyy-MM-dd"),
                }
            ];

            for (const c of sampleCases) {
                await (supabase as any).from("offboarding_cases").insert(c);
            }
            fetchCases();
        } catch (e) {
            console.warn("Seed data skipped:", e);
        }
    };

    useEffect(() => {
        fetchCases().then(() => {
            // seedData(); // Uncomment if auto-seed desired
        });
    }, []);

    const handleSort = (key: keyof OffboardingCase) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedCases = [...cases].sort((a, b) => {
        if (!sortConfig) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (sortConfig.direction === "asc") {
            return aValue < bValue ? -1 : 1;
        } else {
            return aValue > bValue ? -1 : 1;
        }
    });

    const filteredCases = sortedCases.filter((c) => {
        const matchesSearch =
            c.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.employee?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.employee?.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || c.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const exportToCSV = () => {
        const dataToExport = filteredCases.map(c => ({
            "Case ID": c.case_id,
            "Employee Name": c.employee?.full_name || "",
            "Email": c.employee?.email,
            "Role": c.employee?.designation,
            "Status": c.status,
            "Notice Date": c.notice_date,
            "Last Working Day": c.last_working_day
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Offboarding Cases");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, "offboarding_cases.xlsx");
    };

    const updateStatus = async (caseId: string, newStatus: string) => {
        setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, status: newStatus } : c));

        const { error } = await (supabase as any)
            .from("offboarding_cases")
            .update({ status: newStatus })
            .eq("case_id", caseId);

        if (error) {
            toast.error("Failed to update status");
            fetchCases(); // Revert
        } else {
            toast.success(`Status updated to ${newStatus}`);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-slate-600 hover:bg-slate-700';
            case 'rejected': return 'bg-red-600 hover:bg-red-700';
            default: return 'bg-rose-500 hover:bg-rose-600';
        }
    };

    return (
        <div className="p-4 md:p-6 min-h-screen bg-slate-50">
            <CreateOffboardingDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={fetchCases}
            />

            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <div className="p-2 bg-rose-600 rounded-lg shadow-sm">
                            <LogOut className="h-6 w-6 text-white" />
                        </div>
                        Offboarding Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1">Manage employee exits & resignations</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-rose-600 hover:bg-rose-700">
                    <Plus className="mr-2 h-4 w-4" /> Initiate Offboarding
                </Button>
            </div>

            <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="border-b bg-white pb-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, or ID..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        <SelectValue placeholder="All Statuses" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="rejected">Withdrawn / Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={exportToCSV}>
                                <FileDown className="mr-2 h-4 w-4" /> Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-rose-600" />
                            </div>
                        ) : filteredCases.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                No offboarding cases found.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[100px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort("case_id")}>
                                            Case ID <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                                        </TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("status")}>
                                            Status <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort("notice_date")}>
                                            Notice Date <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                                        </TableHead>
                                        <TableHead>Last Working Day</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCases.map((c) => (
                                        <TableRow
                                            key={c.case_id}
                                            className="hover:bg-rose-50/50 cursor-pointer group transition-colors"
                                            onClick={() => navigate(`/offboarding/${c.case_id}`)}
                                        >
                                            <TableCell className="font-mono text-xs text-slate-500">
                                                {c.case_id.slice(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900">
                                                    {c.employee?.full_name || "Unknown"}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {c.employee?.email}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 font-medium">
                                                {c.employee?.designation || "N/A"}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Badge
                                                            className={`cursor-pointer ${getStatusBadgeVariant(c.status)}`}
                                                            variant="secondary"
                                                        >
                                                            {c.status} <ArrowUpDown className="ml-1 h-3 w-3" />
                                                        </Badge>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => updateStatus(c.case_id, "active")}>Active</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateStatus(c.case_id, "completed")}>Completed</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateStatus(c.case_id, "rejected")}>Withdrawn</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(c.notice_date), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                {c.last_working_day ? format(new Date(c.last_working_day), "MMM d, yyyy") : "—"}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigate(`/offboarding/${c.case_id}`)}>
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={async () => {
                                                                if (!confirm("Are you sure you want to delete this case?")) return;
                                                                await (supabase as any).from("offboarding_cases").delete().eq("case_id", c.case_id);
                                                                fetchCases();
                                                                toast.success("Case deleted");
                                                            }}
                                                        >
                                                            Delete Case
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
