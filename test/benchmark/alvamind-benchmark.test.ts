/* compare-alvamind.test.ts */
import { Elysia } from "elysia";
import chalk, { Chalk } from 'chalk';
import { treaty } from '@elysiajs/eden';
import Alvamind from "../../src/core/alvamind-core";


// --- Alvamind Implementation ---
function createAlvamindUserSystem() {
  interface UserState { users: Array<{ id: string; name: string }>; currentUser: string | null; }
  return Alvamind<UserState>({
    name: "UserSystem",
    state: { users: [], currentUser: null },
  }).derive(({ state }) => ({
    addUser: (user: { id: string; name: string }) => {
      const current = state.get();
      state.set({ ...current, users: [...current.users, user] });
    },
    login: (userId: string) => {
      const current = state.get();
      if (current.users.find(u => u.id === userId)) {
        state.set({ ...current, currentUser: userId });
        return true;
      }
      return false;
    },
    getCurrentUser: () => {
      const { users, currentUser } = state.get();
      return currentUser ? users.find(u => u.id === currentUser) : null;
    },
    logout: () => {
      const current = state.get();
      state.set({ ...current, currentUser: null });
    },
    getUsers: () => state.get().users,
    getState: () => state.get(),
  }));
}

// --- Elysia Implementation --- (Corrected for Immutability)
function createElysiaUserSystem() {
  interface UserState { users: Array<{ id: string; name: string }>; currentUser: string | null; }
  const initialState: UserState = { users: [], currentUser: null, };

  return new Elysia()
    .state("userState", initialState)
    .derive(({ store: { userState } }) => ({
      addUser: (user: { id: string; name: string }) => {
        const newState: UserState = {
          ...userState,
          users: [...userState.users, user]
        };
        return newState;
      },
      login: (userId: string) => {
        const newState: UserState = {
          ...userState,
          currentUser: userState.users.find(u => u.id === userId) ? userId : userState.currentUser
        }
        return newState;
      },
      getCurrentUser: () => {
        return userState.currentUser ? userState.users.find(u => u.id === userState.currentUser) : null;
      },
      logout: () => {
        const newState: UserState = {
          ...userState,
          currentUser: null
        }
        return newState;
      },
      getUsers: () => userState.users,
      getUserCount: () => userState.users.length,
    }))
    .derive((context) => ({ // Second derive for benchmark, uses functions from the first
      runElysiaBenchmark: (warmupIterations: number, benchmarkIterations: number) => {
        let { addUser, login, getCurrentUser, logout } = context; // Destructure derived functions

        for (let i = 0; i < warmupIterations; i++) {
          context.store.userState = addUser({ id: String(i), name: `Warmup User ${i}` });//assign value directly
          context.store.userState = login(String(i));
          getCurrentUser();
          context.store.userState = logout();
        }

        const startMemory = process.memoryUsage().heapUsed;
        const startCPU = process.cpuUsage();
        const startTime = performance.now();

        for (let i = 0; i < benchmarkIterations; i++) {
          context.store.userState = addUser({ id: String(i), name: `User ${i}` });
          context.store.userState = login(String(i));
          getCurrentUser();
          context.store.userState = logout();
        }

        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        const endCPU = process.cpuUsage(startCPU);
        const duration = endTime - startTime;
        const operationsPerSecond = Math.floor((benchmarkIterations / duration) * 1000);

        return {
          operationsPerSecond,
          memoryUsage: endMemory - startMemory,
          cpuUsage: (endCPU.user + endCPU.system) / 1000,
          methodSharing: false, stateImmutability: true, pluginSystem: true, extensibility: 5, complexity: 4,
        };
      }
    }))
    .post("/benchmark", ({ runElysiaBenchmark }) => runElysiaBenchmark(1000, 10000))
    .get('/user-count', ({ getUserCount }) => ({ count: getUserCount() }));
}


// --- OOP Class-based Implementation ---
class UserSystem {
  protected users: Array<{ id: string; name: string }> = [];
  private currentUser: string | null = null;

  addUser(user: { id: string; name: string }) { this.users.push(user); }
  login(userId: string): boolean {
    if (this.users.find(u => u.id === userId)) { this.currentUser = userId; return true; }
    return false;
  }
  getCurrentUser() { return this.currentUser ? this.users.find(u => u.id === this.currentUser) : null; }
  logout() { this.currentUser = null; }
  getUsers() { return this.users; }
  getUserCount() { return this.users.length; }
}

class ExtendedUserSystem extends UserSystem {
  getUserCount() { return this.users.length; }
}

