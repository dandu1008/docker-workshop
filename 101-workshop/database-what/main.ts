import redis from "redis";

import { App } from "./app";

const client = redis.createClient({
  host: process.env.REDIS_HOST
});

const name = process.env.APP_NAME || "no-name";

const app = new App(name, client);

app.run().catch(e => {
  console.log("error", e);
  client.quit();
});
