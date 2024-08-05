import { parseArgs } from "@std/cli/parse-args";
import {
  CliDriver,
  GetPoolPairResponse,
  initTimedLogger,
  ListTokensItem,
  TokenAmount,
} from "@pkg/dfi_cli_sdk_ts/lib.ts";

function loadOpts() {
  const alias = {
    "help": "h",
    "filter": "f",
  };
  const args = parseArgs(Deno.args, {
    alias,
    string: ["filter"],
    boolean: ["help"],
    "--": false,
    unknown: (args) => {
      console.log(`Error: unknown args: ${args}`);
      Deno.exit(1);
    },
  });
  const getHelpText = () => {
    let text =
      "Outputs all the addresses who are holders of the token that matches the filter\n\n";
    text += "Usage: <program> --token_filter=<token_substring>\n\n";
    text += "Options:\n";
    text += "  -h, --help              Print this help message\n";
    text += "  -f, --filter=<string>   Token filter substring.\n";
    text +=
      "                          This string is checked for substring match against token symbols\n";
    text += "                          Eg: --filter=DFI\n";
    return text;
  };
  if (!args.filter || args.help) {
    console.log(getHelpText());
    Deno.exit(1);
  }
  return { filter: args.filter };
}

async function run(cli: CliDriver, filter: string) {
  const height = await cli.getBlockHeight();
  const hash = await cli.getBlockHash(height);
  console.log(`height: ${height.value}, hash: ${hash.value}`);
  console.log("rpc: logaccountbalances");
  console.log(
    "note: logaccountbalances does not include pool pair rewards\n\
    for some addresses. This is not an exact account of balances\n\
    but a fast way in exchange for minor inaccuracies.",
  );

  const x = await cli.logAccountBalances();

  const tokens = await cli.listTokens({ limit: 1000 });
  const tokenIds: {
    id: string;
    symbol: string;
    details: ListTokensItem | GetPoolPairResponse;
  }[] = [];
  for (const id in tokens) {
    const x = tokens[id];
    if (x.symbol.includes(filter) && (x.isDAT || x.isLPS || x.isLoanToken)) {
      const details = x.isLPS ? await cli.getPoolPair(x.symbol) : x;
      tokenIds.push({ id, symbol: x.symbol, details });
    }
  }

  console.log(tokenIds);

  const results = [];

  for (const addr in x.accounts) {
    const t = x.accounts[addr];
    const res = t.map((x) => new TokenAmount(x))
      .filter((x) => {
        const match = tokenIds.find((v) => v.id === x.token());
        return match != undefined;
      })
      .map((x) => {
        return {
          addr,
          val: TokenAmount.from(
            x.amount(),
            tokenIds.find((v) => v.id == x.token())!.symbol,
          ),
        };
      });

    results.push(...res);
  }

  const resultGroups = new Map<string, { addr: string; val: TokenAmount }[]>();
  for (const x of tokenIds) {
    resultGroups.set(x.symbol, []);
  }

  for (const x of results) {
    for (const [k, v] of resultGroups) {
      if (x.val.token() == k) {
        v.push(x);
      }
    }
  }

  for (const [k, v] of resultGroups) {
    const m = v.map((x) => {
      return { addr: x.addr, val: x.val };
    });
    m.sort((a, b) => b.val.amount() - a.val.amount());
    const total = m.reduce((acc, x) => acc + x.val.amount(), 0);
    const res = {
      token: k,
      count: m.length,
      total,
      items: m.map((x) => {
        return { addr: x.addr, val: x.val.toString() };
      }),
    };
    console.log(JSON.stringify(res, null, 2));
  }
}

async function main() {
  const { filter } = loadOpts();
  initTimedLogger();
  const cli = new CliDriver();
  console.log(`cli: ${cli.path} ${cli.args.join(" ")}, filter: ${filter}`);
  await run(cli, filter);
}

main();
