
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formSchema = z.object({
    employee_id: z.string().min(1, "Employee is required"),
    notice_date: z.date({
        required_error: "Notice date is required",
    }),
    last_working_day: z.date({
        required_error: "Last working day is required",
    }),
});

interface CreateOffboardingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface EmployeeOption {
    id: string;
    full_name: string;
    designation: string;
}

export function CreateOffboardingDialog({ open, onOpenChange, onSuccess }: CreateOffboardingDialogProps) {
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            notice_date: new Date(),
        },
    });

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!open) return;
            setLoadingEmployees(true);
            const { data, error } = await supabase
                .from("employees" as any)
                .select("id, full_name, designation")
                .eq("status", "active");

            if (error) {
                console.error("Error fetching employees:", error);
                toast.error("Failed to load employees");
            } else {
                setEmployees((data as any) || []);
            }
            setLoadingEmployees(false);
        };
        fetchEmployees();
    }, [open]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Try to find the initiator ID (either current user or fallback)
            let initiatorId = null;

            if (user) {
                const { data: empData } = await supabase
                    .from("employees" as any)
                    .select("id")
                    .eq("email", user.email || "")
                    .single();
                initiatorId = (empData as any)?.id;
            }

            // Fallback: If no auth user or no matching employee record, use the first available employee
            if (!initiatorId && employees.length > 0) {
                console.warn("Using fallback initiator as auth session or employee record was not found.");
                initiatorId = employees[0].id;
            }

            if (!initiatorId) {
                toast.error("Process aborted: No valid initiator (staff member) found in system.");
                return;
            }

            const payload = {
                employee_id: values.employee_id,
                initiated_by: initiatorId,
                status: "active",
                notice_date: format(values.notice_date, "yyyy-MM-dd"),
                last_working_day: format(values.last_working_day, "yyyy-MM-dd"),
            };

            const { error } = await supabase
                .from("offboarding_cases" as any)
                .insert(payload);

            if (error) throw error;

            toast.success("Offboarding case created");
            form.reset();
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error creating case:", error);
            toast.error(error.message || "Failed to create case");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Initiate Offboarding</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="employee_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Employee (Resigning/Terminated)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select employee" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {loadingEmployees ? (
                                                <div className="p-2 flex justify-center">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                </div>
                                            ) : (
                                                employees.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.full_name} ({emp.designation || 'Staff'})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notice_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Notice Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="last_working_day"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Last Working Day</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                // disabled={(date) => date < new Date()} // Maybe allow past dates for retroactive offboarding
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" className="bg-rose-600 hover:bg-rose-700">Initiate</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
