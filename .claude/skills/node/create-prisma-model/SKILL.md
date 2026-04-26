---
name: create-prisma-model
description: Add a new Prisma model to schema.prisma with proper field types, relations, indexes, timestamps, and generate migration
allowed tools: Read, Grep, Glob, Edit, Bash
---

# Create Prisma Model

## Reference File

Read `prisma/schema.prisma` to see existing models before adding.

## Template

Append to `prisma/schema.prisma`:

```prisma
model {Module} {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  // ... more fields based on requirements

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations (if applicable)
  // userId    Int
  // user      User     @relation(fields: [userId], references: [id])

  // Indexes
  // @@index([userId])
}
```

## Common Field Patterns

```prisma
// Required string
name        String

// Optional string
description String?

// String with max length
code        String   @db.VarChar(10)

// Unique field
email       String   @unique

// Boolean with default
isActive    Boolean  @default(true)

// Integer
quantity    Int      @default(0)

// Decimal
price       Decimal  @db.Decimal(10, 2)

// Date
startDate   DateTime

// Optional date
endDate     DateTime?

// Enum
status      StatusEnum @default(ACTIVE)

// JSON
metadata    Json?

// Foreign key + relation
userId      Int
user        User     @relation(fields: [userId], references: [id])

// Self-relation (parent/child)
parentId    Int?
parent      {Module}  @relation("ParentChild", fields: [parentId], references: [id])
children    {Module}[] @relation("ParentChild")

// Many-to-many (implicit)
tags        Tag[]
```

## Enum Pattern

```prisma
enum {Module}Status {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

## Critical Rules

1. **Always include** `id`, `createdAt`, `updatedAt` fields
2. **`@id @default(autoincrement())`** for primary key
3. **`@default(now())`** for `createdAt`
4. **`@updatedAt`** for `updatedAt`
5. **`String?`** for optional fields — always be explicit
6. **`@@index`** on foreign keys and frequently queried fields
7. **`@unique`** on fields that must be unique (email, code, etc.)
8. **Relations**: Define on both sides of the relationship

## Post-Creation Commands

```bash
cd backend
npx prisma migrate dev --name add-{module}-model
npx prisma generate
```

## Checklist

- [ ] Model added to `prisma/schema.prisma`
- [ ] `id` with `@id @default(autoincrement())`
- [ ] `createdAt` with `@default(now())`
- [ ] `updatedAt` with `@updatedAt`
- [ ] Relations defined on both sides (if applicable)
- [ ] `@@index` on foreign keys
- [ ] `@unique` on uniquely constrained fields
- [ ] Enums defined (if applicable)
- [ ] Migration generated: `npx prisma migrate dev --name add-{module}-model`
- [ ] Client regenerated: `npx prisma generate`
