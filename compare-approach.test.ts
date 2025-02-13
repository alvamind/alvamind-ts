import { expect, test, describe } from "bun:test";

// Common interface for all implementations
interface Instance {
  setState(updates: Record<string, any>): Instance;
  getState(): { name: string; count: number };
  addHook(fn: Function): Instance;
  derive(fn: (instance: Instance) => Record<string, any>): Instance;
  use(plugin: Record<string, any>): Instance;
}

// 1. Class-based Implementation
class ClassBased implements Instance {
  private state: { name: string; count: number };
  private hooks: Function[] = [];

  constructor(config: { name: string }) {
    this.state = { name: config.name, count: 0 };
  }

  setState(updates: Partial<typeof this.state>) {
    this.state = { ...this.state, ...updates };
    return this;
  }

  getState() {
    return this.state;
  }

  addHook(fn: Function) {
    this.hooks.push(fn);
    return this;
  }

  derive(fn: (instance: this) => Record<string, any>) {
    Object.assign(this, fn(this));
    return this;
  }

  use(plugin: Record<string, any>) {
    Object.assign(this, plugin);
    return this;
  }
}

// 2. Factory with WeakMap (Hybrid Approach)
const instanceState = new WeakMap<object, {
  state: { name: string; count: number };
  hooks: Function[];
}>();

const factoryProto = {
  setState(updates: Record<string, any>) {
    const internal = instanceState.get(this)!;
    internal.state = { ...internal.state, ...updates };
    return this;
  },

  getState() {
    return instanceState.get(this)!.state;
  },

  addHook(fn: Function) {
    const internal = instanceState.get(this)!;
    internal.hooks.push(fn);
    return this;
  },

  derive(fn: (instance: any) => Record<string, any>) {
    Object.assign(this, fn(this));
    return this;
  },

  use(plugin: Record<string, any>) {
    Object.assign(this, plugin);
    return this;
  }
};

function FactoryWithWeakMap(config: { name: string }): Instance {
  const instance = Object.create(factoryProto);
  instanceState.set(instance, {
    state: { name: config.name, count: 0 },
    hooks: []
  });
  return instance as Instance;
}

// 3. Simple Factory (Closure-based)
function SimpleFactory(config: { name: string }): Instance {
  const state = { name: config.name, count: 0 };
  const hooks: Function[] = [];

  return {
    setState(updates: Partial<typeof state>) {
      Object.assign(state, updates);
      return this;
    },

    getState() {
      return state;
    },

    addHook(fn: Function) {
      hooks.push(fn);
      return this;
    },

    derive(fn: (instance: any) => Record<string, any>) {
      Object.assign(this, fn(this));
      return this;
    },

    use(plugin: Record<string, any>) {
      Object.assign(this, plugin);
      return this;
    }
  };
}

