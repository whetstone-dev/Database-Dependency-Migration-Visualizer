#!/usr/bin/env node
import { main } from "../src/dbdep/cli.mjs";
process.exitCode = await main();
