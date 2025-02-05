// src/components/WorkArea/Modals/EditModal.ts
import { ContentBlock } from "@aws-sdk/client-bedrock-runtime";
import { MessageExtended } from "../../../app.types";
import { converseStore } from "../../../stores/ConverseStore/ConverseStore";
import { createContentBlockEditor } from "./ContentBlockEditor";

export function createEditModal() {
  const dialog = document.getElementById("edit-modal") as HTMLDialogElement;
  const form = dialog.querySelector(".edit-form") as HTMLFormElement;
  const contentEditor = createContentBlockEditor("edit-modal");
  let currentMessage: MessageExtended | null = null;

  if (!dialog || !form) {
    throw new Error("Required edit modal elements not found");
  }

  // Setup heart toggle
  const setupHeartToggle = () => {
    const heartToggle = dialog.querySelector(".heart-toggle") as HTMLElement;
    const ratingInput = dialog.querySelector(
      "#messageRating"
    ) as HTMLInputElement;

    if (heartToggle && ratingInput) {
      heartToggle.onclick = () => {
        const newRating = ratingInput.value === "1" ? "0" : "1";
        ratingInput.value = newRating;
        heartToggle.textContent = newRating === "1" ? "❤️" : "🤍";
      };
    }
  };

  const populateForm = (message: MessageExtended) => {
    const tagsInput = dialog.querySelector("#messageTags") as HTMLInputElement;
    const ratingInput = dialog.querySelector(
      "#messageRating"
    ) as HTMLInputElement;
    const heartToggle = dialog.querySelector(".heart-toggle") as HTMLElement;

    if (tagsInput) {
      tagsInput.value = message.metadata?.tags?.join(", ") || "";
    }

    if (ratingInput && heartToggle) {
      const rating = message.metadata?.userRating || 0;
      ratingInput.value = rating.toString();
      heartToggle.textContent = rating ? "❤️" : "🤍";
    }

    contentEditor.setBlocks(message.content || []);
  };

  const validateContentBlocks = (blocks: ContentBlock[]): boolean => {
    if (blocks.length === 0) {
      console.error("Message must have at least one content block");
      return false;
    }

    return blocks.every((block, index) => {
      if ("text" in block && (!block.text || block.text.trim().length === 0)) {
        console.error(`Text block ${index} cannot be empty`);
        return false;
      }
      return true;
    });
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!currentMessage) return;

    const submitter = e.submitter as HTMLButtonElement;
    if (submitter.value === "Novalidate close") {
      dialog.close();
      return;
    }

    const contentBlocks = contentEditor.getBlocks();
    if (!validateContentBlocks(contentBlocks)) {
      return;
    }

    const tagsInput = (form.querySelector("#messageTags") as HTMLInputElement)
      .value;
    // const rating = parseInt(
    //   (form.querySelector("#messageRating") as HTMLInputElement)?.value
    // );

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const updatedMessage: MessageExtended = {
      ...currentMessage,
      content: contentBlocks,
      metadata: {
        ...currentMessage.metadata,
        tags,
        // userRating: rating,
        updatedAt: Date.now(),
      },
    };

    converseStore.updateMessage(currentMessage.id, updatedMessage);
    dialog.close();
  };

  // Initialize
  setupHeartToggle();
  form.onsubmit = handleSubmit;

  // Public API
  return {
    show: (message: MessageExtended) => {
      currentMessage = message;
      populateForm(message);
      dialog.showModal();
    },

    destroy: () => {
      form.onsubmit = null;
      const heartToggle = dialog.querySelector(".heart-toggle") as HTMLElement;
      if (heartToggle) {
        heartToggle.onclick = null;
      }
      contentEditor.destroy();
    },
  };
}
