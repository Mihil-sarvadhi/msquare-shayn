---
name: create-form-dialog
description: Create a form dialog component using Dialog with React Hook Form, zodResolver, and mutation hooks for create and edit modes
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Form Dialog

## Template

Create `src/pages/{feature}/components/{Entity}FormDialog.tsx`:

```typescript
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { create{Entity}Schema, type Create{Entity}FormValues } from '@/utils/validations';
import { useCreate{Entity}, useUpdate{Entity} } from '@/services/{feature}/{feature}.query';
import type { {Entity} } from '@/types/{feature}';

interface {Entity}FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: {Entity} | null;
}

export function {Entity}FormDialog({ open, onOpenChange, item }: {Entity}FormDialogProps) {
  const isEditMode = !!item;

  const form = useForm<Create{Entity}FormValues>({
    resolver: zodResolver(create{Entity}Schema),
    defaultValues: {
      name: '',
      // ... other default values
    },
  });

  // Reset form when item changes (edit mode population)
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        // ... map item fields to form values
      });
    } else {
      form.reset({
        name: '',
        // ... reset to defaults
      });
    }
  }, [item, form]);

  const createMutation = useCreate{Entity}();
  const updateMutation = useUpdate{Entity}();
  const mutation = isEditMode ? updateMutation : createMutation;

  const handleSubmit = (data: Create{Entity}FormValues) => {
    const payload = {
      name: data.name,
      // ... transform form values to API payload
      // Convert string IDs to numbers: status_id: Number(data.status_id)
    };

    if (isEditMode && item) {
      updateMutation.mutate(
        { id: item.id, data: payload },
        {
          onSuccess: () => {
            form.reset();
            onOpenChange(false);
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} {Entity}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add more FormField components for other fields */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                )}
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

## Critical Rules

1. **Props pattern**: `{ open, onOpenChange, item? }` — same dialog handles create + edit
2. **isEditMode**: `const isEditMode = !!item` — determines mode from item presence
3. **useEffect reset**: Reset form when `item` changes — populate for edit, clear for create
4. **onSuccess callback**: Always `form.reset()` + `onOpenChange(false)` on successful mutation
5. **Loading state**: Use `mutation.isPending` to disable submit + show `Loader2` spinner
6. **Validation**: Schema from `@/utils/validations` + zodResolver
7. **String → number conversion**: Form values are strings; convert to numbers in payload (`Number(data.status_id)`)
8. **Lucide icons**: `strokeWidth={1.5}` on Loader2

## Select/Dropdown Fields

For fields that need a dropdown (status, role, priority):

```typescript
<FormField
  control={form.control}
  name="status_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Status</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {statuses?.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Checklist

- [ ] File created at `src/pages/{feature}/components/{Entity}FormDialog.tsx`
- [ ] Props: `open`, `onOpenChange`, `item?`
- [ ] `isEditMode` derived from `!!item`
- [ ] `useForm` with `zodResolver` and schema from `@/utils/validations`
- [ ] `useEffect` resets form on item change
- [ ] Both create and update mutations imported
- [ ] `onSuccess` resets form and closes dialog
- [ ] Submit button disabled + Loader2 when `isPending`
- [ ] Named export only