// --- Plain Object Implementation ---
function createPlainUserSystem() {
  const state = { users: [] as Array<{ id: string; name: string }>, currentUser: null as string | null, };
  return {
    addUser(user: { id: string; name: string }) { state.users.push(user); },
    login(userId: string) {
      if (state.users.find(u => u.id === userId)) { state.currentUser = userId; return true; }
      return false;
    },
    getCurrentUser() { return state.currentUser ? state.users.find(u => u.id === state.currentUser) : null; },
    logout() { state.currentUser = null; },
    getUsers() { return state.users; },
    getState() { return state; },
  };
}

// --- Benchmark and Comparison Logic ---
interface BenchmarkResult {
  name: string; operationsPerSecond: number; memoryUsage: number; cpuUsage: number;
  methodSharing: boolean; stateImmutability: boolean; pluginSystem: boolean;
  extensibility: number; complexity: number;
}

async function runBenchmark(
  name: string, createInstance: () => any,
  warmupIterations: number = 1000, benchmarkIterations: number = 10000,
): Promise<BenchmarkResult> {

  if (name !== "Elysia") {
    const warmupInstance = createInstance();
    for (let i = 0; i < warmupIterations; i++) {
      warmupInstance.addUser({ id: String(i), name: `Warmup User ${i}` });
      warmupInstance.login(String(i)); warmupInstance.getCurrentUser(); warmupInstance.logout();
    }
  }

  const startMemory = process.memoryUsage().heapUsed;
  const startCPU = process.cpuUsage();
  const startTime = performance.now();
  let instance: any;

  if (name === "Elysia") {
    const app = createElysiaUserSystem();
    const api = treaty(app);
    const { data, error } = await api.benchmark.post({}); // Corrected call
    if (error) { console.error("Elysia Benchmark error:", error); throw new Error("Elysia Benchmark failed"); }
    if (!data) throw new Error("Elysia Benchmark returned no data");
    // Now correctly using data from the POST request.
    return { name, ...data };

  }

  instance = createInstance();  // For non-Elysia cases.
  for (let i = 0; i < benchmarkIterations; i++) {
    instance.addUser({ id: String(i), name: `User ${i}` });
    instance.login(String(i)); instance.getCurrentUser(); instance.logout();
  }

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  const endCPU = process.cpuUsage(startCPU);
  const duration = endTime - startTime;
  const operationsPerSecond = Math.floor((benchmarkIterations / duration) * 1000);

  const rawMemoryUsage = endMemory - startMemory; // Keep raw value

  return {
    name, operationsPerSecond, memoryUsage: rawMemoryUsage, // Return raw value in bytes
    cpuUsage: (endCPU.user + endCPU.system) / 1000,
    methodSharing: name === "OOP", stateImmutability: name === "Alvamind" || name === "Elysia", // Elysia is now immutable
    pluginSystem: name === "Alvamind" || name === "Elysia",
    extensibility: name === "Plain" ? 2 : name === "OOP" ? 3 : 5,
    complexity: name === "Plain" ? 1 : name === "OOP" ? 2 : 4,
  };
}

// --- Chalk Styling ---
const titleStyle = chalk.bold.cyanBright;
const subtitleStyle = chalk.magentaBright;
const successStyle = chalk.greenBright.bold;
const warningStyle = chalk.yellowBright.bold;
const errorStyle = chalk.redBright.bold;
const labelStyle = chalk.blueBright;

// --- Table Styling Function ---
function printTable(headers: string[], rows: string[][], columnColors: Chalk[] = []) {
  const columnWidths = headers.map((header, colIndex) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[colIndex] ?? '').length) // Handle undefined/null
    )
  );

  const headerRow = headers
    .map((header, index) => {
      const color = columnColors[index] || chalk.white; // Default to white if no color specified
      return color(header.padEnd(columnWidths[index]));
    })
    .join(" | ");
  console.log(titleStyle(headerRow));

  const separator = columnWidths.map((width) => "─".repeat(width)).join("─┼─");
  console.log(separator);

  for (const row of rows) {
    const coloredRow = row.map((cell, index) => {
      const cellValue = cell ?? ''; // default empty
      const color = columnColors[index] || chalk.white;
      return color(cellValue.padEnd(columnWidths[index]));

    }).join(" | ");
    console.log(coloredRow);
  }
}

