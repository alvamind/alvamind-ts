import { expect, it, describe } from "bun:test";
import Alvamind from "../src/core/alvamind-core";

describe('Alvamind Integrated Complex Module Composition', () => {
    let app: any; // Define app at a higher scope
    let userId: string;
    let token: string;

    // Define base modules
    const cryptoModule = Alvamind({ name: 'crypto' })
        .derive(() => ({
            crypto: {
                hash: (input: string) => `hashed_${input}`,
                verify: (hash: string, input: string) => hash === `hashed_${input}`,
                encrypt: (data: string) => `encrypted_${data}`,
                decrypt: (data: string) => data.replace('encrypted_', '')
            }
        }));

    const tokenModule = Alvamind({ name: 'token' })
        .use(cryptoModule)
        .derive(({ crypto: { encrypt } }) => ({
            token: {
                generate: (userId: string) => encrypt(`token_${userId}`),
                validate: (token: string) => token.includes('encrypted_token_'),
                extract: (token: string) => token.split('_').pop()
            }
        }));

    const authModule = Alvamind({ name: 'auth' })
        .use(cryptoModule)
        .use(tokenModule)
        .derive(({
            crypto: { hash, verify },
            token: { generate, validate, extract }
        }) => ({
            auth: {
                register: (username: string, password: string) => ({
                    userId: `user_${username}`,
                    passwordHash: hash(password)
                }),
                login: (username: string, password: string, storedHash: string) => {
                    if (verify(storedHash, password)) {
                        return generate(`user_${username}`);
                    }
                    throw new Error('Invalid credentials');
                },
                validateSession: (token: string) => {
                    if (!validate(token)) throw new Error('Invalid token');
                    return extract(token);
                },
                getUserData: (userId: string) => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve({ id: userId, name: `User ${userId}` });
                        }, 50);
                    });
                }
            }
        }));

    // Setup app module
    app = Alvamind({ name: 'app' })
        .use(authModule)
        .derive(({ auth: { register, login, validateSession, getUserData } }) => ({
            userSystem: {
                createUser: (username: string, password: string) => {
                    const { userId, passwordHash } = register(username, password);
                    return { userId, token: login(username, password, passwordHash) };
                },
                verifySession: (token: string) => validateSession(token),
                fetchUserData: (userId: string) => getUserData(userId)
            }
        }));

    // Before all tests, create a user
    it('should create a user', () => {
        const user = app.userSystem.createUser('john', 'password123');
        userId = user.userId;
        token = user.token;
        expect(userId).toBe('user_john');
        expect(token).toContain('encrypted_token_user_john');
        expect(typeof userId).toBe('string');
        expect(typeof token).toBe('string');
    });

    it('should verify the session token', () => {
        expect(app.userSystem.verifySession(token)).toBe('user_john');
        expect(typeof app.userSystem.verifySession(token)).toBe('string');
    });

    it('should fetch user data asynchronously', async () => {
        const userData = await app.userSystem.fetchUserData('user_john');
        expect(userData).toEqual({ id: 'user_john', name: 'User user_john' });
        expect(userData).toHaveProperty('id');
        expect(userData).toHaveProperty('name');
    });

    // Data processing pipeline modules
    const validatorModule = Alvamind({ name: 'validator' })
        .derive(() => ({
            validator: {
                string: (s: any) => typeof s === 'string',
                number: (n: any) => typeof n === 'number',
                email: (e: string) => e.includes('@'),
                compose: (...validators: ((x: any) => boolean)[]) =>
                    (value: any) => validators.every(v => v(value))
            }
        }));

    const transformerModule = Alvamind({ name: 'transformer' })
        .derive(() => ({
            transformer: {
                toString: (x: any) => String(x),
                toNumber: (x: any) => Number(x),
                trim: (s: string) => s.trim(),
                lowercase: (s: string) => s.toLowerCase(),
                pipeline: (...fns: ((x: any) => any)[]) =>
                    (input: any) => fns.reduce((acc, fn) => fn(acc), input)
            }
        }));

    const processorModule = Alvamind({ name: 'processor' })
        .use(validatorModule)
        .use(transformerModule)
        .derive(({
            validator: { string, email, compose },
            transformer: { trim, lowercase, pipeline }
        }) => ({
            processor: {
                createEmailProcessor: () => ({
                    validate: compose(string, email),
                    process: pipeline(trim, lowercase)
                }),
                processEmail: (input: string) => {
                    const emailProcessor = pipeline(trim, lowercase);
                    const emailValidator = compose(string, email);

                    const processed = emailProcessor(input);
                    if (!emailValidator(processed)) {
                        throw new Error('Invalid email format');
                    }
                    return processed;
                }
            }
        }));

    const analyticsModule = Alvamind({ name: 'analytics' })
        .derive(() => ({
            analytics: {
                track: (event: string, data: any) => ({
                    event,
                    data,
                    timestamp: Date.now()
                })
            }
        }));

    app = Alvamind({ name: 'app' })
        .use(processorModule)
        .use(analyticsModule)
        .derive(({
            processor: { processEmail },
            analytics: { track }
        }) => ({
            emailSystem: {
                process: (email: string) => {
                    try {
                        const processed = processEmail(email);
                        track('email_processed', { original: email, processed });
                        return processed;
                    } catch (error) {
                        track('email_processing_failed', { email, error: (error as Error).message });
                        throw error;
                    }
                }
            }
        }));

    it('should process a valid email', () => {
        expect(app.emailSystem.process('  Test@Example.com  ')).toBe('test@example.com');
        expect(typeof app.emailSystem.process('  Test@Example.com  ')).toBe('string');
    });

    it('should throw an error for an invalid email', () => {
        expect(() => app.emailSystem.process('invalid-email')).toThrow('Invalid email format');
    });

    // Event system with middleware modules
    const middlewareModule = Alvamind({ name: 'middleware' })
        .derive(() => ({
            middleware: {
                create: (fn: (data: any, next: () => any) => any) => fn,
                compose: (middlewares: any[]) => (data: any) => {
                    let index = -1;
                    const execute = (i: number): any => {
                        if (i <= index) throw new Error('next() called multiple times');
                        index = i;
                        if (i === middlewares.length) return data;
                        try {
                            return middlewares[i](data, () => execute(i + 1));
                        } catch (error: any) {
                            throw new Error(`Error in middleware [${i}]: ${error.message}`);
                        }
                    };
                    return execute(0);
                }
            }
        }));

    const loggerMiddleware = Alvamind({ name: 'logger' })
        .use(middlewareModule)
        .derive(({ middleware: { create } }) => ({
            logging: {
                createLogger: () => create((data, next) => {
                    const result = next();
                    return { ...result, logged: true };
                })
            }
        }));

    const validatorMiddleware = Alvamind({ name: 'validator' })
        .use(middlewareModule)
        .derive(({ middleware: { create } }) => ({
            validation: {
                createValidator: (schema: Record<string, (v: any) => boolean>) =>
                    create((data, next) => {
                        for (const key in schema) {
                            if (Object.hasOwn(schema, key) && !schema[key](data[key])) {
                                throw new Error(`Validation failed for: ${key}`);
                            }
                        }
                        return next();
                    })
            }
        }));

    app = Alvamind({ name: 'app' })
        .use(middlewareModule)
        .use(loggerMiddleware)
        .use(validatorMiddleware)
        .derive(({
            middleware: { compose },
            logging: { createLogger },
            validation: { createValidator }
        }) => {
            const logger = createLogger();
            const validator = createValidator({
                type: (v) => typeof v === 'string',
                payload: (v) => v !== null && typeof v === 'object'
            });

            return {
                eventSystem: {
                    process: (event: { type: string, payload: any }) => {
                        const pipeline = compose([validator, logger]);
                        return pipeline(event);
                    }
                }
            };
        });

    it('should process a valid event with middleware', () => {
        const result = app.eventSystem.process({
            type: 'test',
            payload: { data: 'test' }
        });
        expect(result.logged).toBe(true);
        expect(typeof result.logged).toBe('boolean');
    });

    it('should throw an error for invalid event type', () => {
        expect(() => app.eventSystem.process({
            type: '123',
            payload: { data: 'test' }
        })).toThrow('Error in middleware [0]: Validation failed for: type');
    });

    it('should throw an error for invalid event payload', () => {
        expect(() => app.eventSystem.process({
            type: 'test',
            payload: null
        })).toThrow('Error in middleware [0]: Validation failed for: payload');
    });

    it('should handle number validation', () => {
        const validatorModuleNumber = Alvamind({ name: 'validatorNumber' })
            .use(middlewareModule)
            .derive(({ middleware: { create } }) => ({
                validation: {
                    createValidator: (schema: Record<string, (v: any) => boolean>) =>
                        create((data, next) => {
                            for (const key in schema) {
                                if (Object.hasOwn(schema, key) && !schema[key](data[key])) {
                                    throw new Error(`Validation failed for: ${key}`);
                                }
                            }
                            return next();
                        })
                }
            }));

        app = Alvamind({ name: 'app' })
            .use(middlewareModule)
            .use(validatorModuleNumber)
            .derive(({
                middleware: { compose },
                validation: { createValidator }
            }) => {
                const validator = createValidator({
                    age: (v) => typeof v === 'number'
                });

                return {
                    eventSystem: {
                        process: (event: { age: number }) => {
                            const pipeline = compose([validator]);
                            return pipeline(event);
                        }
                    }
                };
            });

        expect(() => app.eventSystem.process({ age: 'twenty' as any })).toThrow('Error in middleware [0]: Validation failed for: age');
        expect(() => app.eventSystem.process({ age: 20 })).not.toThrow();
    });

    it('should handle multiple validators', () => {
        const validatorModuleMultiple = Alvamind({ name: 'validatorMultiple' })
            .use(middlewareModule)
            .derive(({ middleware: { create } }) => ({
                validation: {
                    createValidator: (schema: Record<string, (v: any) => boolean>) =>
                        create((data, next) => {
                            for (const key in schema) {
                                if (Object.hasOwn(schema, key) && !schema[key](data[key])) {
                                    throw new Error(`Validation failed for: ${key}`);
                                }
                            }
                            return next();
                        })
                }
            }));

        app = Alvamind({ name: 'app' })
            .use(middlewareModule)
            .use(validatorModuleMultiple)
            .derive(({
                middleware: { compose },
                validation: { createValidator }
            }) => {
                const validator = createValidator({
                    name: (v) => typeof v === 'string',
                    age: (v) => typeof v === 'number'
                });

                return {
                    eventSystem: {
                        process: (event: { name: string, age: number }) => {
                            const pipeline = compose([validator]);
                            return pipeline(event);
                        }
                    }
                };
            });

        expect(() => app.eventSystem.process({ name: 123 as any, age: 'twenty' as any })).toThrow('Error in middleware [0]: Validation failed for: name');
        expect(() => app.eventSystem.process({ name: 'John', age: 'twenty' as any })).toThrow('Error in middleware [0]: Validation failed for: age');
        expect(() => app.eventSystem.process({ name: 'John', age: 20 })).not.toThrow();
    });

    // Add these new test cases at the end of the describe block

    it('should handle nested destructuring correctly', () => {
        const nestedModule = Alvamind({ name: 'nested' })
            .derive(() => ({
                nested: {
                    deep: {
                        value: 42,
                        fn: () => 'nested'
                    }
                }
            }));

        const app = Alvamind({ name: 'app' })
            .use(nestedModule)
            .derive(({ nested: { deep: { value, fn } } }) => ({
                computed: {
                    getValue: () => value,
                    getFn: () => fn()
                }
            }));

        expect(app.computed.getValue()).toBe(42);
        expect(app.computed.getFn()).toBe('nested');
        expect(typeof app.computed.getValue()).toBe('number');
        expect(typeof app.computed.getFn()).toBe('string');
    });

    it('should handle array destructuring in derived values', () => {
        const arrayModule = Alvamind({ name: 'array' })
            .derive(() => ({
                items: [1, 2, 3],
                getTuple: () => [4, 5, 6] as const
            }));

        const app = Alvamind({ name: 'app' })
            .use(arrayModule)
            .derive(({ items: [first], getTuple }) => {
                const [, second] = getTuple();
                return {
                    values: {
                        first,
                        second
                    }
                };
            });

        expect(app.values.first).toBe(1);
        expect(app.values.second).toBe(5);
        expect(typeof app.values.first).toBe('number');
        expect(typeof app.values.second).toBe('number');
    });

    it('should handle optional chaining in destructuring', () => {
        const optionalModule = Alvamind({ name: 'optional' })
            .derive(() => ({
                data: {
                    nullable: null as null | { value: number },
                    optional: undefined as undefined | { value: number }
                }
            }));

        const app = Alvamind({ name: 'app' })
            .use(optionalModule)
            .derive(({ data }) => ({
                safe: {
                    nullValue: data.nullable?.value ?? -1,
                    optValue: data.optional?.value ?? -2
                }
            }));

        expect(app.safe.nullValue).toBe(-1);
        expect(app.safe.optValue).toBe(-2);
        expect(typeof app.safe.nullValue).toBe('number');
        expect(typeof app.safe.optValue).toBe('number');
    });

    it('should handle type-safe method chaining with destructuring', () => {
        interface User {
            id: string;
            name: string;
            role: string;
        }

        const userModule = Alvamind({ name: 'user' })
            .derive(() => ({
                user: {
                    create: (data: Partial<User>): User => ({
                        id: 'default',
                        name: 'default',
                        role: 'user',
                        ...data
                    })
                }
            }));

        const roleModule = Alvamind({ name: 'role' })
            .use(userModule)
            .derive(({ user: { create } }) => ({
                role: {
                    assignAdmin: (userData: Partial<User>) =>
                        create({ ...userData, role: 'admin' })
                }
            }));

        const app = Alvamind({ name: 'app' })
            .use(roleModule)
            .derive(({ role: { assignAdmin } }) => ({
                admin: {
                    create: (name: string) => assignAdmin({ name })
                }
            }));

        const admin = app.admin.create('John');
        expect(admin.role).toBe('admin');
        expect(admin.name).toBe('John');
        expect(typeof admin.role).toBe('string');
        expect(typeof admin.name).toBe('string');
    });

    it('should handle recursive type definitions', () => {
        type TreeNode = {
            value: number;
            children?: TreeNode[];
        };

        const treeModule = Alvamind({ name: 'tree' })
            .derive(() => ({
                tree: {
                    create: (value: number, children?: TreeNode[]): TreeNode => ({
                        value,
                        children
                    }),
                    sum: (node: TreeNode): number =>
                        node.value + (node.children?.reduce((acc, child) =>
                            acc + treeModule.tree.sum(child), 0) ?? 0)
                }
            }));

        const app = Alvamind({ name: 'app' })
            .use(treeModule)
            .derive(({ tree: { create, sum } }) => ({
                calculator: {
                    createTree: (root: number, ...children: number[]) =>
                        create(root, children.map(c => create(c))),
                    sumTree: (tree: TreeNode) => sum(tree)
                }
            }));

        const tree = app.calculator.createTree(1, 2, 3, 4);
        expect(app.calculator.sumTree(tree)).toBe(10);
        expect(typeof app.calculator.sumTree(tree)).toBe('number');
    });
});