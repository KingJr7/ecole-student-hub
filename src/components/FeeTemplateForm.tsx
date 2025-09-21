import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

const feeTemplateSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  amount: z.coerce.number().min(1, "Le montant doit être positif"),
  frequency: z.enum(['monthly', 'weekly', 'unique']),
  due_day: z.coerce.number().optional(),
  applicable_months: z.array(z.string()).optional(),
  assignment_type: z.enum(['general', 'level', 'class']),
  applies_to_level: z.string().optional(),
  applies_to_class_id: z.coerce.number().optional(),
});

const levels = [
  { value: "garderie", label: "Garderie" },
  { value: "maternelle", label: "Maternelle" },
  { value: "primaire", label: "Primaire" },
  { value: "college", label: "Collège" },
  { value: "lycee", label: "Lycée" },
];

const months = [
  { id: 'sept', label: 'Sept' }, { id: 'oct', label: 'Oct' }, { id: 'nov', label: 'Nov' }, 
  { id: 'dec', label: 'Déc' }, { id: 'jan', label: 'Jan' }, { id: 'fev', label: 'Fév' }, 
  { id: 'mar', label: 'Mar' }, { id: 'avr', label: 'Avr' }, { id: 'mai', label: 'Mai' }, 
  { id: 'jun', label: 'Juin' }, { id: 'juil', label: 'Juil' }, { id: 'aout', label: 'Août' }
];

export function FeeTemplateForm({ onSubmit, initialData = null, classes }) {
  const assignmentType = initialData?.applies_to_class_id ? 'class' : (initialData?.applies_to_level ? 'level' : 'general');
  const frequency = initialData?.frequency || 'monthly';

  const form = useForm<z.infer<typeof feeTemplateSchema>>({
    resolver: zodResolver(feeTemplateSchema),
    defaultValues: {
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      frequency: frequency,
      due_day: initialData?.due_day || 10,
      applicable_months: initialData?.applicable_months || [],
      assignment_type: assignmentType,
      applies_to_level: initialData?.applies_to_level,
      applies_to_class_id: initialData?.applies_to_class_id,
    },
  });

  const watchedAssignmentType = form.watch("assignment_type");
  const watchedFrequency = form.watch("frequency");

  const handleFormSubmit = (values: z.infer<typeof feeTemplateSchema>) => {
    const submissionData = { ...values };
    if (values.assignment_type === 'general') {
      submissionData.applies_to_level = 'all';
      delete submissionData.applies_to_class_id;
    } else if (values.assignment_type === 'level') {
      delete submissionData.applies_to_class_id;
    } else if (values.assignment_type === 'class') {
      delete submissionData.applies_to_level;
    }
    onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Nom du modèle</FormLabel><FormControl><Input placeholder="Frais de scolarité" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="amount" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Montant par défaut (FCFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="frequency" render={({ field }) => (
          <FormItem><FormLabel>Fréquence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensuel</SelectItem><SelectItem value="weekly">Hebdomadaire</SelectItem><SelectItem value="unique">Unique</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />

        {watchedFrequency === 'monthly' && (
          <FormField control={form.control} name="due_day" render={({ field }) => (
            <FormItem><FormLabel>Jour d'échéance dans le mois</FormLabel><FormControl><Input type="number" min={1} max={28} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        )}
        {watchedFrequency === 'weekly' && (
          <FormField control={form.control} name="due_day" render={({ field }) => (
            <FormItem><FormLabel>Jour d'échéance dans la semaine</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value?.toString()}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="1">Lundi</SelectItem><SelectItem value="2">Mardi</SelectItem><SelectItem value="3">Mercredi</SelectItem><SelectItem value="4">Jeudi</SelectItem><SelectItem value="5">Vendredi</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        )}

        {watchedFrequency === 'monthly' && (
          <FormField control={form.control} name="applicable_months" render={() => (
            <FormItem><FormLabel>Mois Applicables</FormLabel><div className="grid grid-cols-3 gap-2 rounded-lg border p-4">
              {months.map((month) => (
                <FormField key={month.id} control={form.control} name="applicable_months" render={({ field }) => (
                  <FormItem key={month.id} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value?.includes(month.id)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), month.id]) : field.onChange(field.value?.filter((value) => value !== month.id))}} /></FormControl>
                    <FormLabel className="font-normal">{month.label}</FormLabel>
                  </FormItem>
                )} />
              ))}
            </div><FormMessage /></FormItem>
          )} />
        )}

        <FormField control={form.control} name="assignment_type" render={({ field }) => (
          <FormItem className="space-y-2"><FormLabel>Appliquer à</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="general" /></FormControl><FormLabel className="font-normal">Général</FormLabel></FormItem>
            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="level" /></FormControl><FormLabel className="font-normal">Par Niveau</FormLabel></FormItem>
            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="class" /></FormControl><FormLabel className="font-normal">Par Classe</FormLabel></FormItem>
          </RadioGroup></FormControl><FormMessage /></FormItem>
        )} />

        {watchedAssignmentType === 'level' && (
          <FormField control={form.control} name="applies_to_level" render={({ field }) => (
            <FormItem><FormLabel>Niveau</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un niveau" /></SelectTrigger></FormControl><SelectContent>{levels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        )}

        {watchedAssignmentType === 'class' && (
          <FormField control={form.control} name="applies_to_class_id" render={({ field }) => (
            <FormItem><FormLabel>Classe</FormLabel><Select onValueChange={field.onChange} value={field.value?.toString()}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez une classe" /></SelectTrigger></FormControl><SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        )}

        <Button type="submit">Enregistrer</Button>
      </form>
    </Form>
  );
}
