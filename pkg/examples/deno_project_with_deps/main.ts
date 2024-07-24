import chalk from "npm:chalk";
import { sayHello } from "@pkg/examples/deno_project/lib.ts";

function main() {
    console.log(chalk.green("msg: ") + sayHello());
}

main();