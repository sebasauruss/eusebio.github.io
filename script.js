// ---------- Element references ----------
const form = document.getElementById("contact-form");
const submitButton = document.getElementById("submit-contact");
const validationMessage = document.getElementById("validation-message");
const successMessage = document.getElementById("contact-success");
const saveErrorMessage = document.getElementById("contact-save-error");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Helpers ----------
function show(element) {
  element.classList.remove("hidden");
}

function hide(element) {
  element.classList.add("hidden");
}

function hideAllNotices() {
  [validationMessage, successMessage, saveErrorMessage].forEach(hide);
}

function showValidationError(text) {
  hideAllNotices();
  validationMessage.textContent = text;
  show(validationMessage);
}

// Returns an error message, or null if the form data is valid.
function validate({ name, email, message }) {
  if (!name || !email || !message) {
    return "Please complete your name, email, and message before sending.";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

function readFormValues() {
  return {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    message: form.elements.message.value.trim(),
  };
}

// ---------- Sending messages (Formspree) ----------
// Paste your own Formspree endpoint here (looks like https://formspree.io/f/abcdwxyz)
const FORM_ENDPOINT = "https://formspree.io/f/xdekjagn";

async function handleSubmit(event) {
  event.preventDefault();
  hideAllNotices();

  const values = readFormValues();
  const error = validate(values);
  if (error) {
    showValidationError(error);
    return;
  }

  submitButton.disabled = true;

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      form.reset();
      show(successMessage);
    } else {
      show(saveErrorMessage);
    }
  } catch (error) {
    show(saveErrorMessage);
  } finally {
    submitButton.disabled = false;
  }
}

// ---------- Project gallery modal ----------
const modal = document.getElementById("project-modal");
const modalGallery = modal.querySelector(".modal-gallery");
const mainImage = document.getElementById("gallery-main");
const prevButton = document.getElementById("gallery-prev");
const nextButton = document.getElementById("gallery-next");
const counter = document.getElementById("gallery-counter");
const thumbsWrap = document.getElementById("gallery-thumbs");

const projectCards = document.querySelectorAll(".project-card");
const galleryCache = new Map(); // card -> array of image URLs that actually exist

let currentImages = [];
let currentIndex = 0;
let currentTitle = "";
let lastOpener = null;

// Checks which images in data-images actually load, so missing files never show as broken.
function filterLoadable(urls) {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          const probe = new Image();
          probe.onload = () => resolve(src);
          probe.onerror = () => resolve(null);
          probe.src = src;
        })
    )
  ).then((list) => list.filter(Boolean));
}

function coverOf(card) {
  return card.querySelector("img").getAttribute("src");
}

function imagesOf(card) {
  const found = galleryCache.get(card);
  return found && found.length ? found : [coverOf(card)];
}

function preloadGalleries() {
  projectCards.forEach((card) => {
    const urls = (card.dataset.images || "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    filterLoadable(urls).then((ok) => galleryCache.set(card, ok));
  });
}

function showImage(index) {
  const total = currentImages.length;
  currentIndex = (index + total) % total;

  mainImage.src = currentImages[currentIndex];
  mainImage.alt = `${currentTitle} screenshot ${currentIndex + 1} of ${total}`;
  counter.textContent = `${currentIndex + 1} / ${total}`;

  thumbsWrap.querySelectorAll(".gallery-thumb").forEach((thumb, i) => {
    const active = i === currentIndex;
    thumb.classList.toggle("is-active", active);
    thumb.setAttribute("aria-current", active ? "true" : "false");
    if (active) thumb.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

function buildThumbs() {
  thumbsWrap.innerHTML = "";
  currentImages.forEach((src, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-thumb";
    button.setAttribute("aria-label", `Show image ${i + 1}`);
    button.innerHTML = `<img src="${src}" alt="">`;
    button.addEventListener("click", () => showImage(i));
    thumbsWrap.appendChild(button);
  });
}

function openProject(card) {
  lastOpener = card;

  // Description comes straight from the card, so both always match.
  currentTitle = card.querySelector("h3").textContent;
  document.getElementById("modal-kicker").textContent = card.querySelector(".kicker").textContent;
  document.getElementById("modal-title").textContent = currentTitle;
  document.getElementById("modal-description").textContent = card.querySelector(".project-body .small-text").textContent;
  document.getElementById("modal-tag").textContent = card.querySelector(".tag").textContent;

  currentImages = imagesOf(card);
  modalGallery.classList.toggle("is-single", currentImages.length < 2);
  buildThumbs();
  showImage(0);

  document.body.classList.add("modal-open");
  modal.showModal();
}

function closeProject() {
  modal.close();
}

projectCards.forEach((card) => {
  card.addEventListener("click", () => openProject(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProject(card);
    }
  });
});

prevButton.addEventListener("click", () => showImage(currentIndex - 1));
nextButton.addEventListener("click", () => showImage(currentIndex + 1));
document.getElementById("modal-close").addEventListener("click", closeProject);

// Click on the dimmed backdrop closes the modal.
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeProject();
});

// Arrow keys flip through images (Escape is handled natively by <dialog>).
modal.addEventListener("keydown", (event) => {
  if (currentImages.length < 2) return;
  if (event.key === "ArrowLeft") showImage(currentIndex - 1);
  if (event.key === "ArrowRight") showImage(currentIndex + 1);
});

modal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  if (lastOpener) lastOpener.focus();
});

// ---------- Startup ----------
form.addEventListener("submit", handleSubmit);

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  preloadGalleries();
});
