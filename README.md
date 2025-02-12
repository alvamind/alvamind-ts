# 🧙‍♂️ Alvamind 🧠: Modular Magic for TypeScript Applications ✨

> **Conjure State, Compose Logic, and Weave Wonders!** ✨

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/your-username/alvamind/actions/workflows/test.yml/badge.svg)](https://github.com/your-username/alvamind/actions/workflows/test.yml)
[![Codecov](https://codecov.io/gh/your-username/alvamind/branch/main/graph/badge.svg?token=YOUR_CODECOV_TOKEN)](https://codecov.io/gh/your-username/alvamind)
[![npm version](https://badge.fury.io/js/alvamind.svg)](https://badge.fury.io/js/alvamind)

```
    █████╗ ██╗    ██╗   ██╗ █████╗ ███╗   ███╗██╗███╗   ██╗██████╗
   ██╔══██╗██║    ██║   ██║██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗
   ███████║██║    ██║   ██║███████║██╔████╔██║██║██╔██╗ ██║██║  ██║
   ██╔══██║██║    ╚██╗ ██╔╝██╔══██║██║╚██╔╝██║██║██║╚██╗██║██║  ██║
   ██║  ██║███████╗╚████╔╝ ██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██████╔╝
   ╚═╝  ╚═╝╚══════╝ ╚═══╝  ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝
```

Alvamind is a **lightweight and powerful TypeScript library** for building robust, maintainable, and testable applications using functional programming. It empowers you with dependency injection, immutable state management, functional composition, and lifecycle hooks, all while promoting a "composition over inheritance" philosophy.  It focuses on your *application logic*, leaving the HTTP/transport layer to your preferred tools. Think of it as a way to structure your *business logic* – the core rules, data transformations, and service interactions – with the clarity and predictability of pure functions, *without* the complexities of classes or decorators.

It's **framework-agnostic**, designed to work with *any* server library (Express, Fastify, Elysia, etc.) or even in non-server contexts (CLI tools, background jobs).

## Table of Contents

- [Core Features](#core-features)
- [Why Alvamind? (OOP vs. Composition)](#why-alvamind-oop-vs-composition)
- [Design Philosophy: My Vision for Alvamind 🧠](#design-philosophy-my-vision-for-alvamind-)
- [Installation](#installation)
- [Getting Started 🚀](#getting-started-)
- [The Basics: A Simple Counter](#the-basics-a-simple-counter)
- [Dependency Injection: Summoning Helpers](#dependency-injection-summoning-helpers)
- [State Management: The Orb of Observation](#state-management-the-orb-of-observation)
- [Composition with `pipe`: Chaining Spells](#composition-with-pipe-chaining-spells)
- [Lifecycle Hooks: Rituals of Start and Stop](#lifecycle-hooks-rituals-of-start-and-stop)
- [Lazy Modules: Delayed Incantations](#lazy-modules-delayed-incantations)
- [Error Handling: When Spells Go Wrong](#error-handling-when-spells-go-wrong)
- [Advanced Usage: The Archmage's Secrets](#advanced-usage-the-archmages-secrets)
  - [Chaining Derivations](#chaining-derivations)
  - [Decorating the Instance](#decorating-the-instance)
  - [Combining Multiple Modules](#combining-multiple-modules)
- [API Reference](#api-reference)
  -  [`Alvamind`](#alvamind)
  -  [`use`](#use)
  -  [`derive`](#derive)
  -  [`decorate`](#decorate)
  -  [`watch`](#watch)
  -  [`onStart`](#onstart)
  -  [`onStop`](#onstop)
  -  [`pipe`](#pipe)
  -  [`lazy`](#lazy)
- [Examples](#examples)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Core Features

*   **Modular Design:** Break your app into independent, reusable modules like Lego bricks.
*   **Dependency Injection:** No more tangled wires! Inject dependencies with the `.use()` method.
*   **Immutable State:**  Keep your state pristine. Mutations happen immutably via `.set()`.
*   **Reactive State:** Watch for changes with `.watch()` and react accordingly.  🔮
*   **Functional Composition:** Use `.pipe()` to create elegant data flows.
*   **Lifecycle Hooks:** `.onStart()` and `.onStop()` for setup and teardown.
*   **Lazy Loading:** Handle circular dependencies with `lazy()`.  It's like magic, but it's just clever code. 😉
*   **Testable by Design:**  Each module is an isolated unit, making testing a breeze.
*   **TypeScript First:**  Enjoy strong typing and excellent IDE support.
*   **Side Effect Management:** Integrate seamlessly with tools like `fp-ts` to control side effects.
*   **Minimal Footprint:** Small, lightweight library with no unnecessary dependencies.

## Why Alvamind? (OOP vs. Composition)

Traditional Object-Oriented Programming (OOP) relies heavily on inheritance to share behavior between classes. While inheritance can be useful, it often leads to:

*   **Tight Coupling:** Classes become heavily reliant on their parent classes.
*   **The Fragile Base Class Problem:** Changes in a base class can have unintended consequences in derived classes.
*   **The Diamond Problem:** Multiple inheritance can lead to complex and ambiguous relationships.
*   **Rigidity:**  Adding new functionality often requires modifying existing class hierarchies.

Alvamind embraces *composition over inheritance*. Instead of creating deep class hierarchies, you build modules from smaller, reusable units of functionality.  This approach offers:

*   **Loose Coupling:** Modules are independent and can be changed without affecting other modules.
*   **Flexibility:**  You can easily combine modules in different ways to create new functionality.
*   **Testability:**  Each module is an isolated unit, making testing simpler.
*   **Reusability:**  Modules can be reused in different parts of your application.

Alvamind allows you to achieve complex functionality similar to OOP inheritance, but with more flexibility and maintainability.  It lets you model your application in terms of *capabilities* rather than strict classifications.

**OOP Example (Problematic):**

```typescript
class Animal {
  makeSound() { console.log("Generic animal sound"); }
}

class Dog extends Animal {
  makeSound() { console.log("Woof!"); }
  fetch() { console.log("Fetching!"); }
}

class Cat extends Animal {
  makeSound() { console.log("Meow!"); }
  climb() { console.log("Climbing!"); }
}

// What if we need a ClimbingDog?  More subclasses?  Inheritance gets messy!
```

**Alvamind (Composition) Example:**

```typescript
import { Alvamind } from 'alvamind';

const soundModule = Alvamind({ name: 'SoundModule' }).decorate('makeSound', (sound: string) => console.log(sound));
const climbModule = Alvamind({ name: 'ClimbModule' }).decorate('climb', () => console.log("Climbing!"));

const dogModule = Alvamind({ name: 'DogModule' })
  .use(soundModule)
  .derive(({ makeSound }) => ({
    bark() { makeSound("Woof!"); },
    fetch() { console.log("Fetching!"); }
  }));

const catModule = Alvamind({ name: 'CatModule' })
  .use(soundModule)
  .use(climbModule) // Cats also climb!
  .derive(({ makeSound, climb }) => ({
    meow() { makeSound("Meow!"); },
    climb
  }));

//Creating a climbing dog is trivial!!
const climbingDogModule = Alvamind({name: 'ClimbingDog'}).use(dogModule).use(climbModule)
climbingDogModule.climb() // climbing

```

## Design Philosophy: My Vision for Alvamind 🧠

I created Alvamind because I'm passionate about the modularity of NestJS and the speed and simplicity of ElysiaJS (and Bun!). I'm also a firm believer in functional programming (FP) for building robust, testable, and maintainable code. My question was:

**"Can we combine the best of both worlds?  NestJS's structure *without* classes and decorators, and ElysiaJS's functional elegance and performance?"**

Alvamind is my answer. It distills the *essence* of NestJS's modularity, separation of concerns, and dependency injection, reimagining them through a purely functional lens, optimized for speed and developer experience. I wanted the expressiveness of Elysia's chaining, but with the architectural power of Nest.

It's not just *another* way to write functions. It *guides* developers towards well-structured applications, encouraging good practices through its design. Type safety is a *given*, not an afterthought. And it's *fast*.

### Functional Programming Principles – The Foundation

Alvamind is built on the core tenets of functional programming. This isn't just a style choice; it's about how software should be built.

#### Pure Functions: The Building Blocks 🧱

Pure functions are predictable: same input, same output, *no side effects*. This makes them easy to test, reason about, and compose. Alvamind encourages you to write your core logic as pure functions.

```typescript
// Pure function
const add = (a: number, b: number): number => a + b;

// Impure function (side effect: modifies 'total')
let total = 0;
const addToTotal = (a: number): void => { total += a; };
```

Alvamind *loves* pure functions. They're the bedrock.

#### Immutability: No Surprises 🛡️

Mutable state is a bug magnet. When data changes unexpectedly, it's hard to track down errors. Alvamind promotes immutability: treat data as read-only. Instead of modifying objects, create *new* ones.

```typescript
// Mutable (BAD)
const user = { name: 'Alice', age: 30 };
user.age = 31; // Modifies the original

// Immutable (GOOD)
const user = { name: 'Alice', age: 30 };
const updatedUser = { ...user, age: 31 }; // Creates a new object
```

Alvamind's state management (`.state()`) is built on immutability.

#### Composition over Inheritance: Flexibility and Control 🧩

Classical inheritance (`extends`) can create rigid hierarchies. Functional composition is like LEGO bricks: combine small, independent functions to create larger behaviors. It's more flexible and maintainable.

```typescript
// Inheritance (Rigid)
class Animal {
  move() { /* ... */ }
}
class Dog extends Animal {
  bark() { /* ... */ }
}

// Composition (Flexible)
const canMove = () => ({
  move: () => { /* ... */ }
});
const canBark = () => ({
  bark: () => { /* ... */ }
});

const dog = { ...canMove(), ...canBark() };
```

Alvamind's `.use()`, `.derive()`, and `.pipe()` are all about composition.

#### Explicit Dependencies: Clarity and Testability 💉

Hidden dependencies make code hard to understand and test. Alvamind *forces* you to be explicit. Modules declare their needs, and those needs are provided through injection. This makes it clear what a module relies on, and easy to swap dependencies for testing (e.g., using mocks).

```typescript
// Implicit Dependency (BAD)
const createUser = async (data) => {
  await db.users.create(data); // `db` is a global, hidden dependency
};

// Explicit Dependency (GOOD)
const createUser = ({ db }) => async (data) => {
  await db.users.create(data); // `db` is explicitly provided
};
```

Alvamind's `.use()` and `.derive()` mechanisms enforce explicit dependency injection.

#### Controlled Side Effects: Predictability and Reliability ⚙️

Side effects (API calls, database writes, logging) are unavoidable. But *uncontrolled* side effects are a major source of bugs. Alvamind helps you manage them predictably, using techniques inspired by `fp-ts`. This often involves wrapping side effects in structures like `Task` or `Either` (provided through Alvamind's context), representing asynchronous operations or computations that can fail.

```typescript
// Uncontrolled Side Effect (BAD)
const saveUser = async (user) => {
  await db.save(user);      // Directly interacts with the database
  sendWelcomeEmail(user.email); // Another side effect
};

// Controlled Side Effect (GOOD) - using Alvamind's context for fp-ts
const userModule = Alvamind({ name: 'UserModule' })
.derive(({ db, emailService, TE }) => ({ // Inject and access TE (TaskEither)
  saveUser: (user) =>
    pipe(
      TE.tryCatch(() => db.save(user), toError), // Wrap in TaskEither
      TE.chain((savedUser) =>
        TE.tryCatch(() => emailService.sendWelcome(savedUser.email), toError)
      )
    )
}));
```
Alvamind context make it easier to access `fp-ts` function.

### Type-First Development: Confidence and Correctness

I'm a TypeScript enthusiast. Strong typing is *essential* for robust applications. But I also dislike unnecessary verbosity. Alvamind maximizes type inference, so you get type safety with minimal manual annotations.

#### Strong Type Inference: Let TypeScript Work for You 🦾

Alvamind leverages TypeScript's inference to automatically determine types. This reduces boilerplate and makes code concise, while still catching errors at compile time.

```typescript
// Alvamind infers types automatically
const userModule = Alvamind({ name: 'UserModule' })
  .derive(() => ({
    // TypeScript knows `createUser` takes a string and returns a Promise<string>
    createUser: (name: string) => Promise.resolve(`User ${name} created`)
  }));

const result = await userModule.createUser('Alice'); // TypeScript knows `result` is a string
```

#### Type Safety without Verbosity: The Best of Both Worlds

Alvamind provides strong type safety *without* requiring tons of annotations. It infers types whenever possible, but provides mechanisms (like generic type parameters) for explicit constraints when needed.

```typescript
// Explicit type constraints when needed
interface User {
  id: string;
  name: string;
}

const userModule = Alvamind<User>({ name: 'UserModule' }); // Enforce User type
```

### Railway-Oriented Programming: Elegant Error Handling 🛤️

Error handling is often messy, with `try-catch` blocks scattered everywhere. Alvamind embraces Railway-Oriented Programming (ROP): errors are a separate "track." This leads to cleaner code and consistent error management.

```typescript

// Traditional Error Handling (Messy)
const processOrder = (order) => {
    try {
      const validated = validateOrder(order);
      try {
        const processed = processPayment(validated);
        return { success: true, order: processed };
      } catch (paymentError) {
        return { success: false, error: paymentError };
      }
    } catch (validationError) {
      return { success: false, error: validationError };
    }
  };

// Railway-Oriented Programming (Clean) - using Alvamind's context for fp-ts
const orderModule = Alvamind({ name: 'OrderModule' })
.derive(({E})=>({
    processOrder: (order) =>
    pipe(
      validateOrder(order), // Returns Either
      E.chain(processPayment),  // Only called on success
      E.fold( // Handle both success and failure
        (error) => ({ status: 'error', error: error.message }),
        (result) => ({ status: 'success', order: result })
      )
    )
}));
```

Alvamind's `.pipe()` and `E.chain` methods (from `fp-ts`), facilitate ROP.

### Anti-Patterns: What Alvamind *Discourages*

To achieve its goals, Alvamind discourages:

*   **Mutable State:** Immutability is core.
*   **Hidden Dependencies:** All dependencies should be explicit.
*   **Classical Inheritance:** Favor composition.
*   **Type Assertions (`as any`, `as unknown`):** Rely on inference and proper definitions.
*   **Uncontrolled Side Effects:** Manage them using controlled mechanisms.
*   **Global Scope:** Avoid global variables. Modules should be self-contained.

By avoiding these, Alvamind helps you write predictable, testable, and maintainable code.

In essence, Alvamind is my love letter to functional programming, TypeScript, and well-structured applications. It's built on strong principles, to help you build amazing software with confidence. It's the framework I *wish* I had, and I hope it helps you too!

## Installation

```bash
bun install alvamind # or npm install alvamind / yarn add alvamind
```

## Getting Started 🚀

Let's create a simple "Greeter" module:

```typescript
// src/greeter.module.ts
import { Alvamind } from 'alvamind';

// Create a Alvamind module
export const greeterModule = Alvamind({
  name: 'GreeterModule',
})
.decorate('greet', (name: string) => `Hello, ${name}!`)
.derive(({ greet }) => ({ // Access the `greet` function
  greetUser: (name: string) => greet(name), // Expose a method
}));

// src/main.ts
import { greeterModule } from './greeter.module';

function main() {
  const greeting = greeterModule.greetUser('World'); // Call the method. Types are inferred!
  console.log(greeting); // Output: Hello, World!
}

main();
```

**Explanation:**

1.  **`greeter.module.ts`:**

    *   We import the `Alvamind` class.
    *   We create a module named `GreeterModule`.
    *   `.decorate('greet', ...)` adds a `greet` function.
    *   `.derive(({ greet }) => ...)` creates a `greetUser` method, using the `greet` function.  Note the *explicit dependency*.
2.  **`main.ts`:**

    *   We import the `greeterModule`.
    *   We call `greetUser`. TypeScript *automatically knows* the argument and return types!

**Running the Example:**

1.  Create `src/greeter.module.ts` and `src/main.ts`.
2.  Initialize a TypeScript project (if needed):

    ```bash
    npm init -y
    tsc --init # Creates tsconfig.json
    ```
3.  Make sure you have installed `alvamind`.
4.  Compile and run:

    ```bash
    tsc
    node src/main.js
    ```

    You should see "Hello, World!" printed.

Let's expand this with more features, including state and simple, built-in validation.

```typescript
// src/user.module.ts
import { Alvamind } from 'alvamind';

interface UserState {
  users: string[];
}

export const userModule = Alvamind<UserState>({
  name: 'UserModule',
  state: { users: [] }, // Initial state: an array of strings
})
.decorate('isValidUser', (user: unknown) => typeof user === 'string') // Simple validation
.derive(({ isValidUser, state }) => ({ // Access state and isValidUser
    createUser: (userData: string) => {
        if (!isValidUser(userData)) { // Use the validation function
            throw new Error("Invalid user data");
        }

        const current = state.get();
        state.set({ users: [...current.users, userData] }); // Immutable state update
        return userData;
    },
    getUsers: () => state.get().users,
}))
.onStart(() => { // onStart lifecycle hook
    console.log("User module Started");
});

// src/main.ts
import { userModule } from './user.module';

function main() {
    const createdUser = userModule.createUser('Alice'); // Type-safe!
    console.log(createdUser);
    console.log(userModule.getUsers());
    //  userModule.createUser(123); // Throws an error: "Invalid user data"
}

main();
```

Key takeaways:

*   **`state`:**  We initialize the module with an empty array of strings as its state.
*   **`isValidUser`:**  A simple validation function (using `.decorate`).
*   **`.derive()`:**

    *   `createUser`:  Validates the input *before* adding it to the state.
    *   `getUsers`:  Retrieves the current list of users.
    *   **Immutability:** We use the spread operator (`...`) to create a *new* array when updating the state, ensuring immutability.
*   **`.onStart()`:** A lifecycle hook that runs when the module is initialized.
*   **Type Safety:**  Even without explicit type annotations in many places, TypeScript and Alvamind infer the types correctly.

## The Basics: A Simple Counter

Let's create a counter module.  No wands required!

```typescript
import { Alvamind } from 'alvamind';

interface CounterState {
  count: number;
}

const counterModule = Alvamind<CounterState>({
  name: 'CounterModule',
  state: { count: 0 },
})
.derive(({ state }) => ({
  increment: () => state.set({ count: state.get().count + 1 }),
  decrement: () => state.set({ count: state.get().count - 1 }),
  getCount: () => state.get().count,
}));

// Use it!
counterModule.increment();
console.log(counterModule.getCount());
counterModule.decrement();
console.log(counterModule.getCount());
```

## Dependency Injection: Summoning Helpers

Need a logger?  Inject it!

```typescript
import { Alvamind } from 'alvamind';

const logger = {
  log: (message: string) => console.log(`[LOG]: ${message}`),
};

const userModule = Alvamind({ name: 'UserModule' })
  .use(logger) // Inject the logger!
  .derive(({ log }) => ({
    createUser: (name: string) => {
      log(`Creating user: ${name}`); // Use the injected logger
      return { id: 1, name };
    },
  }));

const user = userModule.createUser('Gandalf');
```

## State Management: The Orb of Observation

Watch for changes in your state.

```typescript
import { Alvamind } from 'alvamind';

interface InventoryState {
  gold: number;
}

const inventoryModule = Alvamind<InventoryState>({
  name: 'InventoryModule',
  state: { gold: 100 },
})
  .watch('gold', (newGold, oldGold) => {
    console.log(`Gold changed from ${oldGold} to ${newGold}`);
  })
  .derive(({ state }) => ({
    addGold: (amount: number) =>
      state.set({ gold: state.get().gold + amount }),
    getGold: () => state.get().gold,
  }));

inventoryModule.addGold(50);
```

## Composition with `pipe`: Chaining Spells

Create data pipelines like a pro using the power of `fp-ts`.

```typescript
import { Alvamind, type Either } from 'alvamind';
import * as E from 'fp-ts/Either'

const mathModule = Alvamind({ name: 'MathModule' })
  .derive(() => ({
    double: (n: number) => n * 2,
    addOne: (n: number) => n + 1,
    checkPositive: (n:number):Either<string, number> => n > 0 ? E.right(n) : E.left('Number must be positive'),
  }))
  .pipe('process', ({ double, addOne, pipe, checkPositive }) =>
     (input: number) => pipe(
        input,
        checkPositive,
        E.map(double),
        E.map(addOne),
        E.getOrElse((e:string) => e)
    )
  );

console.log(mathModule.process(5)); // Outputs: 11
console.log(mathModule.process(-2)); // Outputs: "Number must be positive"
```

## Lifecycle Hooks: Rituals of Start and Stop

Perform actions when your module starts or stops.

```typescript
import { Alvamind } from 'alvamind';

const connectionModule = Alvamind({ name: 'ConnectionModule' })
  .onStart(({ config }) => {
    console.log('Connecting to database...');
    // Imagine some connection logic here...
  })
  .onStop(() => {
    console.log('Closing database connection...');
    // Imagine some disconnection logic here...
  })
  .derive(() => ({
      connect: () => {
        console.log('connecting')
      },
      close: () => module.stop() // Stop the module

  }));

connectionModule.connect();
connectionModule.close()
// Connecting to database...
// Closing database connection...

```

## Lazy Modules: Delayed Incantations

Handle those pesky circular dependencies.

```typescript
import { Alvamind, lazy } from 'alvamind';

const moduleB = Alvamind({ name: 'ModuleB' })
  .derive(({doA}) => ({
    doB: (input: string) =>  doA ? doA(input + ' -> B') : 'B' ,
  }));

const moduleA = Alvamind({ name: 'ModuleA' })
// .use(moduleB) // ⚠️ This would cause a circular dependency!
  .derive(() => ({
    doA: (input: string) => moduleB.doB(input + ' -> A'),
  }));

const mainModule = Alvamind({name: 'MainModule'})
    .use(moduleA)
    .use(lazy(moduleB))
    .derive(({doA}) => ({
        start: () => doA('Start')
    }))
console.log(mainModule.start()); // Output: Start -> A -> B -> A -> B ...

```

## Error Handling: When Spells Go Wrong

Alvamind integrates well with `fp-ts`, using its `Either` you can manage errors properly.

```typescript
import { Alvamind } from 'alvamind';

const module = Alvamind({ name: "ErrorModule" })
  .pipe("dangerousOperation", () => (input: unknown) => {
    if (typeof input !== "string") {
      return "ERROR";
    }
    return (input as string).toUpperCase();
  });

console.log(module.dangerousOperation("test")); // "TEST"
console.log(module.dangerousOperation(123));   // "ERROR"

```

## Advanced Usage: The Archmage's Secrets

### Chaining Derivations

You can chain `.derive()` calls to build up complex APIs:

```typescript
import { Alvamind } from 'alvamind';

const complexModule = Alvamind({ name: 'ComplexModule', state: {value: 1} })
  .derive(({state}) => ({
    setValue: (val: number) => state.set({ value: val }),
  }))
  .derive(({state}) => ({
    doubleValue: () => state.set({value: state.get().value * 2}),
  }))
    .derive(({setValue}) => ({
        resetValue: () => setValue(1) // Call the derived api, also inside other derive.
    }))

complexModule.doubleValue()
console.log(complexModule.resetValue()) // Returns: 2

```

### Decorating the Instance

Add custom properties to your module:

```typescript
import { Alvamind } from 'alvamind';

const versionedModule = Alvamind({ name: 'VersionedModule' })
  .decorate('version', '1.0.0')
  .derive(() => ({
     getVersion: () => versionedModule.version
  }));

console.log(versionedModule.version);
console.log(versionedModule.getVersion())

```

### Combining Multiple Modules

Show how to combine multiple feature modules to create complex applications.

```typescript
import { Alvamind } from 'alvamind';

interface CartItem {
  id: number;
  name: string;
  price: number;
}

interface CartState {
  items: CartItem[];
}

// -- Modules --

const cartModule = Alvamind<CartState>({
  name: "CartModule",
  state: { items: [] },
})
  .derive(({ state }) => ({
    addItem: (item: CartItem) => {
      const currentItems = state.get().items;
      state.set({ items: [...currentItems, item] });
    },
    getCartTotal: () => {
      const items = state.get().items;
      return items.reduce((total, item) => total + item.price, 0);
    },
    clearCart: () => state.set({ items: [] }),
  }));

const discountModule = Alvamind({ name: "DiscountModule" })
  .derive(() => ({
    applyDiscount: (total: number, discountPercentage: number) => {
      return total * (1 - discountPercentage / 100);
    },
  }));

// -- App Module --

const appModule = Alvamind({ name: "AppModule" })
  .use(cartModule)
  .use(discountModule)
  .derive(({ addItem, getCartTotal, applyDiscount, clearCart }) => ({
    purchase: (items: CartItem[], discount: number) => {
      items.forEach(addItem);
      const total = getCartTotal();
      const discountedTotal = applyDiscount(total, discount);
      clearCart(); // Clear after purchase
      return discountedTotal;
    },
  }));

// -- Usage --

const items = [
  { id: 1, name: "Potion", price: 10 },
  { id: 2, name: "Sword", price: 50 },
];
const discountedPrice = appModule.purchase(items, 10); // 10% discount
console.log(`Final Price: ${discountedPrice}`); // Final Price: 54
```

## API Reference

### `Alvamind`

Creates an Alvamind module builder.

**Type Signature**:
`function Alvamind<TState, TConfig>(options: AlvamindOptions<TState, TConfig>): BuilderInstance`

**Parameters**:

*   `options`:

    *   `name` (*required*): The name of the module (must be unique).
    *   `state?`: Initial state for the module.
    *   `config?`: Configuration object for the module.

### `use`

Injects dependencies into the module.

`function use<T extends DependencyRecord | LazyModule<any>>(dep: T): BuilderInstance<TState, TConfig, TDeps & (T extends LazyModule<infer U> ? U : T), TApi>;`

### `derive`

Derives new properties from the context and adds them to the module's API.

`function derive<T extends DependencyRecord>(fn: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => T): BuilderInstance<TState, TConfig, TDeps, TApi & T> & T;`

### `decorate`

Adds custom properties directly to the builder instance and its API.

`function decorate<K extends string, V>(key: K, value: V): BuilderInstance<TState, TConfig, TDeps, TApi & Record<K, V>> & Record<K, V>;`

### `watch`

Registers a watcher for state changes.

`function watch<K extends keyof TState>(key: K, handler: (newVal: TState[K], oldVal: TState[K]) => void): BuilderInstance<TState, TConfig, TDeps, TApi>;`

### `onStart`

Registers a hook to be called when the module is initialized.

`function onStart(hook: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => void): BuilderInstance<TState, TConfig, TDeps, TApi>;`

### `onStop`

Registers a hook to be called when `stop()` is called.

`function onStop(hook: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => void): BuilderInstance<TState, TConfig, TDeps, TApi>;`

### `pipe`

Compose functions fp-ts style.

`function pipe<K extends string, V>(key: K, fn: (ctx: AlvamindContext<TState, TConfig> & TDeps & TApi) => V): BuilderInstance<TState, TConfig, TDeps, TApi & Record<K, V>> & Record<K, V>;`

### `lazy`

Used for lazy initialization, helps with circular dependencies.

`function lazy<T extends Record<string, unknown>>(module: T): LazyModule<T>;`

## Examples

Explore the `examples/` directory (coming soon!) for more in-depth examples of using Alvamind in different scenarios, including:

*   Simple React integration.
*   Complex application with multiple modules.
*   Integrating with external APIs.
*   Testing strategies.

## Roadmap

*   [ ] More comprehensive documentation and examples.
*   [ ] Enhanced testing utilities.
*   [ ] React integration helpers.
*   [ ] CLI tool for generating Alvamind modules.
*   [ ] Explore alternative state management approaches (e.g., Immer.js).
*   [ ] Plugin system.
*   [ ] Support for other frameworks (Vue, Angular).

## Contributing

Contributions are welcome! Fork the repo, create a branch, and send a pull request. Please follow the existing code style and include tests for any new functionality.

## License

MIT.

## Frequently Asked Questions (FAQ)

This section addresses some critical questions about Alvamind and its design choices.

**Q1: Redundancy with Existing Tools:** We have `fp-ts`, `rxjs`, Redux, Zustand, etc. Why Alvamind?

**A1:** Alvamind isn't meant to *replace* these tools, but to provide a *structured, opinionated way to combine them*. It's a micro-framework, not a full-fledged state management solution or FP library.  It offers:

*   **Unified Structure:**  Alvamind provides a consistent module system that encourages a specific organizational pattern. This can be *more* beneficial than just using individual libraries, especially in larger projects.
*   **Simplified Dependency Injection:** Alvamind's `use` and `derive` handle dependency injection in a functional way, making it more explicit and less verbose than manually passing dependencies.
*   **Integrated State Management (Optional):** The built-in state management, while simple, is *integrated* with the module system and immutability. You're *not forced* to use it; you can easily plug in Zustand, Jotai, or others.
*   **`fp-ts` Bridge:** Alvamind provides convenient access to `fp-ts` functions within its context, reducing boilerplate for common patterns.

Alvamind's value lies in its *combination* of features, providing a "batteries-included-but-removable" approach to structuring functional TypeScript applications. It's a *higher-level* abstraction that aims for developer productivity and maintainability.

**Q2: "Composition over Inheritance" Silver Bullet?** Isn't composition also complex?

**A2:** You're right, composition *can* be complex. Alvamind mitigates this by:

*   **Explicit Dependencies:**  `use` and `derive` make dependencies very clear, reducing the cognitive load of tracing data flow.
*   **Module Boundaries:**  Modules provide natural boundaries, limiting the scope of any single composition.  This helps prevent overly complex, deeply nested functions.
*   **Targeted Scope Control:** The `as: 'scoped'` option prevents accidental leakage of internal implementation details, further simplifying the composition within a module.
*   **Encouraging Small, Focused Functions:** The overall design pushes developers toward writing many small, well-defined functions, which are easier to compose than large, monolithic ones.

Alvamind *doesn't* claim to eliminate *all* complexity.  Complex problems require *some* complexity in their solutions.  But it aims to make that complexity *manageable* and *explicit*.

**Q3: Hidden Complexity:**  Isn't Alvamind's simplicity just hiding internal complexity?

**A3:** There's *some* internal complexity, but it's relatively small and well-documented. The core concepts (proxies for lazy evaluation, maps for dependency storage) are standard JavaScript techniques. We strive for:

*   **Informative Error Messages:** Alvamind aims to provide helpful error messages that point to the source of the problem within your code, *not* just within the library's internals.
*   **Clear Stack Traces:** While chained calls can create deeper stack traces, the structure (module names, function names) should generally be clear. We're actively working on improving stack trace clarity.
*   **Open Source:** The code is open and relatively small. You can inspect it directly to understand the inner workings.

We're committed to making debugging as straightforward as possible.

**Q4: Performance Overhead:**  What's the actual performance impact?

**A4:** We haven't yet conducted extensive, large-scale benchmarks. However:

*   **Minimal Abstraction:**  The core operations (dependency injection, state updates) are relatively lightweight.
*   **Pure Function Focus:**  The emphasis on pure functions *allows* for optimizations (like memoization) that you can apply *within* your modules.
*   **Immutability Benefits:** Immutability, while adding some overhead, can *improve* performance in UI frameworks like React (by enabling efficient change detection).

We'll be publishing detailed benchmark results as the library matures. We expect the overhead to be negligible in most common scenarios, and we're committed to optimizing performance.

**Q5: Over-Engineering for Simple Cases:** Is Alvamind overkill for small projects?

**A5:** Yes, for *very* small projects (a single file, a few functions), Alvamind might be overkill. Its benefits become more apparent as complexity grows. The "tipping point" is subjective, but consider Alvamind when:

*   You have multiple interacting components or services.
*   You want clear separation of concerns.
*   You need robust dependency injection.
*   You anticipate future growth and want to maintain a structured codebase.
*   You want the benefits of functional programming principles (immutability, pure functions) enforced by the library's structure.

You can start small and add Alvamind modules as needed.

**Q6: Framework Agnostic, but at What Cost?** Does agnosticism lead to *more* integration code?

**A6:** There's a trade-off. Agnosticism offers flexibility, but it *does* mean you'll need to write some integration code for your specific framework. For example, with React, you might create a custom hook to connect Alvamind modules to component state.

However:

*   **Integration is Usually Simple:** This integration is typically straightforward, often just a few lines of code.
*   **Future-Proofing:** Agnosticism makes your core logic less dependent on a specific framework, making it easier to migrate or adapt to new technologies.
*   **Reusable Logic:**  Your Alvamind modules can be used *outside* of your UI (e.g., in server-side code, CLI tools, etc.).
*   **Community Contributions:** We expect the community to develop and share integration helpers for common frameworks.

**Q7: `fp-ts` Integration: Optional or Essential?** Is Alvamind useful *without* `fp-ts`?

**A7:** `fp-ts` is *not* strictly required, but it *significantly enhances* Alvamind's power. You *can* use Alvamind without `fp-ts`:

*   **Basic Functionality:**  Modules, dependency injection, state management, and lifecycle hooks all work without `fp-ts`.
*   **Custom Error Handling:**  You can use standard `try-catch` or other error handling approaches.

However, `fp-ts` provides:

*   **Elegant Error Handling (Either):**  The Railway-Oriented Programming style becomes much easier.
*   **Powerful Composition (pipe, chain):** `fp-ts` unlocks more advanced functional composition techniques.
*   **Controlled Side Effects (Task, TaskEither):**  `fp-ts` helps manage asynchronous operations predictably.

We strongly recommend learning and using `fp-ts` with Alvamind, but it's not a hard requirement.

**Q8: The "Magic" Problem:** Does the playful terminology make Alvamind harder to understand?

**A8:** The terminology ("conjure," "spells") is intended to be engaging, but we understand the concern about "magic." We strive for:

*   **Clear Documentation:**  The documentation explains the *actual* mechanisms behind the "magic."
*   **Conceptual Clarity:**  The core concepts (modules, dependencies, state) are standard software engineering principles.
*   **Open Source:**  The code is available for inspection.

We'll consider adjusting the terminology if it proves to be a barrier to understanding. The goal is to be approachable, not obfuscating.

**Q9: Community and Ecosystem:** Where's the support for a new library?

**A9:** This is a valid concern. As a new library, Alvamind's community is small but growing. We're addressing this by:

*   **Active Development:** We're actively maintaining and improving the library.
*   **Responsive Support:** We're responsive to issues and questions on GitHub.
*   **Comprehensive Documentation:** We're committed to providing clear and thorough documentation.
*   **Community Building:** We're actively engaging with potential users and contributors.
*   **Long-Term Commitment:** We're dedicated to the long-term success of Alvamind.

We encourage you to join the community, ask questions, and contribute!

**Q10: Scalability in *Large* Teams:** How does Alvamind help with *social* scalability?

**A10:** Alvamind provides structural benefits that *aid* large-team scalability, but it's *not* a complete solution for all large-team challenges. It helps by:

*   **Modularity:**  Modules provide natural boundaries for code ownership and reduce conflicts.
*   **Explicit Dependencies:** `use` and `derive` make it clear which modules depend on others, simplifying impact analysis.
*   **Testability:**  Easily testable modules reduce the risk of regressions.
*   **Scope Control** `as:'scoped'` helps prevent access to internal modules.

However, Alvamind *doesn't* directly address:

*   **Code Ownership Enforcement:** You'll still need tools like code review and branch protection.
*   **Access Control (Beyond Scope):** Alvamind doesn't have built-in role-based access control.
*   **Module Versioning:**  You'll need to manage module versions (e.g., using a monorepo and package management).

Alvamind provides a solid *foundation* for large-team development, but it's not a replacement for good development practices and tooling. It's a *tool*, not a silver bullet.
