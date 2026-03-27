
import { useState, useRef, useEffect } from 'react';
import {
    MessageSquare,
    X,
    Send,
    Bot,
    User,
    Loader2,
    Sparkles,
    ChevronDown,
    Calendar,
    DollarSign,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function AIAssistant() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Hello ${user?.full_name || 'there'}! I'm your HR Assistant. How can I help you today? You can ask me about leave balances, payroll, or company policies.`,
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate AI thinking time
        setTimeout(() => {
            const response = generateAIResponse(input);
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsTyping(false);
        }, 1000);
    };

    const generateAIResponse = (query: string): string => {
        const q = query.toLowerCase();

        if (q.includes('leave balance') || q.includes('how many leaves')) {
            return "You have 5 days of leave remaining for this year. Would you like to check the details of your taken leaves?";
        }

        if (q.includes('request time off') || q.includes('take leave') || q.includes('apply for leave')) {
            return "Sure! I can help with that. Please provide the dates you're looking for, or I can direct you to the Leave Request page.";
        }

        if (q.includes('paycheck') || q.includes('salary') || q.includes('payment date')) {
            return "Your next paycheck is scheduled for the 25th of this month. You can view your past payslips in the Payroll section.";
        }

        if (q.includes('working hours') || q.includes('office time')) {
            return "Our standard working hours are Monday to Friday, 9:00 AM to 6:00 PM, with a 1-hour lunch break.";
        }

        if (q.includes('onboarding') || q.includes('documents')) {
            return "For onboarding, you'll generally need to submit your original ID, proof of residence, education certificates, and bank details for payroll.";
        }

        if (q.includes('who are you') || q.includes('what can you do')) {
            return "I am the Harmony HR AI Assistant. I can help you with leave inquiries, payroll information, company policy details, and navigating the HRMS system!";
        }

        return "That's an interesting question. I'm still learning, but I can check that for you. For more complex queries, you might want to contact the HR department directly.";
    };

    const quickActions = [
        { label: 'Leave Balance', icon: Calendar, query: 'What is my leave balance?' },
        { label: 'Next Paycheck', icon: DollarSign, query: 'When is my next paycheck?' },
        { label: 'Working Hours', icon: Briefcase, query: 'What are the company working hours?' },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[380px] h-[520px] mb-4 flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-4 duration-300 glass-card">
                    <CardHeader className="p-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-t-xl shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-display">HR Assistant</CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Online</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10 h-8 w-8"
                                onClick={() => setIsOpen(false)}
                            >
                                <ChevronDown className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-3 max-w-[85%]",
                                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                        )}
                                    >
                                        <Avatar className={cn(
                                            "w-8 h-8 shrink-0 border shadow-sm",
                                            msg.role === 'user' ? "bg-accent" : "bg-primary"
                                        )}>
                                            {msg.role === 'assistant' ? (
                                                <Bot className="w-4 h-4 text-white" />
                                            ) : (
                                                <span className="text-xs font-bold uppercase">{user?.username.substring(0, 2)}</span>
                                            )}
                                        </Avatar>
                                        <div className={cn(
                                            "p-3 rounded-2xl text-sm shadow-sm",
                                            msg.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-muted rounded-tl-none border border-border/50"
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-3 max-w-[85%] animate-in fade-in duration-300">
                                        <Avatar className="w-8 h-8 shrink-0 bg-primary border shadow-sm">
                                            <Bot className="w-4 h-4 text-white" />
                                        </Avatar>
                                        <div className="bg-muted p-3 rounded-2xl rounded-tl-none border border-border/50 shadow-sm">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Quick Actions */}
                        <div className="p-3 border-t border-border/50 bg-muted/30 shrink-0">
                            <div className="flex flex-wrap gap-2">
                                {quickActions.map((action) => (
                                    <Button
                                        key={action.label}
                                        variant="outline"
                                        size="sm"
                                        className="text-[10px] h-7 rounded-full bg-white/50 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
                                        onClick={() => {
                                            setInput(action.query);
                                            // Trigger send manually after state updates if we want auto-send
                                        }}
                                    >
                                        <action.icon className="w-3 h-3 mr-1 text-primary" />
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-border/50 shrink-0">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    placeholder="Ask me anything..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    className="input-glass h-10 pr-10"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!input.trim() || isTyping}
                                    className="shrink-0 bg-primary hover:opacity-90 transition-opacity rounded-xl"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Floating Action Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-primary to-accent hover:scale-105 active:scale-95 transition-all duration-300 group"
                >
                    <div className="relative">
                        <MessageSquare className="w-6 h-6 text-white group-hover:hidden" />
                        <Sparkles className="w-6 h-6 text-yellow-200 hidden group-hover:block animate-pulse" />
                    </div>
                </Button>
            )}
        </div>
    );
}
