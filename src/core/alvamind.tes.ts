import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach, it } from "bun:test";
import { Alvamind } from "./alvamind";
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
});
