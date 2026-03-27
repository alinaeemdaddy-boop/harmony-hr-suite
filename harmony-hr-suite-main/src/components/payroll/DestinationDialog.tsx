import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Plus, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const destinationSchema = z.object({
    location: z.string().min(2, { message: 'Location name is required.' }),
    managerial: z.object({
        travel_rate: z.coerce.number().min(0),
        daily_allowance_rate: z.coerce.number().min(0),
        meal_allowance_rate: z.coerce.number().min(0),
        incentive_rate: z.coerce.number().min(0),
    }),
    junior: z.object({
        travel_rate: z.coerce.number().min(0),
        daily_allowance_rate: z.coerce.number().min(0),
        meal_allowance_rate: z.coerce.number().min(0),
        incentive_rate: z.coerce.number().min(0),
    }),
});

type DestinationFormValues = z.infer<typeof destinationSchema>;

interface DestinationDialogProps {
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function DestinationDialog({ onSuccess, trigger }: DestinationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<DestinationFormValues>({
        resolver: zodResolver(destinationSchema),
        defaultValues: {
            location: '',
            managerial: {
                travel_rate: 2000,
                daily_allowance_rate: 1500,
                meal_allowance_rate: 1000,
                incentive_rate: 500,
            },
            junior: {
                travel_rate: 1000,
                daily_allowance_rate: 800,
                meal_allowance_rate: 500,
                incentive_rate: 200,
            },
        },
    });

    const onSubmit = async (values: DestinationFormValues) => {
        setLoading(true);
        try {
            // We need to insert two rows: one for managerial, one for junior
            const records = [
                {
                    location: values.location,
                    staff_level: 'managerial',
                    ...values.managerial,
                },
                {
                    location: values.location,
                    staff_level: 'junior',
                    ...values.junior,
                },
            ];

            const { error } = await (supabase as any).from('allowance_rates').insert(records);

            if (error) throw error;

            toast({
                title: 'Success',
                description: `New destination '${values.location}' added with rates.`,
            });

            setOpen(false);
            form.reset();
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to add destination.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:border-primary/40">
                        <Plus className="w-4 h-4" />
                        Add Destination
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Add New Destination & Rates
                    </DialogTitle>
                    <DialogDescription>
                        Configure TA/DA rates for a new location across all staff levels.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location Name (e.g. KHI, GUW)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Karachi" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-6">
                            {/* Managerial Rates */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Managerial Rates</h4>
                                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                                    <FormField
                                        control={form.control}
                                        name="managerial.travel_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Travel Rate</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="managerial.daily_allowance_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Daily Allowance</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="managerial.meal_allowance_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Meal Rate</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="managerial.incentive_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Incentive</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Junior Rates */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-accent uppercase tracking-wider">Junior Rates</h4>
                                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                                    <FormField
                                        control={form.control}
                                        name="junior.travel_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Travel Rate</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="junior.daily_allowance_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Daily Allowance</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="junior.meal_allowance_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Meal Rate</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="junior.incentive_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Incentive</FormLabel>
                                                <Input type="number" {...field} className="h-8 text-sm" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Destination
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
