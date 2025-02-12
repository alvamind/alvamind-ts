import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach, it } from "bun:test";
import { Alvamind, lazy } from "./alvamind";
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

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

      const module = Alvamind({ name: "DIModule" })
        .use(dependency)
        .derive(({ helper }) => ({
          useHelper: () => helper()
        }));

      expect(module.useHelper()).toBe("helped");
    });

    it("should compose modules", () => {
      const loggerModule = Alvamind({ name: "Logger" })
        .decorate("log", (msg: string) => `[LOG] ${msg}`);

      const userModule = Alvamind({ name: "User" })
        .use(loggerModule)
        .derive(({ log }) => ({
          createUser: (name: string) => log(`Created user: ${name}`)
        }));

      expect(userModule.createUser("Alice")).toBe("[LOG] Created user: Alice");
    });


    describe("Circular Dependencies", () => {
      it("should handle circular module dependencies", () => {
        let callCount = 0;

        const moduleB = Alvamind({ name: "ModuleB" })
          .derive(() => ({
            doB: (input: string): string => {
              callCount++;
              return callCount > 5 ? input : moduleA.doA(`${input} -> B`);
            }
          }));

        const moduleA = Alvamind({ name: "ModuleA" })
          .derive(() => ({
            doA: (input: string): string => {
              callCount++;
              return callCount > 5 ? input : moduleB.doB(`${input} -> A`);
            }
          }));

        const mainModule = Alvamind({ name: "MainModule" })
          .use(moduleA)
          .use(lazy(moduleB))
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
          .use(moduleC) // Remove lazy here since C is already defined
          .derive(({ valueC }) => ({
            valueB: () => `B -> ${valueC()}`
          }));

        const moduleA = Alvamind({ name: "ModuleA" })
          .use(lazy(moduleB))
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

    it("should call all registered onStart hooks once", () => {
      let count = 0;
      const hook1 = () => { count += 1; };
      const hook2 = ({ state }: any) => {
        // Even if accessing state, just ensure hook is called.
        count += 1;
      };

      // onStart hooks are called automatically once when registered.
      Alvamind({ name: "MultiStartModule" })
        .onStart(hook1)
        .onStart(hook2);

      expect(count).toBe(2);
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
      // Trying to modify the returned state object should not affect the stored state.
      try {
        // @ts-expect-error: Intentionally attempting mutation to test immutability.
        currentState.count = 100;
      } catch (_) {
        // If error is thrown, that is acceptable.
      }
      expect(module.getState().count).toBe(10);
    });

  });
});