async function main() {
  const numRuns = 5;
  const allResults: BenchmarkResult[][] = [];

  for (let i = 0; i < numRuns; i++) {
    console.log(subtitleStyle(`\nRun ${i + 1} of ${numRuns}\n`));
    const results = await Promise.all([
      runBenchmark("Alvamind", createAlvamindUserSystem),
      runBenchmark("Elysia", createElysiaUserSystem),
      runBenchmark("OOP", () => new UserSystem()),
      runBenchmark("Plain", createPlainUserSystem),
    ]);
    allResults.push(results);
    await new Promise(resolve => setTimeout(resolve, 200)); // Short delay
  }

  // --- Average Results ---
  const avgResults: BenchmarkResult[] = allResults[0].map((_, i) => {
    const frameworkResults = allResults.map(run => run[i]);
    const avgOpsPerSecond = Math.round(frameworkResults.reduce((sum, r) => sum + r.operationsPerSecond, 0) / numRuns);
    const avgMemoryUsage = frameworkResults.reduce((sum, r) => sum + r.memoryUsage, 0) / numRuns;
    const avgCpuUsage = frameworkResults.reduce((sum, r) => sum + r.cpuUsage, 0) / numRuns;
    return {
      ...frameworkResults[0],
      operationsPerSecond: avgOpsPerSecond, memoryUsage: avgMemoryUsage, cpuUsage: avgCpuUsage,
    };
  });



  // --- Qualitative Analysis ---
  console.log(titleStyle("\n=== Qualitative Analysis ==="));
  console.log(successStyle("\nAlvamind:"));
  console.log("  - Strengths:  State management, immutability, derived state. Good for complex state logic.");
  console.log("  - Weaknesses: Verbose for simple cases.  Slightly higher learning curve.");

  console.log(warningStyle("\nElysia:"));
  console.log("  - Strengths:  Performance, type safety, developer experience.  Well-suited for APIs.");
  console.log("  - Weaknesses:  HTTP-focused; state management less central, but effective.");

  console.log(errorStyle("\nOOP (Class-based):"));
  console.log("  - Strengths:  Familiar paradigm.  Good encapsulation.");
  console.log("  - Weaknesses:  Mutable state risk.  Can be verbose.");

  console.log(chalk.whiteBright("\nPlain Object:"));
  console.log("  - Strengths:  Simple, minimal overhead.");
  console.log("  - Weaknesses:  Lacks state management, immutability, extensibility.  Not for complex apps.");

  console.log(titleStyle("\n--- Overall Recommendations ---"));
  console.log("- Complex state: Alvamind");
  console.log("- High-performance APIs: Elysia");
  console.log("- Object-oriented design: OOP (with careful state management)");
  console.log("- Small, simple use-cases: Plain Object (consider alternatives as complexity grows)");
  console.log("- When in doubt: Elysia – strong typing, developer experience are valuable.");

  console.log(titleStyle("\nComparison Notes:"));
  console.log(`- ${labelStyle("Alvamind")}: Built for state management, immutability`);
  console.log(`- ${labelStyle("Elysia")}: HTTP-first, strong typing, plugin system`);
  console.log(`- ${labelStyle("OOP")}: Traditional class-based, good encapsulation`);
  console.log(`- ${labelStyle("Plain")}: Simple, limited safety features`);
  console.log(titleStyle("\nNotes:"));
  console.log("- Extensibility: More stars = More extensible");
  console.log("- Complexity: More stars = More complex");
  console.log("- Memory and CPU may vary\n");

  // --- Immutability Test --- (Revised and Corrected)
  console.log(titleStyle("\n--- Immutability Test ---"));

  // Elysia
  const elysiaInstanceForImmutability = createElysiaUserSystem();
  const apiForImmutability = treaty(elysiaInstanceForImmutability);
  await apiForImmutability.benchmark.post({});
  const initialUserCountResponseForElysia = await apiForImmutability['user-count'].get({});
  if (initialUserCountResponseForElysia.error) throw initialUserCountResponseForElysia.error;
  const initialUserCountElysia = initialUserCountResponseForElysia.data?.count || 0;

  // Correct Immutability Test for Elysia: Use framework's update method
  const originalElysiaState = elysiaInstanceForImmutability.store.userState;
  apiForImmutability.benchmark.post({}); // Run benchmark again to update state (using framework methods)
  const stateAfterUpdateElysia = elysiaInstanceForImmutability.store.userState;


  if (originalElysiaState !== stateAfterUpdateElysia) { // Check if state object *changed* (immutable update)
    console.log(successStyle("Elysia: State updated immutably (as expected). New state object created."));
  } else {
    console.log(errorStyle("Elysia: State NOT updated immutably (unexpected). Same state object."));
  }

  // Alvamind
  const alvamindInstance = createAlvamindUserSystem();
  alvamindInstance.addUser({ id: '1', name: 'Test User' });
  const alvamindInitialState = alvamindInstance.getState();

  // Correct Immutability Test for Alvamind: Use framework's update method
  alvamindInstance.addUser({ id: '2', name: 'Another User' }); // Use Alvamind's addUser to update
  const alvamindStateAfterUpdate = alvamindInstance.getState();

  if (alvamindInitialState !== alvamindStateAfterUpdate) { // Check if state object *changed*
    console.log(successStyle("Alvamind: State updated immutably (as expected). New state object created."));
  } else {
    console.log(errorStyle("Alvamind: State NOT updated immutably (unexpected). Same state object."));
  }


  // OOP
  const oopInstance = new UserSystem();
  oopInstance.addUser({ id: '1', name: 'Test User' });
  const oopInitialUsers = oopInstance.getUsers();
  oopInitialUsers.push({ id: '2', name: 'Another User' });
  if (oopInstance.getUsers().length > 1) {
    console.log(errorStyle("OOP: State mutated directly (not immutable)."));
  }

  // Plain Object
  const plainInstance = createPlainUserSystem();
  plainInstance.addUser({ id: '1', name: 'Test User' });
  const plainInitialState = plainInstance.getState();
  plainInitialState.users.push({ id: '2', name: 'Another User' });
  if (plainInstance.getUsers().length > 1) {
    console.log(errorStyle("Plain Object: State mutated directly (not immutable)."));
  }

  // --- Method Sharing Test ---
  console.log(titleStyle("\n--- Method Sharing Test ---"));
  const alvamindInstance1 = createAlvamindUserSystem();
  const alvamindInstance2 = createAlvamindUserSystem();
  console.log("Alvamind: Methods shared:", alvamindInstance1.addUser === alvamindInstance2.addUser);

  const oopInstance1 = new UserSystem();
  const oopInstance2 = new UserSystem();
  console.log("OOP: Methods shared:", oopInstance1.addUser === oopInstance2.addUser);

  const plainInstance1 = createPlainUserSystem();
  const plainInstance2 = createPlainUserSystem();
  console.log("Plain Object: Methods shared:", plainInstance1.addUser === plainInstance2.addUser);

  // --- Extensibility Test ---
  console.log(titleStyle("\n--- Extensibility Test ---"));

  // Alvamind
  const extendedAlvamind = createAlvamindUserSystem().derive(() => ({
    getUserCount: function () { return this.getUsers().length; }
  }));
  console.log("Alvamind Extension (getUserCount):", typeof extendedAlvamind.getUserCount === 'function');

  // Elysia
  const extendedElysiaApp = createElysiaUserSystem();
  const apiForExtension = treaty(extendedElysiaApp);
  const userCountRouteExists = apiForExtension['user-count'] !== undefined;
  console.log("Elysia Extension (/user-count route):", userCountRouteExists);

  // OOP
  const extendedOOP = new ExtendedUserSystem();
  console.log("OOP Extension (ExtendedUserSystem):", typeof extendedOOP.getUserCount === 'function');

  // Plain Object
  const extendedPlain = { ...createPlainUserSystem(), getUserCount: function () { return this.getUsers().length; } };
  console.log("Plain Object Extension (getUserCount):", typeof extendedPlain.getUserCount === 'function');


  // --- Print Results Table ---
  console.log(titleStyle("\n=== Implementation Comparison Results (Average of " + numRuns + " Runs) ===\n"));

  const headers = ["Metric", "Alvamind", "Elysia", "OOP", "Plain"];
  const columnColors = [labelStyle, successStyle, warningStyle, errorStyle, chalk.white];
  const metrics: { [key: string]: (r: BenchmarkResult) => string } = {
    "Ops/sec": r => r.operationsPerSecond.toLocaleString(),
    "Memory (KB)": r => (r.memoryUsage / 1024).toFixed(3), // Display in KB with 3 decimal places
    "CPU (ms)": r => r.cpuUsage.toFixed(2),
    "Method Sharing": r => r.methodSharing ? "Yes" : "No",
    "Immutability": r => r.stateImmutability ? "Yes" : "No",
    "Plugin System": r => r.pluginSystem ? "Yes" : "No",
    "Extensibility": r => "★".repeat(r.extensibility),
    "Complexity": r => "★".repeat(r.complexity),
  };

  const rows = Object.entries(metrics).map(([metric, formatter]) => [
    metric,
    formatter(avgResults[0]),
    formatter(avgResults[1]),
    formatter(avgResults[2]),
    formatter(avgResults[3]),
  ]);

  printTable(headers, rows, columnColors);

  // --- Cleanup ---
  if (typeof global.gc === 'function') {
    global.gc();
  }
}

main().catch(console.error);
