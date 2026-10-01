import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Modal from "./Modal";

function flushFrames() {
  return act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

describe("<Modal /> TinyMCE menus", () => {
  afterEach(() => {
    document
      .querySelectorAll(".tox-tinymce-aux, .tox-dialog-wrap")
      .forEach((node) => node.remove());
  });

  it("parks toolbar menus inside the dialog and clears inert", async () => {
    const aux = document.createElement("div");
    aux.className = "tox-tinymce-aux";
    aux.inert = true;
    aux.setAttribute("aria-hidden", "true");
    const menu = document.createElement("button");
    menu.type = "button";
    menu.textContent = "Paragraph";
    aux.appendChild(menu);
    document.body.appendChild(aux);

    render(
      <Modal isOpen onClose={() => {}} title="Edit event">
        <p>Body</p>
      </Modal>
    );
    await flushFrames();

    const panel = document.querySelector('[id^="headlessui-dialog-panel"]');
    expect(panel).not.toBeNull();
    expect(panel?.contains(aux)).toBe(true);
    expect(aux.inert).toBe(false);
    expect(aux.getAttribute("aria-hidden")).toBeNull();
    expect(menu.closest("[inert]")).toBeNull();
  });

  it("parks a menu that TinyMCE adds after the dialog opens", async () => {
    render(
      <Modal isOpen onClose={() => {}} title="Edit category">
        <p>Body</p>
      </Modal>
    );
    await flushFrames();

    const aux = document.createElement("div");
    aux.className = "tox-tinymce-aux";
    document.body.appendChild(aux);
    await flushFrames();

    const panel = document.querySelector('[id^="headlessui-dialog-panel"]');
    expect(panel?.contains(aux)).toBe(true);
    expect(aux.inert).toBe(false);
  });
});
