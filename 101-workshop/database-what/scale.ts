import redis from "redis";
import uuidv4 from "uuid/v4";

import { App } from "./app";

const client = redis.createClient({
  host: process.env.REDIS_HOST
});

console.log("Starting with random name");
const name = uuidv4();
console.log("name", name);
const app = new App(name, client, false);
app.run().catch(e => {
  console.log("error", e);
  client.quit();
});
