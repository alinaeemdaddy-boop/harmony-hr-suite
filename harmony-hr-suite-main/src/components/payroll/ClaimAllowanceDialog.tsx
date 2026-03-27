import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, Loader2, Edit3 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const allowanceSchema = z.object({
    travel_amount: z.coerce.number().min(0),
    daily_allowance: z.coerce.number().min(0),
    meal_allowance: z.coerce.number().min(0),
    incentive_amount: z.coerce.number().min(0),
});

type AllowanceFormValues = z.infer<typeof allowanceSchema>;

interface ClaimAllowanceDialogProps {
    values: AllowanceFormValues;
    onSave: (values: AllowanceFormValues) => void;
    staffLevel: string;
    trigger?: React.ReactNode;
}

export function ClaimAllowanceDialog({ values, onSave, staffLevel, trigger }: ClaimAllowanceDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useForm<AllowanceFormValues>({
        resolver: zodResolver(allowanceSchema),
        defaultValues: values,
    });

    // Update form when external values change (e.g. rate loaded)
    useEffect(() => {
        form.reset(values);
    }, [values, form]);

    const onSubmit = (data: AllowanceFormValues) => {
        onSave(data);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/5 gap-1.5 font-bold">
                        <Edit3 className="w-3.5 h-3.5" />
                        Adjust
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary">
                        <Calculator className="w-5 h-5" />
                        Adjust Claim Allowance
                    </DialogTitle>
                    <DialogDescription>
                        Manually set the allowance amounts for this specific trip ({staffLevel} level).
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="travel_amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Travel Rate (PKR)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="daily_allowance"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Daily Allowance</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="meal_allowance"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Meal Allowance</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="incentive_amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Incentive</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="pt-4 border-t border-border flex justify-between items-center">
                            <div className="text-sm">
                                <span className="text-muted-foreground">New Total: </span>
                                <span className="font-black text-primary">
                                    PKR {(
                                        Number(form.watch('travel_amount') || 0) +
                                        Number(form.watch('daily_allowance') || 0) +
                                        Number(form.watch('meal_allowance') || 0) +
                                        Number(form.watch('incentive_amount') || 0)
                                    ).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Apply Rates
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
