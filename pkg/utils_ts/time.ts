export class TimeStamper {
  tStart = performance.now();
  t = performance.now();
  i = 0;

  timeFmt(t: number) {
    if (t < 1000) {
      return `${t}ms`;
    }
    if (t < 1000 * 60) {
      return `${t / 1000}s`;
    }
    return `${t / 1000 / 60}mins`;
  }

  stamp(label?: string) {
    const t = performance.now();
    console.log(
      `Stamp ${this.i++}${label ? ` (${label})` : ""}: ${
        this.timeFmt(t - this.t)
      }`,
    );
    this.t = t;
  }

  total() {
    const t = performance.now();
    console.log(`Total time: ${this.timeFmt(t - this.tStart)}`);
  }
}
