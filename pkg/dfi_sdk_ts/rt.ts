import { execFile, spawn } from "node:child_process";
import process from "node:process";

export class DenoRuntime {
  env = {
    get: Deno.env.get,
  };

  stdout = {
    writeSync: Deno.stdout.writeSync,
  };

  async processRun(path: string, ...args: string[]) {
    const cmd = new Deno.Command(path, { 
      args, 
      stdout: "null", 
      stderr: "null", 
      stdin: "null" });
    const { status } = await cmd.spawn();
    return await status;
  }

  async processOutput(path: string, ...args: string[]) {
    const cmd = new Deno.Command(path, {
      args,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    const { code, success, stdout, stderr } = await cmd.output();
    if (!success) {
      const err = new TextDecoder().decode(stderr);
      const out = new TextDecoder().decode(stdout);
      throw new Error(
        `process code: ${code} \nargs: ${args}\n${err}\n${out}}`,
      );
    }
    return stdout;
  }
}

export class NodeRuntime {
  env = {
    get: function (key: string) {
      return process.env[key];
    },
  };

  stdout = {
    writeSync: process.stdout.write,
  };

  processRun(path: string, ...args: string[]) {
    return new Promise((resolve, _reject) => {
      const cmd = spawn(path, args, { stdio: "ignore" });
      cmd.on("close", (code: any) => {
        resolve(code);
      });
    });
  }

  processOutput(path: string, ...args: string[]) {
    return new Promise((resolve, reject) => {
      execFile(path, args, {
        maxBuffer: 16000 * 1024,
      }, (err: any, stdout: string, stderr: string) => {
        if (err) {
          reject(
            new Error(
              `process code: ${err}, ${stderr}`,
            ),
          );
        } else {
          resolve(new TextEncoder().encode(stdout));
        }
      });
    });
  }
}

export const Runtime = new DenoRuntime();
