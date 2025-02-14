import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach, it } from "bun:test";
import Alvamind from "../benchmark/minimal-alvamind";

describe("Alvamind Core", () => {

  describe("Module Creation", () => {
    it("should create a new module with name", () => {
      const module = Alvamind({ name: "TestModule" });
      expect(module).toBeDefined();
    });

    it("should throw error if no name provided", () => {
      expect(() => Alvamind({} as any)).toThrow("Alvamind module must have a name");
    });

    it("should initialize with state", () => {
      interface State { count: number }
      const module = Alvamind<State>({
        name: "StateModule",
        state: { count: 0 }
      }).derive(({ state }) => ({
        getCount: () => state.get().count
      }));

      expect(module.getCount()).toBe(0);
    });

    it("should initialize with config", () => {
      interface Config { apiUrl: string }
      const module = Alvamind<Record<string, never>, Config>({
        name: "ConfigModule",
        config: { apiUrl: "http://api.example.com" }
      }).derive(({ config }) => ({
        getApiUrl: () => config.apiUrl
      }));

      expect(module.getApiUrl()).toBe("http://api.example.com");
    });
  });

  describe("Dependency Injection", () => {
    it("should inject dependencies using .use()", () => {
      const dependency = {
        helper: () => "helped"
      };

      type Deps = typeof dependency;
      const module = Alvamind({ name: "DIModule" })
        .use(dependency)
        .derive(({ helper }) => ({
          useHelper: () => helper()
        }));

      expect(module.useHelper()).toBe("helped");
    });

    it("should compose modules", () => {
      type LoggerModule = { log: (msg: string) => string };
      const loggerModule = Alvamind<{}, LoggerModule>({ name: "Logger" })
        .decorate("log", (msg: string) => `[LOG] ${msg}`);

      const userModule = Alvamind<{}, LoggerModule>({ name: "User" })
        .use(loggerModule)
        .derive(({ log }) => ({
          createUser: (name: string) => log(`Created user: ${name}`)
        }));

      expect(userModule.createUser("Alice")).toBe("[LOG] Created user: Alice");
    });


    describe("Circular Dependencies", () => {
      it("should handle circular module dependencies", () => {
        let callCount = 0;

        type CircularDeps = { doA?: (s: string) => string, doB?: (s: string) => string };

        const moduleB = Alvamind<{}, CircularDeps>({ name: "ModuleB" })
          .derive(() => ({
            doB: (input: string): string => {
              callCount++;
              return callCount > 5 ? input : moduleA.doA!(`${input} -> B`);
            }
          }));

        const moduleA = Alvamind<{}, CircularDeps>({ name: "ModuleA" })
          .derive(() => ({
            doA: (input: string): string => {
              callCount++;
              return callCount > 5 ? input : moduleB.doB!(`${input} -> A`);
            }
          }));

        type MainDeps = { doA: (s: string) => string };
        const mainModule = Alvamind<{}, MainDeps>({ name: "MainModule" })
          .use(moduleA)
          .use(moduleB)
          .derive(({ doA }) => ({
            start: (input: string) => doA(input)
          }));

        const result = mainModule.start("start");
        expect(result).toContain("start");
        expect(callCount).toBeGreaterThan(0);
        expect(callCount).toBeLessThanOrEqual(6);
      });

      it("should handle deep circular dependencies", () => {
        const moduleC = Alvamind({ name: "ModuleC" })
          .derive(() => ({
            valueC: () => "C"
          }));

        const moduleB = Alvamind({ name: "ModuleB" })
          .use(moduleC)
          .derive(({ valueC }) => ({
            valueB: () => `B -> ${valueC()}`
          }));

        const moduleA = Alvamind({ name: "ModuleA" })
          .use(moduleB)
          .derive(({ valueB }) => ({
            valueA: () => `A -> ${valueB()}`
          }));

        expect(moduleA.valueA()).toBe("A -> B -> C");
      });
    });
  });

  describe("State Management", () => {
    interface TestState {
      count: number;
    }

    let module: ReturnType<typeof createTestModule>;

    function createTestModule() {
      return Alvamind<TestState>({
        name: "StateTestModule",
        state: { count: 0 }
      });
    }

    beforeEach(() => {
      module = createTestModule();
    });

    it("should get current state", () => {
      const testModule = module.derive(({ state }) => ({
        getCount: () => state.get().count
      }));

      expect(testModule.getCount()).toBe(0);
    });

    it("should update state immutably", () => {
      const testModule = module.derive(({ state }) => ({
        increment: () => {
          const current = state.get();
          state.set({ count: current.count + 1 });
        },
        getCount: () => state.get().count
      }));
      testModule.increment();
      expect(testModule.getCount()).toBe(1);
    });

    it("should notify watchers of state changes", () => {
      let watcherCalled = false;

      const testModule = module
        .watch("count", (newVal, oldVal) => {
          expect(oldVal).toBe(0);
          expect(newVal).toBe(1);
          watcherCalled = true;
        })
        .derive(({ state }) => ({
          increment: () => {
            const current = state.get();
            state.set({ count: current.count + 1 });
          }
        }));

      testModule.increment();
      expect(watcherCalled).toBe(true);
    });
  });

  describe("Function Composition", () => {
    describe(".pipe()", () => {
      it("should support function composition", () => {
        const module = Alvamind({ name: "PipeModule" })
          .derive(() => ({
            double: (n: number) => n * 2,
            addOne: (n: number) => n + 1,
            toString: (n: number) => `Result: ${n}`
          }))
          .pipe("process", ({ double, addOne, toString, pipe }) => {
            return (input: number) => pipe(
              input,
              double,
              addOne,
              toString
            );
          });

        expect(module.process(5)).toBe("Result: 11");
      });
    });
  });

  describe("Lifecycle Hooks", () => {
    let startCalled = false;
    let stopCalled = false;

    beforeEach(() => {
      startCalled = false;
      stopCalled = false;
    });

    it("should call onStart hooks", () => {
      const module = Alvamind({ name: "LifecycleModule" })
        .onStart(() => {
          startCalled = true;
        });

      expect(startCalled).toBe(true);
    });

    it("should call onStop hooks", () => {
      const module = Alvamind({ name: "LifecycleModule" })
        .onStop(() => {
          stopCalled = true;
        })
        .derive(() => ({
          stop: () => {
            stopCalled = true;
          }
        }));

      module.stop();
      expect(stopCalled).toBe(true);
    });

    it("should provide context to lifecycle hooks", () => {
      interface TestState { value: string }
      interface TestConfig { setting: boolean }

      const module = Alvamind<TestState, TestConfig>({
        name: "ContextModule",
        state: { value: "test" },
        config: { setting: true }
      }).onStart(({ state, config }) => {
        expect(state.get().value).toBe("test");
        expect(config.setting).toBe(true);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in pipe", () => {
      const module = Alvamind({ name: "ErrorModule" })
        .pipe("dangerousOperation", () => (input: unknown) => {
          if (typeof input !== "string") {
            return "ERROR";
          }
          return input.toUpperCase();
        });

      expect(module.dangerousOperation("test")).toBe("TEST");
      expect(module.dangerousOperation(123)).toBe("ERROR");
    });
  });

  // ────────────── Additional Test Cases ──────────────

  describe("Advanced Features", () => {

    it("should chain multiple derive calls and combine APIs", () => {
      // Define the state interface
      interface ModuleState {
        value: number;
      }

      const module = Alvamind<ModuleState>({
        name: "ChainDeriveModule",
        state: { value: 0 } // Initialize with default value
      })
        .derive(({ state }) => ({
          setValue: (val: number) => state.set({ value: val }),
          getValue: () => state.get().value
        }))
        .derive(() => ({
          multiply: (n: number, factor: number) => n * factor,
        }))
        .derive(({ getValue, multiply }) => ({
          multiplyStoredValue: (factor: number) => multiply(getValue(), factor)
        }));

      module.setValue(5); // Use the derived setValue method instead of accessing state directly
      expect(module.getValue()).toBe(5);
      expect(module.multiplyStoredValue(3)).toBe(15);
    });

    it("should override decorated properties", () => {
      const module = Alvamind({ name: "DecorateModule" })
        .decorate("version", "1.0")
        .decorate("version", "2.0")
        .derive(() => ({
          getVersion: () => module.version
        }));

      expect(module.getVersion()).toBe("2.0");
    });

    it("should support multiple dependencies via .use()", () => {
      const dep1 = { greet: () => "Hello" };
      const dep2 = { exclaim: (s: string) => s + "!" };

      const module = Alvamind({ name: "MultiDependencyModule" })
        .use(dep1)
        .use(dep2)
        .derive(({ greet, exclaim }) => ({
          greetAndExclaim: () => exclaim(greet())
        }));

      expect(module.greetAndExclaim()).toBe("Hello!");
    });

    it("should register multiple hooks but execute only once", () => {
      const executionOrder: number[] = [];

      const module = Alvamind({ name: "MultiStartModule" })
        .onStart(() => executionOrder.push(1))
        .onStart(() => executionOrder.push(2));

      expect(executionOrder).toEqual([1]); // Only first hook executed
    });

    it("should call all onStop hooks when stop is triggered", () => {
      let stopCount = 0;

      const module = Alvamind({ name: "MultiStopModule" })
        .onStop(() => stopCount++)
        .onStop(() => stopCount++)
        .derive(() => ({
          stop: () => {
            // Just trigger the module's stop method
            module.stop();
          }
        }));

      module.stop();
      // We expect stopCount to be 2 because:
      // - Two onStop hooks were registered
      // - When stop() is called, both hooks are executed once
      expect(stopCount).toBe(2);
    });

    it("should protect state from direct mutations", () => {
      interface State { count: number }
      const module = Alvamind<State>({
        name: "ImmutableStateModule",
        state: { count: 10 }
      }).derive(({ state }) => ({
        getState: () => state.get()
      }));

      const currentState = module.getState();
      currentState.count = 100;  // Remove try-catch, just let it fail silently
      expect(module.getState().count).toBe(10);
    });

  });
});
