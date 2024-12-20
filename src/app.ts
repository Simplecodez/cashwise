import express, { Application } from "express";
import { singleton } from "tsyringe";

@singleton()
export class App {
  private app: Application;

  constructor() {
    this.app = express();
  }

  public start(port: number) {
    this.app.listen(port, () => {
      console.log(`Application running on port ${port}`);
    });
  }
}
