import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/hooks/useDatabase";
import { TrashIcon } from "lucide-react";
import { useEffect } from "react";

const dispatchRuleDetailSchema = z.object({
  destination_category_id: z.coerce.number(),
  percentage: z.coerce.number().min(0.01, "Doit être > 0").max(1, "Doit être <= 1"),
});

const dispatchRuleSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  source_fee_id: z.coerce.number(),
  details: z.array(dispatchRuleDetailSchema).min(1, "Au moins une règle de répartition est requise."),
}).refine(data => {
  const total = data.details.reduce((acc, detail) => acc + detail.percentage, 0);
  return total <= 1.001;
}, {
  message: "Le total des pourcentages ne peut pas dépasser 100%.",
  path: ["details"],
});

export function DispatchRuleForm({ fees, categories, setDialogOpen, initialData = null }) {
  const queryClient = useQueryClient();
  const { createDispatchRule, updateDispatchRule } = useDatabase();
  const isEditMode = !!initialData;

  const form = useForm<z.infer<typeof dispatchRuleSchema>>({
    resolver: zodResolver(dispatchRuleSchema),
    defaultValues: isEditMode 
      ? {
          name: initialData.name,
          source_fee_id: initialData.source_fee_id,
          details: initialData.details.map(d => ({ destination_category_id: d.destination_category_id, percentage: d.percentage }))
        }
      : {
          name: "",
          details: []
        },
  });

  useEffect(() => {
    form.reset(isEditMode 
      ? {
          name: initialData.name,
          source_fee_id: initialData.source_fee_id,
          details: initialData.details.map(d => ({ destination_category_id: d.destination_category_id, percentage: d.percentage }))
        }
      : {
          name: "",
          details: []
        });
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details",
  });

  const mutation = useMutation({ 
    mutationFn: isEditMode ? (data) => updateDispatchRule(initialData.id, data) : createDispatchRule, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatchRules'] });
      setDialogOpen(false);
    }
  });

  const onSubmit = (values: z.infer<typeof dispatchRuleSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la règle</FormLabel>
              <FormControl>
                <Input placeholder="Répartition Frais de Scolarité" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="source_fee_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frais Source</FormLabel>
              <Select onValueChange={field.onChange} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type de frais" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fees?.map(fee => (
                    <SelectItem key={fee.id} value={fee.id.toString()}>{fee.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <h4 className="text-sm font-medium mb-2">Détails de la Répartition</h4>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`details.${index}.destination_category_id`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Catégorie</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.filter(c => c.type === 'income').map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`details.${index}.percentage`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>%</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {form.formState.errors.details && (
            <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.details.message || form.formState.errors.details.root?.message}</p>
          )}
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ destination_category_id: 0, percentage: 0 })}>
            Ajouter une ligne
          </Button>
        </div>

        <Button type="submit">{isEditMode ? 'Mettre à jour' : 'Enregistrer'} la règle</Button>
      </form>
    </Form>
  );
}
