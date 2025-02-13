// ?/* elysia-only-benchmarks.test.ts */
// import { Elysia } from "elysia";
// import chalk from 'chalk';
// import { treaty } from '@elysiajs/eden';

// const titleStyle = chalk.bold.cyanBright;
// const subtitleStyle = chalk.magentaBright;
// const successStyle = chalk.greenBright.bold;
// const errorStyle = chalk.redBright.bold;
// const labelStyle = chalk.blueBright;

// interface BenchmarkResult {
//   name: string; operationsPerSecond: number; memoryUsage: number;
//   methodSharing: boolean; stateImmutability: boolean; pluginSystem: boolean;
//   extensibility: number; complexity: number;
// }

// // Helper function to create each benchmark's Elysia app
// function createSimpleInstance() {
//   return new Elysia()
//     .state("count", 0)
//     .derive(({ store: { count } }) => ({
//       increment: () => ++count
//     }))
//     .post("/benchmark", ({ increment }) => increment());
// }

// function createMultipleInstances() {
//   const instance = new Elysia() ?
//     .state("count", 0)
//       .derive(({ store: { count } }) => ({
//         increment: () => ++count
//       }))
//   return new Elysia().use(instance).use(instance).post("/benchmark", ({ store: { count } }) => count)
// }

// function createNestedDependencies() {
//   const inner = new Elysia()
//     .state("innerCount", 0)
//     .derive(({ store: { innerCount } }) => ({
//       innerIncrement: () => ++innerCount
//     }))
//   const outer = new Elysia()
//     .state("outerCount", 0)
//     .use(inner)
//     .derive(({ store: { outerCount }, innerIncrement }) => ({
//       outerIncrement: () => {
//         innerIncrement();
//         return ++outerCount
//       }
//     }))
//   return new Elysia().use(outer).post("/benchmark", ({ outerIncrement }) => outerIncrement())
// }

// function createDeriveHeavy() {
//   return new Elysia()
//     .state("value", 0)
//     .derive(({ store: { value } }) => ({
//       add1: () => value + 1,
//       add2: () => value + 2,
//       add3: () => value + 3,
//       add4: () => value + 4,
//       add5: () => value + 5,
//       add6: () => value + 6,
//       add7: () => value + 7,
//       add8: () => value + 8,
//       add9: () => value + 9,
//       add10: () => value + 10,
//     }))
//     .post("/benchmark", ({ add1, add2, add3, add4, add5, add6, add7, add8, add9, add10 }) => add1() + add2() + add3() + add4() + add5() + add6() + add7() + add8() + add9() + add10());
// }

// function createPluginOverhead() {
//   const plugin = () => new Elysia().derive(() => ({ pluginValue: () => 1 }));
//   let app = new Elysia();
//   for (let i = 0; i < 10; i++) {
//     app = app.use(plugin());
//   }
//   return app.post("/benchmark", ({ pluginValue }) => pluginValue());
// }


// async function runElysiaBenchmark(
//   name: string,
//   elysiaSetup: () => Elysia,
//   iterations: number = 10000,
// ): Promise<BenchmarkResult> {

//   const startTime = performance.now();
//   for (let i = 0; i < iterations; i++) {
//     const app = elysiaSetup(); // Create a fresh instance for each iteration!
//     const api = treaty(app);
//     await api.benchmark.post({});
//   }

//   const endTime = performance.now();
//   const duration = endTime - startTime;
//   const operationsPerSecond = Math.floor((iterations / duration) * 1000);

//   const rawMemoryUsage = process.memoryUsage().heapUsed; // Capture memory *after* the run

//   return {
//     name,
//     operationsPerSecond,
//     memoryUsage: rawMemoryUsage,
//     methodSharing: false,
//     stateImmutability: true,
//     pluginSystem: true,
//     extensibility: 5,
//     complexity: 4,
//   };
// }

// function printTable(headers: string[], rows: string[][], columnColors: chalk.Chalk[] = []) {
//   const columnWidths = headers.map((header, colIndex) =>
//     Math.max(
//       header.length,
//       ...rows.map((row) => String(row[colIndex] ?? '').length) // Handle undefined/null
//     )
//   );

//   const headerRow = headers
//     .map((header, index) => {
//       const color = columnColors[index] || chalk.white; // Default to white if no color specified
//       return color(header.padEnd(columnWidths[index]));
//     })
//     .join(" | ");
//   console.log(titleStyle(headerRow));

//   const separator = columnWidths.map((width) => "─".repeat(width)).join("─┼─");
//   console.log(separator);

//   for (const row of rows) {
//     const coloredRow = row.map((cell, index) => {
//       const cellValue = cell ?? ''; // default empty
//       const color = columnColors[index] || chalk.white;
//       return color(cellValue.padEnd(columnWidths[index]));

//     }).join(" | ");
//     console.log(coloredRow);
//   }
// }

// async function main() {
//   const benchmarks = {
//     "Simple Instance": createSimpleInstance,
//     "Multiple Instances": createMultipleInstances,
//     "Nested Dependencies": createNestedDependencies,
//     "Derive Heavy": createDeriveHeavy,
//     "Plugin Overhead": createPluginOverhead,
//   };


//   console.log(titleStyle("\n=== Elysia-Only Benchmark Results (Tinybench) ===\n"));

//   const headers = ["Metric", ...Object.keys(benchmarks)];
//   const columnColors = [labelStyle, ...Object.keys(benchmarks).map(() => successStyle)];

//   const results = await Promise.all(
//     Object.entries(benchmarks).map(([name, setup]) => runElysiaBenchmark(name, setup))
//   );

//   const metrics: { [key: string]: (r: BenchmarkResult) => string } = {
//     "Ops/sec": r => r.operationsPerSecond.toLocaleString(),
//     "Memory (KB)": r => (r.memoryUsage / 1024).toFixed(3),
//     "Method Sharing": r => r.methodSharing ? "Yes" : "No",
//     "Immutability": r => r.stateImmutability ? "Yes" : "No",
//     "Plugin System": r => r.pluginSystem ? "Yes" : "No",
//     "Extensibility": r => "★".repeat(r.extensibility),
//     "Complexity": r => "★".repeat(r.complexity),
//   };

//   const rows = Object.entries(metrics).map(([metric, formatter]) => [
//     metric,
//     ...results.map(formatter)
//   ]);

//   printTable(headers, rows, columnColors);

//   if (typeof global.gc === 'function') {
//     global.gc();
//   }
// }

// main().catch(console.error);
