# tanstack-db-atom

[![npm version](https://badge.fury.io/js/tanstack-db-atom.svg)](https://www.npmjs.com/package/tanstack-db-atom)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TanStack DB utilities for Effect Atom - provides reactive atoms that integrate with TanStack DB collections and queries.

## Features

- **Type-safe reactive atoms** from TanStack DB queries
- **Automatic subscription management** with cleanup on unmount
- **Result-based error handling** with `Result.Result<T>`
- **Support for single and array results**
- **Conditional queries** that can be enabled/disabled
- **Integration with Effect Atom ecosystem**

## Installation

```bash
npm install tanstack-db-atom
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install @effect-atom/atom-react @tanstack/db effect
```

```json
{
  "dependencies": {
    "tanstack-db-atom": "^1.0.0",
    "@effect-atom/atom-react": "^1.0.0",
    "@tanstack/db": "^0.5.0",
    "effect": "^3.0.0"
  }
}
```

## Quick Start

### 1. Setup TanStack DB Collection

```typescript
import { createCollection } from '@tanstack/db'

const todoCollection = createCollection<Todo, string>({
  id: 'todos',
  getKey: (todo) => todo.id,
  sync: {
    sync: async (params) => {
      const todos = await fetchTodosFromAPI()
      params.begin()
      for (const todo of todos) {
        params.write({ type: 'insert', value: todo })
      }
      params.commit()
      params.markReady()
    }
  },
  startSync: true
})
```

### 2. Create Query Atom

```typescript
import { makeQuery } from 'tanstack-db-atom'
import { useAtom } from '@effect-atom/atom-react'
import { Result } from '@effect-atom/atom-react'
import { eq } from '@tanstack/db'

const activeTodosAtom = makeQuery((q) =>
  q.from({ todos: todoCollection })
   .where(({ todos }) => eq(todos.completed, false))
)
```

### 3. Use in React Component

```typescript
function TodoList() {
  const todosResult = useAtom(activeTodosAtom)

  return Result.match(todosResult, {
    onInitial: () => <Loading />,
    onFailure: (error) => <Error message={error.message} />,
    onSuccess: (todos) => (
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    )
  })
}
```

## Usage

### Basic Query

Create an atom from a TanStack DB query with filtering and projection:

```typescript
import { makeQuery } from 'tanstack-db-atom'
import { useAtom } from '@effect-atom/atom-react'
import { Result } from '@effect-atom/atom-react'
import { eq } from '@tanstack/db'

const activeTodosAtom = makeQuery((q) =>
  q.from({ todos: todoCollection })
   .where(({ todos }) => eq(todos.completed, false))
   .select(({ todos }) => ({
     id: todos.id,
     title: todos.title
   }))
)

function TodoList() {
  const todosResult = useAtom(activeTodosAtom)

  return Result.match(todosResult, {
    onInitial: () => <Loading />,
    onFailure: (error) => <Error message={error.message} />,
    onSuccess: (todos) => (
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    )
  })
}
```

### Unsafe Query (Simplified)

For when you don't need error handling, use `makeQueryUnsafe`:

```typescript
import { makeQueryUnsafe } from 'tanstack-db-atom'
import { useAtom } from '@effect-atom/atom-react'

const todosAtom = makeQueryUnsafe((q) =>
  q.from({ todos: todoCollection })
)

function TodoList() {
  const todos = useAtom(todosAtom) // Array<Todo> | undefined

  if (!todos) return <Loading />

  return <ul>{todos.map(todo => <TodoItem key={todo.id} {...todo} />)}</ul>
}
```

### Conditional Queries

Queries that can be enabled/disabled based on runtime conditions:

```typescript
import { makeQueryConditional } from 'tanstack-db-atom'

const userTodosAtom = makeQueryConditional((q) => {
  const userId = getCurrentUserId()
  if (!userId) return null  // Disabled when no user

  return q.from({ todos: todoCollection })
          .where(({ todos }) => eq(todos.userId, userId))
})

function UserTodos() {
  const todosResult = useAtom(userTodosAtom)

  if (!todosResult) return <div>Please log in</div>

  return Result.match(todosResult, {
    onInitial: () => <Loading />,
    onFailure: (error) => <Error message={error.message} />,
    onSuccess: (todos) => <TodoList todos={todos} />
  })
}
```

### Single Result Queries

For queries that return a single item:

```typescript
const currentUserAtom = makeQuery((q) =>
  q.from({ users: userCollection })
   .where(({ users }) => eq(users.id, currentUserId))
   .limit(1)
)

function UserProfile() {
  const userResult = useAtom(currentUserAtom)

  return Result.match(userResult, {
    onInitial: () => <Loading />,
    onFailure: () => <div>User not found</div>,
    onSuccess: (users) => {
      const user = users[0]
      return user ? <UserProfileCard user={user} /> : null
    }
  })
}
```

### Working with Existing Collections

Create atoms from pre-existing TanStack DB collections:

```typescript
import { makeCollectionAtom, makeSingleCollectionAtom } from 'tanstack-db-atom'

// For collections that return arrays
const todosAtom = makeCollectionAtom(todoCollection)

// For collections with singleResult: true
const currentUserAtom = makeSingleCollectionAtom(currentUserCollection)
```

### Query Options

Configure query behavior with options:

```typescript
const todosAtom = makeQuery(
  (q) => q.from({ todos: todoCollection }),
  {
    gcTime: 5000,              // Keep collection alive for 5s after unmount
    startSync: true,           // Start sync immediately
    suspendOnWaiting: false    // Don't suspend on waiting state
  }
)
```

### Atom Families

Create parameterized queries with Atom families:

```typescript
import { Atom } from '@effect-atom/atom-react'

const todosByStatusFamily = Atom.family((completed: boolean) =>
  makeQuery((q) =>
    q.from({ todos: todoCollection })
     .where(({ todos }) => eq(todos.completed, completed))
  )
)

function CompletedTodos() {
  const completedTodos = useAtom(todosByStatusFamily(true))

  return Result.match(completedTodos, {
    onInitial: () => <Loading />,
    onFailure: (error) => <Error message={error.message} />,
    onSuccess: (todos) => <TodoList todos={todos} />
  })
}
```

### Complex Queries with Joins

TanStack DB's query builder supports joins and complex transformations:

```typescript
const enrichedTodosAtom = makeQuery((q) =>
  q.from({ todos: todoCollection })
   .join(
     { users: userCollection },
     ({ todos, users }) => eq(todos.userId, users.id)
   )
   .where(({ todos }) => eq(todos.completed, false))
   .select(({ todos, users }) => ({
     id: todos.id,
     title: todos.title,
     userName: users.name,
     userAvatar: users.avatarUrl
   }))
)
```

## API Reference

### `makeQuery`

Creates an Atom from a TanStack DB query function.

```typescript
import type { QueryOptions } from 'tanstack-db-atom'

function makeQuery<TContext extends Context>(
  queryFn: (q: InitialQueryBuilder) => QueryBuilder<TContext>,
  options?: QueryOptions
): Atom<Result<InferResultType<TContext>, Error>>
```

**Parameters:**

- `queryFn`: Function that builds a TanStack DB query
- `options`: Optional query configuration

**Options:**

- `gcTime?: number` - Garbage collection time in milliseconds (default: 0)
- `startSync?: boolean` - Whether to start sync immediately (default: true)
- `suspendOnWaiting?: boolean` - Suspend on waiting state with `Atom.result()` (default: false)

**Returns:** `Atom<Result<T, Error>>` - An atom that emits Result states

### `makeQueryUnsafe`

Creates an Atom that returns data or undefined (no Result wrapper).

```typescript
function makeQueryUnsafe<TContext extends Context>(
  queryFn: (q: InitialQueryBuilder) => QueryBuilder<TContext>,
  options?: QueryOptions
): Atom<InferResultType<TContext> | undefined>
```

**Returns:** `Atom<T | undefined>` - Data when available, undefined when loading/error

### `makeQueryConditional`

Creates an Atom from a conditional query function.

```typescript
function makeQueryConditional<TContext extends Context>(
  queryFn: (q: InitialQueryBuilder) => QueryBuilder<TContext> | null | undefined,
  options?: QueryOptions
): Atom<Result<InferResultType<TContext>, Error> | undefined>
```

**Behavior:**
- Returns `undefined` atom when query function returns `null` or `undefined`
- Returns `Result<T>` atom when query function returns a QueryBuilder

### `makeCollectionAtom`

Creates an Atom from an existing TanStack DB collection.

```typescript
function makeCollectionAtom<T extends object, TKey extends string | number>(
  collection: Collection<T, TKey, any> & NonSingleResult
): Atom<Result<Array<T>, Error>>
```

**Best for:** Collections that return arrays of items

### `makeSingleCollectionAtom`

Creates an Atom from a single-result collection.

```typescript
function makeSingleCollectionAtom<T extends object, TKey extends string | number>(
  collection: Collection<T, TKey, any> & SingleResult
): Atom<Result<T | undefined, Error>>
```

**Best for:** Collections with `singleResult: true` configuration

## How It Works

### Lifecycle Management

1. **Initial Load**: Collection sync starts immediately (unless `startSync: false`)
2. **Status Mapping**:
   - `idle`/`loading` → `Result.initial(true)` (waiting state)
   - `error` → `Result.fail(error)`
   - `ready` → `Result.success(data)`
   - `cleaned-up` → `Result.fail(error)`
3. **Reactive Updates**: Subscribes to `collection.subscribeChanges()`
4. **Cleanup**: Unsubscribes automatically via `get.addFinalizer()`

### Incremental View Maintenance

TanStack DB uses **D2 (Differential Datalog)** for efficient incremental updates:

- Changes are computed incrementally, not by re-running full queries
- Only affected rows trigger updates
- Joins and complex transformations are automatically optimized

### Memory Management

- Collections are cleaned up when atom is unmounted (gcTime: 0 by default)
- Subscriptions are automatically removed via finalizers
- No memory leaks - all resources properly cleaned up

## Integration with Effect Atom

Works seamlessly with other Effect Atom features:

```typescript
import { Atom } from '@effect-atom/atom-react'

// Combine with Atom.map
const todoCountAtom = Atom.map(
  makeQueryUnsafe((q) => q.from({ todos: todoCollection })),
  (todos) => todos?.length ?? 0
)

// Use with Atom.flatMap
const selectedTodoAtom = Atom.flatMap(
  selectedIdAtom,
  (id) => makeQuery((q) =>
    q.from({ todos: todoCollection })
     .where(({ todos }) => eq(todos.id, id))
     .limit(1)
   )
)

// Combine multiple queries
const dashboardDataAtom = Atom.all({
  todos: makeQuery((q) => q.from({ todos: todoCollection })),
  users: makeQuery((q) => q.from({ users: userCollection })),
  stats: makeQuery((q) => q.from({ stats: statsCollection }))
})
```

## Result Pattern

This package uses the Result pattern for safe error handling:

```typescript
import { Result } from '@effect-atom/atom-react'

// Type narrowing
if (Result.isSuccess(result)) {
  // result is Result.Success<T>
  console.log(result.value)
} else if (Result.isInitial(result)) {
  // result is Result.Initial
  console.log('Loading...', result.waiting)
}

// Pattern matching
const display = Result.match(result, {
  onInitial: () => 'Loading...',
  onFailure: (error) => `Error: ${error.message}`,
  onSuccess: (data) => `Data: ${JSON.stringify(data)}`
})

// Get with fallback
const data = Result.getOrElse(result, () => [])
```

## Benefits

1. **Seamless Integration**: Natural bridge between TanStack DB and Effect Atom
2. **Type Safety**: Full TypeScript inference throughout
3. **Performance**: Leverages D2 for efficient incremental updates
4. **Familiar API**: Similar to `useLiveQuery` and React Query patterns
5. **Composable**: Works with Atom.family, Atom.map, Atom.flatMap, etc.
6. **Error Handling**: Built-in Result types for safe error handling
7. **Lifecycle Management**: Automatic subscription cleanup via finalizers

## Comparison with useLiveQuery

| Feature        | useLiveQuery (React) | makeQuery (Effect Atom) |
| -------------- | -------------------- | ----------------------- |
| Framework      | React                | Framework-agnostic      |
| Subscription   | useSyncExternalStore | Atom finalizers         |
| Error Handling | Status flags         | Result types            |
| Composability  | Limited              | High (Atom combinators) |
| TypeScript     | Full inference       | Full inference          |
| Performance    | Optimized            | Optimized               |

## TypeScript Support

This package is written in TypeScript and provides full type inference:

```typescript
// Type is inferred from the query
const todosAtom = makeQuery((q) =>
  q.from({ todos: todoCollection })
   .select(({ todos }) => ({
     id: todos.id,
     title: todos.title
   }))
)

// Type is Atom<Result<Array<{id: string, title: string}>, Error>>
const result = useAtom(todosAtom)

if (Result.isSuccess(result)) {
  // TypeScript knows result.value has {id, title}
  console.log(result.value[0]?.title)
}
```

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/harrytran998/tanstack-db-atom/issues)
- TanStack DB: [Documentation](https://tanstack.com/db/latest)
- Effect Atom: [Documentation](https://github.com/Effect-TS/atom)
