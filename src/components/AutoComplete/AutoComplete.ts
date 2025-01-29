export class HybridAutocomplete {
  private suggestionBox: HTMLDivElement;
  private suggestions: string[] = [];
  private currentSelection = -1;

  // Hard-coded expansions, or you might accept them from the parent
  readonly expansionsMap: Record<string, string[]> = {
    show: [
      "me the data",
      "the html visualization",
      "the code output",
      "the file tree",
      "the project files",
      "the math results",
      "the ldap results",
    ],
    create: [
      "a visualization using html",
      "a chart using Chart.js",
      "a graph of this data",
      "a new file",
      "a math calculation",
    ],
    calculate: [
      "using math.js",
      "the statistics",
      "the average of",
      "the sum of",
      "using the data",
    ],
    fetch: [
      "the data from",
      "this url",
      "the api endpoint",
      "the resource at",
      "this web content",
    ],
    execute: [
      "this code",
      "using javascript",
      "using Chart.js",
      "using lodash",
      "this analysis",
    ],
    search: [
      "the ldap directory",
      "for users",
      "for groups",
      "in project files",
      "the codebase",
    ],
    write: [
      "to this file",
      "the results to",
      "the output as",
      "this content to",
      "the data to file",
    ],
    read: [
      "the project files",
      "this file",
      "the directory",
      "the file tree",
      "from github",
    ],
    visualize: [
      "using html",
      "using Chart.js",
      "this data",
      "these results",
      "the output",
    ],
    analyze: [
      "using javascript",
      "this dataset",
      "using math.js",
      "the file contents",
      "the results",
    ],
  };

  constructor(private textarea: HTMLTextAreaElement) {
    this.suggestionBox = this.createSuggestionBox();
  }

  private createSuggestionBox(): HTMLDivElement {
    const box = document.createElement("div");
    box.className = "suggestion-box";
    this.textarea.parentElement?.appendChild(box);
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

      // Click = choose immediately
      div.addEventListener("click", () => this.selectSuggestion(suggestion));
      div.addEventListener("mouseenter", () => {
        this.currentSelection = index;
        this.highlightSelection();
      });
      this.suggestionBox.appendChild(div);
    });

    // Position & display
    const rect = this.textarea.getBoundingClientRect();
    this.suggestionBox.style.top = `${rect.bottom + window.scrollY}px`;
    this.suggestionBox.style.left = `${rect.left + window.scrollX}px`;
    this.suggestionBox.style.width = `${rect.width}px`;
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
