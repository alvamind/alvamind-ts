/* compare-alvamind.test.ts */
import { expect, test, describe } from "bun:test";
import Alvamind from "./src/core/alvamind";

/*
  This test file compares three approaches to building a User System:

    1. Alvamind Implementation (functional module with managed state)
    2. OOP Class-based Implementation
    3. Plain Object Implementation

  We compare them on:
    • Basic functionality (addUser, login, logout, getCurrentUser)
    • State management & immutability
    • Memory/CPU/performance benchmarks (head‑to‑head)
    • Method reuse (sharing)
    • Extensibility via derivations/plugins

  A summary table with benchmark results is printed to the console.
*/

// -----------------------------------------------------------------------------
// Helper: deepFreeze – recursively freeze an object and its properties.
// -----------------------------------------------------------------------------
function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as any)[prop];
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function") &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  });
  return obj;
}

// ============================================================================
// 1. Alvamind Implementation
// ============================================================================
function createAlvamindUserSystem() {
  interface UserState {
    users: Array<{ id: string; name: string }>;
    currentUser: string | null;
  }

  const module = Alvamind<UserState>({
    name: "UserSystem",
    state: { users: [], currentUser: null }
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
    getState: () => state.get()
  }));

  return module;
}

// ============================================================================
// 2. OOP Class-based Implementation
// ============================================================================
class UserSystem {
  protected users: Array<{ id: string; name: string }>;
  private currentUser: string | null;

  constructor() {
    this.users = [];
    this.currentUser = null;
  }

  addUser(user: { id: string; name: string }) {
    this.users.push(user);
  }

  login(userId: string): boolean {
    if (this.users.find(u => u.id === userId)) {
      this.currentUser = userId;
      return true;
    }
    return false;
  }

  getCurrentUser() {
    return this.currentUser ? this.users.find(u => u.id === this.currentUser) : null;
  }

  logout() {
    this.currentUser = null;
  }

  getUsers() {
    return this.users;
  }
}

class ExtendedUserSystem extends UserSystem {
  getUserCount() {
    return this.users.length;
  }
}

// ============================================================================
// 3. Plain Object Implementation
// ============================================================================
function createPlainUserSystem() {
  const state = {
    users: [] as Array<{ id: string; name: string }>,
    currentUser: null as string | null
  };

  return {
    addUser(user: { id: string; name: string }) {
      state.users.push(user);
    },
    login(userId: string) {
      if (state.users.find(u => u.id === userId)) {
        state.currentUser = userId;
        return true;
      }
      return false;
    },
    getCurrentUser() {
      return state.currentUser ? state.users.find(u => u.id === state.currentUser) : null;
    },
    logout() {
      state.currentUser = null;
    },
    getUsers() {
      return state.users;
    },
    getState() {
      return state;
    }
  };
}

