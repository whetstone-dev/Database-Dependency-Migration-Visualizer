#!/usr/bin/env node
import { check_skill, sync_skill } from "./skill-distribution.mjs";

console.log(
  JSON.stringify(
    process.argv.includes("--check") ? check_skill() : sync_skill(),
  ),
);
