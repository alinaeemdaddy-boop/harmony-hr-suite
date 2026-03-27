
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, User, Mail, Briefcase, Clock, Activity } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface Employee {
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    designation: string;
}

interface OnboardingCase {
    case_id: string;
    employee_id: string;
    status: string;
    start_date: string;
    expected_end_date: string | null;
    created_at: string;
    employee?: Employee;
}

export default function OnboardingCasePage() {
    const { caseId } = useParams<{ caseId: string }>();
    const navigate = useNavigate();
    const [caseInfo, setCaseInfo] = useState<OnboardingCase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
             const { data, error } = await (supabase as any)
                .from("onboarding_cases")
                .select(`
                    *,
                    employee:employees!onboarding_cases_employee_id_fkey (
                        first_name,
                        last_name,
                        email,
                        department,
                        designation
                    )
                `)
                .eq("case_id", caseId!)
                .single();

            if (error) {
                console.error(error);
            } else if (data) {
                setCaseInfo(data as unknown as OnboardingCase);
            }
            setLoading(false);
        };
        fetch();
    }, [caseId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!caseInfo) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-muted-foreground">Case not found.</p>
                <Button onClick={() => navigate("/onboarding")}>Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            <Button
                variant="ghost"
                onClick={() => navigate("/onboarding")}
                className="mb-4 text-slate-500 hover:text-indigo-600 pl-0"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Summary & Activity */}
                <div className="space-y-6">
                    <Card className="shadow-md border-0">
                        <CardHeader className="bg-indigo-600 text-white rounded-t-lg pb-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <User className="h-5 w-5" />
                                {caseInfo.employee ? `${caseInfo.employee.first_name} ${caseInfo.employee.last_name}` : "Unknown Employee"}
                            </CardTitle>
                            <div className="text-indigo-100 text-sm mt-1 flex items-center gap-2">
                                <Briefcase className="h-3 w-3" />
                                {caseInfo.employee?.designation || "No Role"}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Status</span>
                                <Badge className={caseInfo.status === 'active' ? 'bg-blue-600' : 'bg-slate-500'}>
                                    {caseInfo.status}
                                </Badge>
                            </div>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-700">{caseInfo.employee?.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Briefcase className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-700">{caseInfo.employee?.department}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-700">Start: {format(new Date(caseInfo.start_date), "PPP")}</span>
                                </div>
                                {caseInfo.expected_end_date && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-700">End: {format(new Date(caseInfo.expected_end_date), "PPP")}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-md border-0">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Activity Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border-l-2 border-slate-200 pl-4 space-y-4">
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-indigo-500 border-2 border-white"></div>
                                    <p className="text-sm font-medium text-slate-800">Case Created</p>
                                    <p className="text-xs text-slate-500">{format(new Date(caseInfo.created_at), "PPP p")}</p>
                                </div>
                                {/* Mocked activity for demo */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-slate-300 border-2 border-white"></div>
                                    <p className="text-sm text-slate-600">Status updated to {caseInfo.status}</p>
                                    <p className="text-xs text-slate-500">Recently</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Task List & Notes */}
                <div className="lg:col-span-2 space-y-6">
                    <TaskList caseId={caseInfo.case_id} type="onboarding" />

                    {/* Placeholder for Notes Timeline (since no table exists yet) */}
                    <Card className="shadow-md border-0">
                        <CardHeader>
                            <CardTitle className="text-lg">Notes & Comments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500 italic">
                                Notes functionality requires database update. Setup pending.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
