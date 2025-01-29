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
      "look up user in ldap with a search term of",
      "user in ldap",
      "netid in directory",
      "person in cit",
      "profile on website",
      "information about",
    ],
    search: [
      "ldap for netid",
      "directory for user",
      "for person",
      "cornell directory",
      "cit website",
    ],
    create: [
      "profile page",
      "test results page",
      "tool status report",
      "web visualization",
      "html summary",
    ],
    run: [
      "tool tests",
      "ldap search",
      "directory lookup",
      "all tool checks",
      "system test",
    ],
    generate: [
      "test report",
      "user profile",
      "tool status",
      "results page",
      "summary html",
    ],
    check: [
      "tool status",
      "ldap connection",
      "search results",
      "test results",
      "all tools",
    ],
    display: [
      "test results",
      "user profile",
      "tool status",
      "search results",
      "system check",
    ],
    verify: [
      "tool operation",
      "ldap search",
      "test results",
      "all tools",
      "system status",
    ],
    then: [
      "Then look them up in CIT website by last name. Create a full web page about them, outlining their accomplishment",
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