describe("Implementation Comparison", () => {
  describe("Functionality Tests", () => {
    test("all implementations should handle basic operations", () => {
      const implementations: Record<string, Instance> = {
        class: new ClassBased({ name: "test" }),
        weakMap: FactoryWithWeakMap({ name: "test" }),
        simple: SimpleFactory({ name: "test" })
      };

      for (const [name, instance] of Object.entries(implementations)) {
        // Test state management
        expect(instance.getState().name).toBe("test");
        instance.setState({ count: 1 });
        expect(instance.getState().count).toBe(1);

        // Test method chaining
        instance
          .setState({ count: 2 })
          .addHook(() => { });
        expect(instance.getState().count).toBe(2);

        // Test derive
        instance.derive((self) => ({
          doubled: () => self.getState().count * 2
        }));
        expect((instance as any).doubled()).toBe(4);

        // Test plugin system
        instance.use({
          newMethod: () => 'plugin'
        });
        expect((instance as any).newMethod()).toBe('plugin');
      }
    });
  });

  describe("Memory Usage", () => {
    test("memory consumption for multiple instances", () => {
      const createMany = (factory: (config: { name: string }) => Instance, count: number): Instance[] => {
        const instances: Instance[] = [];
        for (let i = 0; i < count; i++) {
          instances.push(factory({ name: `test${i}` }));
        }
        return instances;
      };

      const COUNT = 10000;

      // Measure memory before
      const beforeMemory = process.memoryUsage();

      // Create instances
      const classInstances = createMany((config) => new ClassBased(config), COUNT);
      const weakMapInstances = createMany(FactoryWithWeakMap, COUNT);
      const simpleInstances = createMany(SimpleFactory, COUNT);

      // Measure memory after
      const afterMemory = process.memoryUsage();

      // Log memory differences
      console.log('Memory Impact (bytes):');
      console.log('  Heap Used:', afterMemory.heapUsed - beforeMemory.heapUsed);
      console.log('  RSS:', afterMemory.rss - beforeMemory.rss);

      // Ensure instances work
      expect(classInstances[0].getState().name).toBe('test0');
      expect(weakMapInstances[0].getState().name).toBe('test0');
      expect(simpleInstances[0].getState().name).toBe('test0');
    });
  });

  describe("Performance Benchmarks", () => {
    const ITERATIONS = 100000; // Increased for more noticeable differences

    interface BenchmarkResult {
      duration: number;
      memoryBefore: NodeJS.MemoryUsage;
      memoryAfter: NodeJS.MemoryUsage;
      opsPerSecond: number;
    }

    function runBenchmark(
      implementation: (config: { name: string }) => Instance
    ): BenchmarkResult {
      // Garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryBefore = process.memoryUsage();
      const startTime = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        const instance = implementation({ name: "test" });
        instance
          .setState({ count: i })
          .derive((self) => ({
            double: () => self.getState().count * 2
          }))
          .addHook(() => { });
        instance.getState();
        (instance as any).double();
      }

      const duration = performance.now() - startTime;
      const memoryAfter = process.memoryUsage();
      const opsPerSecond = Math.floor((ITERATIONS / duration) * 1000);

      return {
        duration,
        memoryBefore,
        memoryAfter,
        opsPerSecond
      };
    }

    function formatMemory(bytes: number): string {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    function formatNumber(num: number): string {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    test("Comparative Performance Analysis", () => {
      console.log("\n=== Performance Benchmark Results ===");
      console.log(`Iterations: ${formatNumber(ITERATIONS)}\n`);

      const implementations = {
        "Class-based": (config: { name: string }) => new ClassBased(config),
        "WeakMap Factory": FactoryWithWeakMap,
        "Simple Factory": SimpleFactory
      };

      const results: Record<string, BenchmarkResult> = {};

      // Run benchmarks
      for (const [name, impl] of Object.entries(implementations)) {
        results[name] = runBenchmark(impl);
      }

      // Find the fastest implementation
      const fastest = Object.entries(results).reduce((a, b) =>
        a[1].duration < b[1].duration ? a : b
      );

      // Display results in a table format
      console.log("Performance Metrics:");
      console.log("-".repeat(80));
      console.log(
        "Implementation".padEnd(20),
        "Duration".padEnd(15),
        "Ops/Sec".padEnd(15),
        "Memory Impact".padEnd(15)
      );
      console.log("-".repeat(80));

      for (const [name, result] of Object.entries(results)) {
        const memoryImpact = result.memoryAfter.heapUsed - result.memoryBefore.heapUsed;
        const compareToFastest = ((result.duration - fastest[1].duration) / fastest[1].duration * 100).toFixed(1);
        const isFastest = name === fastest[0];

        console.log(
          name.padEnd(20),
          `${result.duration.toFixed(2)}ms`.padEnd(15),
          formatNumber(result.opsPerSecond).padEnd(15),
          formatMemory(memoryImpact).padEnd(15),
          isFastest ? "(Fastest)" : `(+${compareToFastest}%)`
        );
      }

      console.log("-".repeat(80));
      console.log("\nMemory Usage Details:");

      for (const [name, result] of Object.entries(results)) {
        console.log(`\n${name}:`);
        console.log(`  Heap Used: ${formatMemory(result.memoryAfter.heapUsed - result.memoryBefore.heapUsed)}`);
        console.log(`  RSS Delta: ${formatMemory(result.memoryAfter.rss - result.memoryBefore.rss)}`);
      }

      // Assertions to ensure the test passes
      Object.values(results).forEach(result => {
        expect(result.duration).toBeGreaterThan(0);
        expect(result.opsPerSecond).toBeGreaterThan(0);
      });
    });
  });

  describe("Method Sharing", () => {
    test("method sharing between instances", () => {
      // Class
      const class1 = new ClassBased({ name: "test1" });
      const class2 = new ClassBased({ name: "test2" });
      expect(class1.setState === class2.setState).toBe(true);

      // WeakMap Factory
      const factory1 = FactoryWithWeakMap({ name: "test1" });
      const factory2 = FactoryWithWeakMap({ name: "test2" });
      expect(factory1.setState === factory2.setState).toBe(true);

      // Simple Factory
      const simple1 = SimpleFactory({ name: "test1" });
      const simple2 = SimpleFactory({ name: "test2" });
      expect(simple1.setState === simple2.setState).toBe(false);
    });
  });

  describe("Inheritance & Extension", () => {
    test("extending functionality", () => {
      // Class Extension
      class ExtendedClass extends ClassBased {
        newMethod() { return 'extended'; }
      }
      const extendedClass = new ExtendedClass({ name: "test" });
      expect(extendedClass.newMethod()).toBe('extended');

      // Factory Extension
      function ExtendedFactory(config: { name: string }): Instance & { newMethod: () => string } {
        const base = FactoryWithWeakMap(config);
        return Object.assign(base, {
          newMethod: () => 'extended'
        });
      }
      const extendedFactory = ExtendedFactory({ name: "test" });
      expect(extendedFactory.newMethod()).toBe('extended');

      // Simple Factory Extension
      function ExtendedSimple(config: { name: string }): Instance & { newMethod: () => string } {
        const base = SimpleFactory(config);
        return Object.assign(base, {
          newMethod: () => 'extended'
        });
      }
      const extendedSimple = ExtendedSimple({ name: "test" });
      expect(extendedSimple.newMethod()).toBe('extended');
    });
  });

  describe("Type Checking", () => {
    test("instance type checking", () => {
      const classInstance = new ClassBased({ name: "test" });
      const factoryInstance = FactoryWithWeakMap({ name: "test" });
      const simpleInstance = SimpleFactory({ name: "test" });

      expect(classInstance instanceof ClassBased).toBe(true);
      expect(factoryInstance instanceof ClassBased).toBe(false);
      expect(simpleInstance instanceof ClassBased).toBe(false);
    });
  });
});
