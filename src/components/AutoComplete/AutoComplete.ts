export class HybridAutocomplete {
  private suggestionBox: HTMLDivElement;
  private suggestions: string[] = [];
  private currentSelection = -1;

  // Hard-coded expansions, or you might accept them from the parent
  // @todo load these from message array.

  readonly expansionsMap: Record<string, string[]> = {
    test: [
      "all tools. The ldap tool should search for 'abc123'.  The final tool test should be the html tool, use it to create a full test page with pass/fail details about all tests.",
      "ldap tool",
      "html tool",
      "math tool",
      "code executor",
      "data store",
      "fetch tool",
      "file tree tool",
      "file writer",
      "project reader",
    ],
    lookup: [
      "user in ldap with a search term of",

      "profile on website",
      "information about",
    ],
    search: [
      "ldap for netid",
      "ldap directory for 'Ayham Boucher' also look up in CIT website by last name. Create a full web page about them, outlining their accomplishment. Use this image for the profile pic: https://infosci.cornell.edu/sites/default/files/AB%20profile%20%281%29.jpeg make sure to size the image to its container",
      "directory for user",
      "for person",
    ],
    display: ["a interesting visualization of the data"],
    show: [
      "me something about math that you may not think I know",
      "me something interesting about math",
      "me something that you think I may not know",
      "me the current weather forecast for ",
    ],
    then: [
      "look them up in CIT website by last name. Create a full web page about them, outlining their accomplishment",
    ],
    what: ["can you do?"],
    generate: [
      "a example html page",
      "the iconic snake game! explain the user interface and keyboard commands",
      "a dashboard page with the analysis.",
    ],
    question: [
      `A surveyor wants to know the height of a skyscraper. He places his inclinometer on a tripod 1m from the ground. At a distance of 50m from the skyscraper, he records an angle of elevation of 82∘.

What is the height of the skyscraper? Give your answer to one decimal place.
Generate the final output in html format using a chart to show the height of the syscraper and angle of elevation. Make sure to show your work format all calculations with latex.
`,
      `A builder is constructing a roof. The wood he is using for the sloped section of the roof is 4m long and the peak of the roof needs to be 2m high. What angle should the piece of wood make with the base of the roof?`,
    ],
    describe: ["the available data."],
    apply: ["data science techniques to analyze the data"],
    output: [
      "the complete file this is a production environment, make sure to test the file and include all content in the output.",
    ],
  };

  constructor(private textarea: HTMLTextAreaElement) {
    this.suggestionBox = this.createSuggestionBox();
  }

  private createSuggestionBox(): HTMLDivElement {
    const box = document.createElement("div");
    box.className = "suggestion-box";

    // Find the prompt container (which will be our container context)
    const promptContainer = this.textarea.closest(".prompt-container");
    if (!promptContainer) {
      throw new Error("Prompt container not found");
    }

    promptContainer.appendChild(box);
    return box;
  }

  public showSuggestions(list: string[]): void {
    if (!list.length) {
      this.hideSuggestions();
      return;
    }
    this.suggestions = list;
    this.currentSelection = -1;
    this.suggestionBox.innerHTML = "";

    list.forEach((suggestion, index) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = suggestion;

      div.addEventListener("click", () => this.selectSuggestion(suggestion));
      div.addEventListener("mouseenter", () => {
        this.currentSelection = index;
        this.highlightSelection();
      });
      this.suggestionBox.appendChild(div);
    });

    // Position using container relative positioning
    this.suggestionBox.style.display = "block";
  }

  public hideSuggestions(): void {
    this.suggestionBox.style.display = "none";
    this.suggestions = [];
    this.currentSelection = -1;
  }

  /** Arrow up/down. */
  public moveSelection(delta: number): void {
    if (!this.suggestions.length) return;
    this.currentSelection = Math.max(
      0,
      Math.min(this.currentSelection + delta, this.suggestions.length - 1)
    );
    this.highlightSelection();
  }

  private highlightSelection(): void {
    const items = Array.from(this.suggestionBox.children) as HTMLElement[];
    items.forEach((item, i) => {
      item.classList.toggle("selected", i === this.currentSelection);
    });
    const selected = items[this.currentSelection];
    selected?.scrollIntoView({ block: "nearest" });
  }

  public selectCurrent(): void {
    if (this.currentSelection < 0) return;
    const suggestion = this.suggestions[this.currentSelection];
    this.selectSuggestion(suggestion);
  }

  /**
   * Insert only the last word with `suggestion`, plus a trailing space.
   * Then if the suggestion is recognized as a command, we show expansions immediately.
   * Only a few minor issues here where sometimes the preceding word is replaced by the recommendation if it has no space after it.
   */
  public selectSuggestion(suggestion: string): void {
    if (!suggestion) return;
    const text = this.textarea.value;
    const cursorPos = this.textarea.selectionStart ?? text.length;

    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);

    // Only remove the last typed word
    const match = before.match(/(\S+)$/);
    const matchPos = match ? match.index! : before.length;

    const newText = before.slice(0, matchPos) + suggestion + " " + after;
    this.textarea.value = newText;

    // Move cursor
    const newCursor = matchPos + suggestion.length + 1; // +1 for space
    this.textarea.focus();
    this.textarea.setSelectionRange(newCursor, newCursor);

    // Dispatch a native "input" event so the parent’s onInput listener fires
    const event = new Event("input", { bubbles: true });
    this.textarea.dispatchEvent(event);

    this.hideSuggestions();

    // **If** the suggestion is a recognized command, show expansions:
    const lower = suggestion.toLowerCase();
    if (this.expansionsMap[lower]) {
      // Immediately show expansions for e.g. "show"
      this.showSuggestions(this.expansionsMap[lower]);
    }
  }

  /** For outside-click checks. */
  public suggestionBoxContains(node: Node): boolean {
    return this.suggestionBox.contains(node);
  }

  public isVisible(): boolean {
    return this.suggestionBox.style.display === "block";
  }

  public destroy(): void {
    this.hideSuggestions();
    this.suggestionBox.remove();
  }
}
