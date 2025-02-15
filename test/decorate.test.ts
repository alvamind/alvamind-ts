import { expect, it, describe } from "bun:test";
import Alvamind from "../src/core/alvamind-core";

describe('Alvamind Decorate Method Tests', () => {
    // Basic decoration tests
    it('should decorate with primitive values', () => {
        const app = Alvamind({ name: 'primitives' })
            .decorate('number', 42)
            .decorate('string', 'hello')
            .decorate('boolean', true);

        expect(app.number).toBe(42);
        expect(app.string).toBe('hello');
        expect(app.boolean).toBe(true);
    });

    // Complex object decoration
    it('should handle complex object decorations', () => {
        const config = {
            api: {
                url: 'https://api.example.com',
                version: 'v1',
                timeout: 5000
            }
        };

        const app = Alvamind({ name: 'complex' })
            .decorate('config', config)
            .decorate('handler', (x: number) => x * 2);

        expect(app.config).toEqual(config);
        expect(app.config.api.url).toBe('https://api.example.com');
        expect(app.handler(21)).toBe(42);
    });

    // Interaction with derive
    it('should make decorated values available in derive', () => {
        const db = {
            query: (sql: string) => Promise.resolve([{ id: 1 }])
        };

        const app = Alvamind({ name: 'interaction' })
            .decorate('db', db)
            .derive(({ db }) => ({
                users: {
                    findAll: () => db.query('SELECT * FROM users')
                }
            }));

        expect(app.db).toBe(db);
        expect(typeof app.users.findAll).toBe('function');
    });

    // Multiple decorations and overrides
    it('should handle multiple decorations and overrides', () => {
        const app = Alvamind({ name: 'multiple' })
            .decorate('value', 1)
            .decorate('value', 2)
            .decorate('nested', { a: 1 })
            .decorate('nested', { b: 2 });

        expect(app.value).toBe(2);
        expect(app.nested).toEqual({ b: 2 });
    });

    // Type safety tests
    interface CustomType {
        id: number;
        name: string;
    }

    it('should maintain type safety with decorated values', () => {
        const customObject: CustomType = { id: 1, name: 'test' };

        const app = Alvamind({ name: 'typed' })
            .decorate('custom', customObject)
            .derive(({ custom }) => ({
                getName: () => custom.name
            }));

        expect(app.custom.id).toBe(1);
        expect(app.getName()).toBe('test');
    });

    // Class instance decoration
    it('should handle class instance decoration', () => {
        class Service {
            private count = 0;
            increment() { return ++this.count; }
            getCount() { return this.count; }
        }

        const service = new Service();
        const app = Alvamind({ name: 'service' })
            .decorate('service', service)
            .derive(({ service }) => ({
                increment: () => service.increment()
            }));

        expect(app.service.getCount()).toBe(0);
        expect(app.increment()).toBe(1);
        expect(app.service.getCount()).toBe(1);
    });

    // Async function decoration
    it('should support async function decoration', async () => {
        const asyncFn = async (x: number) => x * 2;

        const app = Alvamind({ name: 'async' })
            .decorate('asyncOp', asyncFn)
            .derive(({ asyncOp }) => ({
                compute: async (x: number) => await asyncOp(x)
            }));

        expect(await app.asyncOp(21)).toBe(42);
        expect(await app.compute(21)).toBe(42);
    });

    // Decoration inheritance
    it('should properly inherit decorated values', () => {
        const baseApp = Alvamind({ name: 'base' })
            .decorate('shared', 'base')
            .decorate('version', 1);

        const extendedApp = Alvamind({ name: 'extended' })
            .use(baseApp)
            .decorate('version', 2)
            .decorate('extra', 'extended');

        expect(extendedApp.shared).toBe('base');
        expect(extendedApp.version).toBe(2);
        expect(extendedApp.extra).toBe('extended');
    });

    // Edge cases
    it('should handle edge cases properly', () => {
        const app = Alvamind({ name: 'edge' })
            .decorate('null', null)
            .decorate('undefined', undefined)
            .decorate('empty', {})
            .decorate('zero', 0)
            .decorate('false', false);

        expect(app.null).toBeNull();
        expect(app.undefined).toBeUndefined();
        expect(app.empty).toEqual({});
        expect(app.zero).toBe(0);
        expect(app.false).toBe(false);
    });

    // Decoration with state interaction
    it('should work with state', () => {
        const app = Alvamind({
            name: 'state-decoration',
            state: { count: 0 }
        })
            .decorate('increment', (amount: number) => {
                app.state.set({ count: app.state.get().count + amount });
            });

        app.increment(5);
        expect(app.state.get().count).toBe(5);
    });

    // Multiple module decoration composition
    it('should compose multiple decorated modules', () => {
        const loggerModule = Alvamind({ name: 'logger' })
            .decorate('log', (msg: string) => `[LOG]: ${msg}`);

        const timeModule = Alvamind({ name: 'time' })
            .decorate('now', () => Date.now());

        const app = Alvamind({ name: 'composed' })
            .use(loggerModule)
            .use(timeModule)
            .derive(({ log, now }) => ({
                logTime: () => log(`Current time: ${now()}`)
            }));

        expect(app.log('test')).toBe('[LOG]: test');
        expect(app.logTime()).toContain('[LOG]: Current time:');
        expect(typeof app.now()).toBe('number');
    });
});