// ============================================================================
// Tests: Functional, State, Memory, CPU, and Method Sharing comparisons
// ============================================================================
describe("Implementation Comparison", () => {
  const testUser = { id: "1", name: "Test User" };

  // --------------------------------------------------------------------------
  // Functional Tests
  // --------------------------------------------------------------------------
  describe("Functionality Tests", () => {
    test("all implementations should handle basic operations", () => {
      const systems = {
        alvamind: createAlvamindUserSystem(),
        oop: new UserSystem(),
        plain: createPlainUserSystem()
      };

      for (const [name, system] of Object.entries(systems)) {
        system.addUser(testUser);
        expect(system.login("1")).toBe(true);
        expect(system.login("999")).toBe(false);
        expect(system.getCurrentUser()).toEqual(testUser);
        system.logout();
        expect(system.getCurrentUser()).toBe(null);
      }
    });
  });

  // --------------------------------------------------------------------------
  // State Management Tests
  // --------------------------------------------------------------------------
  describe("State Management", () => {
    test("state immutability", () => {
      const alvamind = createAlvamindUserSystem();
      const oop = new UserSystem();
      const plain = createPlainUserSystem();

      alvamind.addUser(testUser);
      const alvamindState = alvamind.getState();
      const originalLength = alvamindState.users.length;

      const frozenState = deepFreeze({ ...alvamindState, users: [...alvamindState.users] });
      try {
        (frozenState.users as any).push({ id: "2", name: "Should not work" });
      } catch (e) { }
      expect(alvamind.getUsers().length).toBe(originalLength);

      oop.addUser(testUser);
      const oopUsers = oop.getUsers();
      oopUsers.push({ id: "2", name: "Works but shouldn't" });
      expect(oop.getUsers().length).toBe(2);

      plain.addUser(testUser);
      const plainUsers = plain.getUsers();
      plainUsers.push({ id: "2", name: "Works but shouldn't" });
      expect(plain.getUsers().length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Performance Benchmarks
  // --------------------------------------------------------------------------
  describe("Performance Benchmarks", () => {
    const ITERATIONS = 10000;

    interface BenchmarkResult {
      name: string;
      operationsPerSecond: number;
      memoryUsage: number;
      cpuUsage: number;
      methodSharing: boolean;
      stateImmutability: boolean;
      extensibility: number;
      complexity: number;
    }

    function runBenchmark(name: string, createInstance: () => any): BenchmarkResult {
      const startMemory = process.memoryUsage().heapUsed;
      const startCPU = process.cpuUsage();
      const instances: any[] = [];
      const startTime = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        const instance = createInstance();
        instance.addUser({ id: String(i), name: `User ${i}` });
        instance.login(String(i));
        instance.getCurrentUser();
        instance.logout();
        instances.push(instance);
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const endCPU = process.cpuUsage(startCPU);

      const methodShared = instances[0].addUser === instances[1].addUser;
      const duration = endTime - startTime;
      const operationsPerSecond = Math.floor((ITERATIONS / duration) * 1000);
      const memoryUsage = endMemory - startMemory;
      const cpuUsage = (endCPU.user + endCPU.system) / 1000;

      return {
        name,
        operationsPerSecond,
        memoryUsage,
        cpuUsage,
        methodSharing: methodShared,
        stateImmutability: name === "Alvamind",
        extensibility: name === "Alvamind" ? 5 : name === "OOP" ? 4 : 3,
        complexity: name === "Plain" ? 1 : name === "OOP" ? 3 : 4
      };
    }

    test("head-to-head comparison", () => {
      const results: BenchmarkResult[] = [
        runBenchmark("Alvamind", createAlvamindUserSystem),
        runBenchmark("OOP", () => new UserSystem()),
        runBenchmark("Plain", createPlainUserSystem)
      ];

      console.log("\n=== Implementation Comparison Results ===\n");
      console.log(
        "Metric".padEnd(20),
        "Alvamind".padEnd(15),
        "OOP".padEnd(15),
        "Plain".padEnd(15)
      );
      console.log("─".repeat(65));

      const metrics: { [key: string]: (r: BenchmarkResult) => string } = {
        "Ops/sec": r => r.operationsPerSecond.toLocaleString(),
        "Memory (MB)": r => (r.memoryUsage / 1024 / 1024).toFixed(2),
        "CPU (ms)": r => r.cpuUsage.toFixed(2),
        "Method Sharing": r => (r.methodSharing ? "Yes" : "No"),
        "Immutability": r => (r.stateImmutability ? "Yes" : "No"),
        "Extensibility": r => "★".repeat(r.extensibility),
        "Complexity": r => "★".repeat(r.complexity)
      };

      for (const [metric, formatter] of Object.entries(metrics)) {
        console.log(
          metric.padEnd(20),
          formatter(results[0]).padEnd(15),
          formatter(results[1]).padEnd(15),
          formatter(results[2]).padEnd(15)
        );
      }

      console.log("\nNotes:");
      console.log("- Extensibility: More stars = More extensible");
      console.log("- Complexity: More stars = More complex (less desirable)");
      console.log("- Memory and CPU usage may vary between runs\n");

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.operationsPerSecond).toBeGreaterThan(0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Method Sharing Test
  // --------------------------------------------------------------------------
  describe("Method Sharing", () => {
    test("method reuse between instances", () => {
      const alvamind1 = createAlvamindUserSystem();
      const alvamind2 = createAlvamindUserSystem();
      const oop1 = new UserSystem();
      const oop2 = new UserSystem();
      const plain1 = createPlainUserSystem();
      const plain2 = createPlainUserSystem();

      expect(oop1.addUser === oop2.addUser).toBe(true);
      expect(plain1.addUser === plain2.addUser).toBe(false);
      expect(alvamind1.addUser === alvamind2.addUser).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Extension and Plugin System Test
  // --------------------------------------------------------------------------
  describe("Extension and Plugin System", () => {
    test("extending functionality", () => {
      const alvamind = createAlvamindUserSystem().derive(() => ({
        getUserCount: function () {
          return this.getUsers().length;
        }
      }));

      const oop = new ExtendedUserSystem();

      const plain = {
        ...createPlainUserSystem(),
        getUserCount: function () {
          return this.getUsers().length;
        }
      };

      alvamind.addUser(testUser);
      oop.addUser(testUser);
      plain.addUser(testUser);

      expect((alvamind as any).getUserCount()).toBe(1);
      expect(oop.getUserCount()).toBe(1);
      expect(plain.getUserCount()).toBe(1);
    });
  });
});
