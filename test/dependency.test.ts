import { expect, it, describe } from "bun:test";
import Alvamind from "../src/core/alvamind-core";
import type { Core } from "../src/core/alvamind-core";

describe('Alvamind Dependency Injection and Module Composition', () => {
    // Type definitions for type safety checks
    type ModuleA = {
        moduleA: {
            value: string;
        }
    };

    type ModuleB = {
        moduleB: {
            getValue: () => string;
        }
    };

    it('should allow basic dependency injection with type safety', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    value: 'Module A'
                }
            }));

        // Type check moduleA
        const typedModuleA: Core<{}, {}, ModuleA> = moduleA;
        expect(typeof typedModuleA.moduleA.value).toBe('string');

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(({ moduleA: { value } }): ModuleB => ({
                moduleB: {
                    getValue: () => `Module B depends on ${value}`
                }
            }));

        // Type check moduleB
        const typedModuleB: Core<{}, {}, ModuleA & ModuleB> = moduleB;
        expect(typeof typedModuleB.moduleB.getValue()).toBe('string');
    });

    // Add type definitions for multiple dependencies
    type MultiModuleC = {
        moduleC: {
            getValue: () => string;
        }
    };

    it('should handle multiple dependencies with type safety', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive((): ModuleA => ({
                moduleA: {
                    value: 'Module A'
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .derive(() => ({
                moduleB: {
                    value: 'Module B'
                }
            }));

        const moduleC = Alvamind({ name: 'moduleC' })
            .use(moduleA)
            .use(moduleB)
            .derive(({ moduleA: { value: valueA }, moduleB: { value: valueB } }): MultiModuleC => ({
                moduleC: {
                    getValue: () => `Module C depends on ${valueA} and ${valueB}`
                }
            }));

        // Type checks
        type ExpectedType = Core<{}, {}, ModuleA & { moduleB: { value: string } } & MultiModuleC>;
        const typedModuleC: ExpectedType = moduleC;

        expect(typeof typedModuleC.moduleC.getValue()).toBe('string');
        // @ts-expect-error - Should not allow accessing non-existent properties
        typedModuleC.moduleC.nonExistentMethod;
    });

    // Add type definitions for async operations
    interface AsyncModuleA {
        serviceA: {
            getData: () => Promise<string>;
        }
    }

    interface AsyncModuleB {
        serviceB: {
            getData: () => Promise<string>;
        }
    }

    it('should handle async circular dependencies with type safety', async () => {
        const serviceA = Alvamind({ name: 'serviceA' });
        const serviceB = Alvamind({ name: 'serviceB' });

        // Initialize with default values first
        serviceA.derive((): AsyncModuleA => ({
            serviceA: {
                getData: async () => 'default A'
            }
        }));

        serviceB.derive((): AsyncModuleB => ({
            serviceB: {
                getData: async () => 'default B'
            }
        }));

        // Then establish dependencies
        serviceA.use(serviceB);
        serviceB.use(serviceA);

        const result = await serviceA.serviceA.getData();
        expect(typeof result).toBe('string');
    });

    // Add type definitions for state management
    interface CounterState {
        count: number;
    }

    interface WorkerModule {
        worker: {
            increment: () => Promise<number>;
        }
    }


    // Add type definitions for error handling
    interface ErrorModule {
        error: {
            throwError: () => Promise<never>;
            safeOperation: () => Promise<string>;
        }
    }

    interface HandlerModule {
        handler: {
            handle: () => Promise<string>;
        }
    }

    it('should handle error propagation with type safety', async () => {
        const errorModule = Alvamind({ name: 'error' })
            .derive((): ErrorModule => ({
                error: {
                    throwError: async () => {
                        throw new Error('Test error');
                    },
                    safeOperation: async () => {
                        return 'operation completed';
                    }
                }
            }));

        const handlerModule = Alvamind({ name: 'handler' })
            .use(errorModule)
            .derive(({ error }): HandlerModule => ({
                handler: {
                    handle: async () => {
                        try {
                            await error.throwError();
                            return 'success';
                        } catch (e) {
                            return 'caught error';
                        }
                    }
                }
            }));

        // Type checks
        type ExpectedErrorType = Core<{}, {}, ErrorModule & HandlerModule>;
        const typedError: ExpectedErrorType = errorModule.use(handlerModule);

        const result = await typedError.handler.handle();
        expect(typeof result).toBe('string');

        // @ts-expect-error - Should not allow accessing non-existent methods
        await typedError.handler.nonExistentMethod();

        // @ts-expect-error - Should not allow using result before awaiting
        typedError.handler.handle().toLowerCase();
    });

    it('should allow basic dependency injection', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    value: 'Module A'
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(({ moduleA: { value } }) => ({
                moduleB: {
                    getValue: () => `Module B depends on ${value}`
                }
            }));

        expect(moduleB.moduleB.getValue()).toBe('Module B depends on Module A');
    });

    it('should handle multiple dependencies', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    value: 'Module A'
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .derive(() => ({
                moduleB: {
                    value: 'Module B'
                }
            }));

        const moduleC = Alvamind({ name: 'moduleC' })
            .use(moduleA)
            .use(moduleB)
            .derive(({ moduleA: { value: valueA }, moduleB: { value: valueB } }) => ({
                moduleC: {
                    getValue: () => `Module C depends on ${valueA} and ${valueB}`
                }
            }));

        expect(moduleC.moduleC.getValue()).toBe('Module C depends on Module A and Module B');
    });

    it('should allow overriding dependencies', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    value: 'Original Module A'
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(() => ({
                moduleA: {
                    value: 'Overridden Module A'
                },
                moduleB: {
                    getValue: () => `Module B depends on overridden Module A`
                }
            }));

        expect(moduleB.moduleA.value).toBe('Overridden Module A');
    });

    it('should handle nested dependencies', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    value: 'Module A'
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(({ moduleA: { value } }) => ({
                moduleB: {
                    getValue: () => `Module B depends on ${value}`
                }
            }));

        const moduleC = Alvamind({ name: 'moduleC' })
            .use(moduleB)
            .derive(({ moduleB: { getValue } }) => ({
                moduleC: {
                    getValueFromB: () => `Module C uses: ${getValue()}`
                }
            }));

        expect(moduleC.moduleC.getValueFromB()).toBe('Module C uses: Module B depends on Module A');
    });

    it('should allow injecting methods from other modules', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    add: (a: number, b: number) => a + b
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(({ moduleA: { add } }) => ({
                moduleB: {
                    sum: (numbers: number[]) => numbers.reduce((acc, num) => add(acc, num), 0)
                }
            }));

        expect(moduleB.moduleB.sum([1, 2, 3, 4])).toBe(10);
    });

    it('should handle circular dependencies gracefully', () => {
        const moduleA = Alvamind({ name: 'moduleA' });
        const moduleB = Alvamind({ name: 'moduleB' }).use(moduleA);

        moduleA.use(moduleB).derive(() => ({
            moduleA: {
                getValue: () => 'Module A'
            }
        }));

        moduleB.derive(({ moduleA: { getValue } }) => ({
            moduleB: {
                getValue: () => `Module B depends on ${getValue ? getValue() : 'unknown'}`
            }
        }));

        expect(moduleB.moduleB.getValue()).toBe('Module B depends on unknown');
    });

    it('should handle complex module composition with multiple layers of dependencies', () => {
        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    value: 'Module A'
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(({ moduleA: { value } }) => ({
                moduleB: {
                    getValue: () => `Module B depends on ${value}`
                }
            }));

        const moduleC = Alvamind({ name: 'moduleC' })
            .use(moduleA)
            .use(moduleB)
            .derive(({ moduleA: { value: valueA }, moduleB: { getValue } }) => ({
                moduleC: {
                    getValue: () => `Module C depends on ${valueA} and ${getValue()}`
                }
            }));

        const moduleD = Alvamind({ name: 'moduleD' })
            .use(moduleC)
            .derive(({ moduleC: { getValue } }) => ({
                moduleD: {
                    getValueFromC: () => `Module D uses: ${getValue()}`
                }
            }));

        expect(moduleD.moduleD.getValueFromC()).toBe('Module D uses: Module C depends on Module A and Module B depends on Module A');
    });

    it('should allow conditional dependency injection', () => {
        const featureFlag = true;

        const moduleA = Alvamind({ name: 'moduleA' })
            .derive(() => ({
                moduleA: {
                    value: 'Module A'
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' });

        if (featureFlag) {
            moduleB.use(moduleA).derive(({ moduleA: { value } }) => ({
                moduleB: {
                    getValue: () => `Module B depends on ${value}`
                }
            }));
        } else {
            moduleB.derive(() => ({
                moduleB: {
                    getValue: () => 'Module B without dependencies'
                }
            }));
        }

        expect(moduleB.moduleB.getValue()).toBe('Module B depends on Module A');
    });

    it('should handle optional dependencies gracefully', () => {
        const moduleA = Alvamind({ name: 'moduleA' });

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(({ moduleA }) => ({
                moduleB: {
                    getValue: () => `Module B depends on ${moduleA?.value ?? 'nothing'}`
                }
            }));

        expect(moduleB.moduleB.getValue()).toBe('Module B depends on nothing');
    });

    it('should allow dependency injection with custom configurations', () => {
        const moduleA = Alvamind({ name: 'moduleA', config: { setting: 'default' } })
            .derive(({ config }) => ({
                moduleA: {
                    getSetting: () => `Setting: ${config.setting}`
                }
            }));

        const moduleB = Alvamind({ name: 'moduleB' })
            .use(moduleA)
            .derive(({ moduleA: { getSetting } }) => ({
                moduleB: {
                    getValue: () => `Module B uses ${getSetting()}`
                }
            }));

        expect(moduleB.moduleB.getValue()).toBe('Module B uses Setting: default');
    });

    // Add new test cases for async circular dependencies
    it('should handle async circular dependencies gracefully', async () => {
        const serviceA = Alvamind({ name: 'serviceA' });
        const serviceB = Alvamind({ name: 'serviceB' });

        serviceA.use(serviceB).derive(() => ({
            serviceA: {
                getData: async () => {
                    const dataFromB = await serviceB.serviceB?.getData?.() || 'default';
                    return `A(${dataFromB})`;
                }
            }
        }));

        serviceB.use(serviceA).derive(() => ({
            serviceB: {
                getData: async () => {
                    const dataFromA = await serviceA.serviceA?.getData?.() || 'default';
                    return `B(${dataFromA})`;
                }
            }
        }));

        const result = await serviceA.serviceA.getData();
        expect(result).toBe('A(B(default))');
    });

    it('should handle deep async circular dependencies', async () => {
        const moduleX = Alvamind({ name: 'moduleX' });
        const moduleY = Alvamind({ name: 'moduleY' });
        const moduleZ = Alvamind({ name: 'moduleZ' });

        moduleX.use(moduleY).derive(() => ({
            moduleX: {
                process: async () => {
                    const yResult = await moduleY.moduleY?.process?.() || 'default';
                    return `X(${yResult})`;
                }
            }
        }));

        moduleY.use(moduleZ).derive(() => ({
            moduleY: {
                process: async () => {
                    const zResult = await moduleZ.moduleZ?.process?.() || 'default';
                    return `Y(${zResult})`;
                }
            }
        }));

        moduleZ.use(moduleX).derive(() => ({
            moduleZ: {
                process: async () => {
                    const xResult = await moduleX.moduleX?.process?.() || 'default';
                    return `Z(${xResult})`;
                }
            }
        }));

        const result = await moduleX.moduleX.process();
        expect(result).toBe('X(Y(Z(default)))');
    });

    it('should handle promise-based module initialization', async () => {
        const dbModule = Alvamind({ name: 'db' })
            .derive(() => ({
                db: {
                    connect: async () => 'connected',
                    query: async () => ['data1', 'data2']
                }
            }));

        const cacheModule = Alvamind({ name: 'cache' })
            .use(dbModule)
            .derive(({ db }) => ({
                cache: {
                    init: async () => {
                        const connection = await db.connect();
                        const data = await db.query();
                        return { connection, data };
                    }
                }
            }));

        const result = await cacheModule.cache.init();
        expect(result).toEqual({
            connection: 'connected',
            data: ['data1', 'data2']
        });
    });


    it('should handle async error propagation in circular dependencies', async () => {
        const errorModule = Alvamind({ name: 'error' })
            .derive(() => ({
                error: {
                    throwError: async () => {
                        throw new Error('Test error');
                    }
                }
            }));

        const handlerModule = Alvamind({ name: 'handler' })
            .use(errorModule)
            .derive(({ error }) => ({
                handler: {
                    handle: async () => {
                        try {
                            await error.throwError();
                            return 'success';
                        } catch (e) {
                            return 'caught error';
                        }
                    }
                }
            }));

        errorModule.use(handlerModule).derive(({ handler }) => ({
            error: {
                safeOperation: async () => {
                    return handler.handle();
                }
            }
        }));

        const result = await errorModule.error.safeOperation();
        expect(result).toBe('caught error');
    });

});

describe('Alvamind Advanced Circular Dependency Tests', () => {
    // Define strongly typed interfaces for our modules
    interface DatabaseModule {
        db: {
            connect: () => Promise<string>;
            query: <T>(sql: string) => Promise<T[]>;
            disconnect: () => Promise<void>;
        }
    }

    interface CacheModule {
        cache: {
            get: <T>(key: string) => Promise<T | null>;
            set: <T>(key: string, value: T) => Promise<void>;
            clear: () => Promise<void>;
        }
    }

    interface ServiceModule {
        service: {
            getData: () => Promise<string[]>;
            processData: (data: string[]) => Promise<string>;
        }
    }

    it('should handle deep circular async dependencies with type safety', async () => {
        // Create modules with circular dependencies
        const db = Alvamind({ name: 'db' }).derive((): DatabaseModule => ({
            db: {
                connect: async () => 'connected',
                query: async <T>(sql: string) => ['result'] as T[],
                disconnect: async () => { }
            }
        }));

        const cache = Alvamind({ name: 'cache' })
            .use(db)
            .derive((): CacheModule => ({
                cache: {
                    get: async <T>(key: string) => null as T | null,
                    set: async <T>(key: string, value: T) => { },
                    clear: async () => { }
                }
            }));

        const service = Alvamind({ name: 'service' })
            .use(db)
            .use(cache)
            .derive(({ db, cache }): ServiceModule => ({
                service: {
                    getData: async () => {
                        const cached = await cache.cache.get<string[]>('data');
                        if (cached) return cached;
                        const data = await db.db.query<string>('SELECT data');
                        await cache.cache.set('data', data);
                        return data;
                    },
                    processData: async (data) => data.join(',')
                }
            }));

        // Type checks
        type ExpectedType = Core<{}, {}, DatabaseModule & CacheModule & ServiceModule>;
        const typedService: ExpectedType = service;

        // @ts-expect-error - Should not allow non-existent methods
        await typedService.service.nonExistentMethod();

        // @ts-expect-error - Should enforce type safety on query generic
        await typedService.db.query<number>('SELECT data').toLowerCase();

        const result = await typedService.service.getData();
        expect(Array.isArray(result)).toBe(true);
    });

    it('should handle concurrent circular dependencies with proper typing', async () => {
        interface Worker {
            worker: {
                process: (data: string) => Promise<string>;
                notify: (msg: string) => Promise<void>;
            }
        }

        interface Logger {
            logger: {
                log: (msg: string) => Promise<void>;
                getLatest: () => Promise<string>;
            }
        }

        // Initialize modules with default implementations first
        const worker = Alvamind({ name: 'worker' }).derive((): Worker => ({
            worker: {
                process: async (data) => `Default processed ${data}`,
                notify: async (msg) => { }
            }
        }));

        const logger = Alvamind({ name: 'logger' }).derive((): Logger => ({
            logger: {
                log: async (msg) => { },
                getLatest: async () => 'latest log'
            }
        }));

        // Then establish dependencies
        worker.use(logger);
        logger.use(worker);

        type WorkerType = Core<{}, {}, Worker & Logger>;
        const typedWorker: WorkerType = worker;

        // Test concurrent operations
        await Promise.all([
            typedWorker.worker.process('data1'),
            typedWorker.worker.process('data2'),
            typedWorker.logger.log('test')
        ]);

        // @ts-expect-error - Should not allow wrong parameter types
        await typedWorker.worker.process(123);
    });

    it('should handle deeply nested circular references with type checking', async () => {
        interface ModuleA {
            a: {
                method: () => Promise<string>;
                getDep: () => Promise<string>;
            }
        }

        interface ModuleB {
            b: {
                method: () => Promise<string>;
                getDep: () => Promise<string>;
            }
        }

        interface ModuleC {
            c: {
                method: () => Promise<string>;
                getDep: () => Promise<string>;
            }
        }

        const moduleA = Alvamind({ name: 'a' });
        const moduleB = Alvamind({ name: 'b' });
        const moduleC = Alvamind({ name: 'c' });

        // Create circular dependency chain A -> B -> C -> A
        moduleA.use(moduleB).derive(({ b }): ModuleA => ({
            a: {
                method: async () => 'A',
                getDep: async () => b.method()
            }
        }));

        moduleB.use(moduleC).derive(({ c }): ModuleB => ({
            b: {
                method: async () => 'B',
                getDep: async () => c.method()
            }
        }));

        moduleC.use(moduleA).derive(({ a }): ModuleC => ({
            c: {
                method: async () => 'C',
                getDep: async () => a.method()
            }
        }));

        type ModuleType = Core<{}, {}, ModuleA & ModuleB & ModuleC>;
        const typedModule: ModuleType = moduleA.use(moduleB).use(moduleC);

        const results = await Promise.all([
            typedModule.a.method(),
            typedModule.b.method(),
            typedModule.c.method()
        ]);

        expect(results).toEqual(['A', 'B', 'C']);

        // @ts-expect-error - Should not allow accessing non-existent methods
        await typedModule.d.method();
    });
});
