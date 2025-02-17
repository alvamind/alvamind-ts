import Alvamind, { AlvamindInstance } from "../src/core/alvamind-core";


interface MathState {
  lastResult: number;
}

// Example with typed instance
const mathModule: AlvamindInstance<MathState> = Alvamind({
  name: 'MathModule',
  state: { lastResult: 0 }
})
  .derive(({ flow }) => ({
    add: (a: number, b: number) => a + b,
    multiplyByTwo: (n: number) => n * 2,
    // Using flow to create a reusable composed function:
    // addAndDouble: flow(
    //   (a: number, b: number) => a + b,
    //   this.multiplyByTwo
    // )
  }));
