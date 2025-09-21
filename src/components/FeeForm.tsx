import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect } from "react";

const feeSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  amount: z.coerce.number().min(1, "Le montant doit être positif"),
  assignment_type: z.enum(['general', 'level', 'class']),
  level: z.string().optional(),
  class_id: z.coerce.number().optional(),
  due_date: z.date().optional(),
});

const levels = [
  { value: "garderie", label: "Garderie" },
  { value: "maternelle", label: "Maternelle" },
  { value: "primaire", label: "Primaire" },
  { value: "college", label: "Collège" },
  { value: "lycee", label: "Lycée" },
];

export function FeeForm({ onSubmit, initialData = null, classes }) {
  const assignmentType = initialData?.class_id ? 'class' : (initialData?.level && initialData.level !== 'all' ? 'level' : 'general');

  const form = useForm<z.infer<typeof feeSchema>>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      assignment_type: assignmentType,
      level: initialData?.level,
      class_id: initialData?.class_id,
      due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
    },
  });

  const watchedAssignmentType = form.watch("assignment_type");

  const handleFormSubmit = (values: z.infer<typeof feeSchema>) => {
    const submissionData = { ...values };
    if (values.assignment_type === 'general') {
      submissionData.level = 'all';
      submissionData.class_id = null;
    } else if (values.assignment_type === 'level') {
      submissionData.class_id = null;
    } else if (values.assignment_type === 'class') {
      submissionData.level = null;
    }
    delete submissionData.assignment_type;
    onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Nom du frais</FormLabel>
            <FormControl><Input placeholder="Frais d'inscription" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="amount" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Montant (FCFA)</FormLabel>
            <FormControl><Input type="number" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="assignment_type" render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Appliquer à</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="general" /></FormControl><FormLabel className="font-normal">Général</FormLabel></FormItem>
                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="level" /></FormControl><FormLabel className="font-normal">Par Niveau</FormLabel></FormItem>
                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="class" /></FormControl><FormLabel className="font-normal">Par Classe</FormLabel></FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {watchedAssignmentType === 'level' && (
          <FormField control={form.control} name="level" render={({ field }) => (
            <FormItem>
              <FormLabel>Niveau</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un niveau" /></SelectTrigger></FormControl>
                <SelectContent>{levels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {watchedAssignmentType === 'class' && (
          <FormField control={form.control} name="class_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Classe</FormLabel>
              <Select onValueChange={field.onChange} value={field.value?.toString()}>
                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une classe" /></SelectTrigger></FormControl>
                <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="due_date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Date d'échéance (Optionnel)</FormLabel>
            <Popover>
              <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="ml-auto h-4 w-4 opacity-50" />{field.value ? format(field.value, "PPP") : <span>Choisissez une date</span>}</Button></FormControl></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit">Enregistrer</Button>
      </form>
    </Form>
  );
}