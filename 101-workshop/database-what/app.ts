import redis from "redis";
import { promisify } from "util";

export class App {
  private cacheExTime = 2; // seconds
  public running?: boolean;

  constructor(
    private readonly name: string,
    private readonly client: redis.RedisClient,
    private loggingEnabled = true
  ) {
    if (!loggingEnabled) console.log(`Launching ${name} worker...`);
    this.validate();
  }

  private async validate() {
    const getKey = promisify(this.client.get).bind(this.client);
    const running = await getKey(this.cacheKey());

    if (running) {
      throw new Error(
        `App "${this.name}" is already running, try changing the name via APP_NAME environment variable.`
      );
    }
  }

  private async runningApps(): Promise<string[]> {
    const getKeys = promisify(this.client.keys).bind(this.client);
    const keys = await getKeys("running:*");
    return keys.map(key => key.split(":")[1]);
  }

  private cacheKey(): string {
    return "running:" + this.name;
  }

  public async run(): Promise<void> {
    if (typeof this.running === "undefined") this.running = true;
    if (typeof this.running === "boolean" && !this.running) throw new Error("stopping");
    const setEx = promisify(this.client.setex).bind(this.client);
    await setEx(this.cacheKey(), this.cacheExTime, this.name);
    const runningApps = await this.runningApps();
    if (this.loggingEnabled)
      console.log(`[${this.name}] Running apps (${runningApps.length}): ${runningApps.join(", ")}`);
    setTimeout(this.run.bind(this), this.cacheExTime * 1000 * 0.875);
  }
}
