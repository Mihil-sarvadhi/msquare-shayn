---
name: create-table-columns
description: Create a column configuration factory function for DataTable with typed callbacks, column widths, and action dropdown menu
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Table Columns Config

## Template

Create `src/pages/{feature}/config/{feature}Columns.tsx`:

```typescript
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { {Entity} } from '@/types/{feature}';

export interface ColumnConfig<T> {
  id: string;
  label: string;
  width: string;
  align?: 'left' | 'center' | 'right';
  responsive?: 'md' | 'lg' | 'xl';
  render: (item: T) => React.ReactNode;
}

interface {Entity}ColumnsConfig {
  onView: (item: {Entity}) => void;
  onEdit: (item: {Entity}) => void;
  onDelete: (item: {Entity}) => void;
}

export const create{Entity}Columns = ({
  onView,
  onEdit,
  onDelete,
}: {Entity}ColumnsConfig): ColumnConfig<{Entity}>[] => [
  {
    id: 'name',
    label: 'Name',
    width: 'flex-1',
    render: (item) => (
      <span className="text-sm font-medium text-gray-900 truncate">
        {item.name}
      </span>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    width: 'w-32',
    render: (item) => (
      <span className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        // Use getStatusStyleByCode() for status colors
      )}>
        {item.status_name}
      </span>
    ),
  },
  {
    id: 'created',
    label: 'Created',
    width: 'w-32',
    responsive: 'lg',
    render: (item) => (
      <span className="text-sm text-muted-foreground">
        {new Date(item.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: 'actions',
    label: '',
    width: 'w-12',
    align: 'right',
    render: (item) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView(item)}>
            <Eye className="mr-2 h-4 w-4" strokeWidth={1.5} />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(item)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
```

## Column Width Classes

| Usage | Class | Description |
|-------|-------|-------------|
| Primary column | `flex-1` | Takes remaining space |
| Status/badge | `w-32` | 128px |
| Date | `w-32` | 128px |
| Person/avatar | `w-40` | 160px |
| Code/short | `w-16` | 64px |
| Number | `w-24` | 96px |
| Actions | `w-12` | 48px |

## Critical Rules

1. **Factory function**: `create{Entity}Columns(config)` — not a component
2. **Typed callbacks**: Config interface with `onView`, `onEdit`, `onDelete`
3. **Destructive actions**: Separated by `DropdownMenuSeparator`, styled with `text-red-600`
4. **Icons**: All use `strokeWidth={1.5}`, sized `h-4 w-4`
5. **Responsive**: Use `responsive: 'lg'` to hide columns on smaller screens
6. **Status colors**: Use `getStatusStyleByCode()` from `@/utils/status-styles` — never hardcode colors

## Checklist

- [ ] File at `src/pages/{feature}/config/{feature}Columns.tsx`
- [ ] Factory function with typed config interface
- [ ] Primary column uses `flex-1`
- [ ] Actions column with View, Edit, Delete
- [ ] Delete separated by `DropdownMenuSeparator` + red text
- [ ] All icons use `strokeWidth={1.5}`
- [ ] Status uses `getStatusStyleByCode()` not hardcoded colors
