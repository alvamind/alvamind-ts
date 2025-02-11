// src/core/alvamind.test.ts

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
      } as const;

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
          .pipe("process", ({ double, addOne, toString, pipe }) =>
            (input: number) => pipe(
              input,
              double,
              addOne,
              toString
            )
          );

        expect(module.process(5)).toBe("Result: 11");
      });
    });

    describe(".chain()", () => {
      it("should handle Either chains", () => {
        const module = Alvamind({ name: "ChainModule" })
          .derive(({ E }) => ({
            validate: (n: number): E.Either<Error, number> =>
              n > 0 ? E.right(n) : E.left(new Error("Number must be positive")),
            double: (n: number): E.Either<Error, number> => E.right(n * 2)
          }))
          .chain("process", ({ validate, double, pipe, E }) =>
            (input: number): E.Either<Error, number> => pipe(
              validate(input),
              E.chain(double)
            )
          );

        const successResult = module.process(5);
        const errorResult = module.process(-5);

        expect(E.isRight(successResult)).toBe(true);
        if (E.isRight(successResult)) {
          expect(successResult.right).toBe(10);
        }
        expect(E.isLeft(errorResult)).toBe(true);
      });

      it("should handle TaskEither chains", async () => {
        const module = Alvamind({ name: "AsyncChainModule" })
          .derive(({ TE }) => ({
            fetchData: (id: string): TE.TaskEither<Error, string> =>
              TE.tryCatch(
                () => Promise.resolve(`Data for ${id}`),
                (error) => new Error(String(error))
              ),
            processData: (data: string): TE.TaskEither<Error, string> =>
              TE.right(`Processed: ${data}`)
          }))
          .chain("process", ({ fetchData, processData, pipe }) =>
            (id: string): TE.TaskEither<Error, string> => pipe(
              fetchData(id),
              TE.chain(processData)
            )
          );

        const result = await module.process("123")();
        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right).toBe("Processed: Data for 123");
        }
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

    it("should handle errors in chain using Either", () => {
      const module = Alvamind({ name: "EitherErrorModule" })
        .chain("validate", ({ E }) => (input: unknown): E.Either<Error, string> => {
          if (typeof input !== "string") {
            return E.left(new Error("Invalid input"));
          }
          return E.right(input.toUpperCase());
        });

      const successResult = module.validate("test");
      const errorResult = module.validate(123);

      expect(E.isRight(successResult)).toBe(true);
      if (E.isRight(successResult)) {
        expect(successResult.right).toBe("TEST");
      }
      expect(E.isLeft(errorResult)).toBe(true);
    });

    it("should handle async errors using TaskEither", async () => {
      const module = Alvamind({ name: "AsyncErrorModule" })
        .chain("fetchData", ({ TE }) => (shouldFail: boolean): TE.TaskEither<Error, string> =>
          TE.tryCatch(
            () => shouldFail
              ? Promise.reject(new Error("Failed"))
              : Promise.resolve("Success"),
            (error) => new Error(String(error))
          )
        );

      const successResult = await module.fetchData(false)();
      const errorResult = await module.fetchData(true)();

      expect(E.isRight(successResult)).toBe(true);
      if (E.isRight(successResult)) {
        expect(successResult.right).toBe("Success");
      }
      expect(E.isLeft(errorResult)).toBe(true);
    });
  });
});
