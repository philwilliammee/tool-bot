// src/components/WorkArea/Modals/ContentBlockEditor.ts
import { ContentBlock } from "@aws-sdk/client-bedrock-runtime";

/**
 * Creates a content block editor for managing message content blocks.
 *
 * Note on Event Handlers:
 * We use direct onclick property assignment instead of addEventListener for buttons
 * when working with cloned templates and dynamic content. This is because:
 * 1. addEventListener can create reference issues with cloned content
 * 2. onclick provides clearer cleanup and better state management in closures
 * 3. Prevents potential memory leaks with dynamically rendered content
 *
 * Example:
 * ✅ button.onclick = () => handleClick();
 * ❌ button.addEventListener('click', () => handleClick());
 *
 * @param modalId - The ID of the modal containing the editor
 * @returns Editor interface with setBlocks, getBlocks, and destroy methods
 */
export function createContentBlockEditor(modalId: string) {
  // Get required elements
  const modal = document.getElementById(modalId) as HTMLElement;
  if (!modal) {
    throw new Error(`Modal ${modalId} not found`);
  }

  const container = modal.querySelector(
    ".content-blocks-container"
  ) as HTMLElement;
  const editorTemplate = document.getElementById(
    "content-block-editor-template"
  ) as HTMLTemplateElement;
  const blockTemplate = document.getElementById(
    "text-block-template"
  ) as HTMLTemplateElement;

  if (!container || !editorTemplate || !blockTemplate) {
    throw new Error("Required content editor elements not found");
  }

  // Internal state
  let blocks: ContentBlock[] = [];

  // Utility functions
  const createBlockElement = (
    block: ContentBlock,
    index: number
  ): HTMLElement => {
    if ("text" in block) {
      const blockElement = blockTemplate.content.cloneNode(true) as HTMLElement;
      const container = blockElement.querySelector(
        ".content-block"
      ) as HTMLElement;
      const textarea = blockElement.querySelector(
        ".block-content"
      ) as HTMLTextAreaElement;

      if (!container || !textarea) {
        throw new Error("Invalid block template structure");
      }

      container.dataset.index = index.toString();
      textarea.value = block.text || "";

      // Setup move buttons
      const moveUpBtn = blockElement.querySelector(
        ".move-up"
      ) as HTMLButtonElement;
      const moveDownBtn = blockElement.querySelector(
        ".move-down"
      ) as HTMLButtonElement;

      if (moveUpBtn) {
        moveUpBtn.disabled = index === 0;
        moveUpBtn.onclick = () => moveBlock(index, index - 1);
      }

      if (moveDownBtn) {
        moveDownBtn.disabled = index === blocks.length - 1;
        moveDownBtn.onclick = () => moveBlock(index, index + 1);
      }

      // Setup delete button
      const deleteBtn = blockElement.querySelector(
        ".delete-block"
      ) as HTMLButtonElement;
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          console.log("Deleting block at index:", index);
          blocks.splice(index, 1);
          render();
        };
      }

      // Setup textarea
      if (textarea) {
        textarea.onchange = () => {
          console.log("Updating block text at index:", index);
          blocks[index] = { text: textarea.value };
        };
      }

      return container;
    }
    throw new Error("Unsupported block type");
  };

  const moveBlock = (fromIndex: number, toIndex: number): void => {
    if (toIndex < 0 || toIndex >= blocks.length) return;

    const block = blocks[fromIndex];
    blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, block);
    render();
  };

  const render = (): void => {
    console.log("Rendering blocks:", blocks);
    const blocksContainer = container.querySelector(".content-blocks-list");
    if (!blocksContainer) return;

    blocksContainer.innerHTML = "";
    blocks.forEach((block, index) => {
      blocksContainer.appendChild(createBlockElement(block, index));
    });
  };

  // Initialize container
  const setupContainer = (): void => {
    container.innerHTML = "";
    const editorContent = editorTemplate.content.cloneNode(
      true
    ) as DocumentFragment;
    container.appendChild(editorContent);

    const addTextBtn = container.querySelector(
      ".add-text-block"
    ) as HTMLButtonElement;
    if (!addTextBtn) {
      console.error("Add text button not found after template clone");
      return;
    }

    addTextBtn.onclick = () => {
      console.log("Adding new text block");
      blocks.push({ text: "" });
      render();
    };
  };

  // Initial setup
  setupContainer();

  // Public API
  return {
    setBlocks: (newBlocks: ContentBlock[]): void => {
      console.log("Setting blocks:", newBlocks);
      blocks = [...newBlocks];
      render();
    },

    getBlocks: (): ContentBlock[] => {
      return [...blocks];
    },

    destroy: (): void => {
      // Clean up by removing all content and event listeners
      container.innerHTML = "";
      blocks = [];
    },
  };
}
