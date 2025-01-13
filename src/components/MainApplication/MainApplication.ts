import { Chat } from "../Chat/chat";
import { store } from "../../stores/AppStore";
import { Toast } from "../Toast/Toast";

export class MainApplication {
  // Components
  private chat!: Chat;

  // DOM Elements
  private workArea!: HTMLElement;

  constructor() {
    console.log("Initializing MainApplication");
    this.initializeDOMElements();
    this.initializeComponents();
    new Toast();
  }

  private initializeDOMElements(): void {
    this.workArea = document.querySelector("#work_area") as HTMLElement;

    if (!this.workArea) {
      throw new Error("Required DOM elements not found");
    }
  }

  private initializeComponents(): void {
    // Initialize Chat with work area reference
    this.chat = new Chat({
      workArea: this.workArea,
    });
  }

  public destroy(): void {
    this.chat?.destroy();
  }
}
