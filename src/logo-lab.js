const root = document.body;
const concepts = document.querySelectorAll(".concept");

const colors = {
  ink: { accent: "var(--lab-ink)", status: "Monochrome first. Sumi ink tests positive and knockout hinata-mon contrast." },
  cinnabar: { accent: "var(--lab-cinnabar)", status: "Muted cinnabar tests a seal-ink impression across solid silhouettes and fine kamon linework." },
  pine: { accent: "var(--lab-pine)", status: "Pine tests deep mineral-green ink across warm and cool papers." },
};

for (const swatch of document.querySelectorAll("[data-color]")) {
  swatch.addEventListener("click", () => {
    const color = colors[swatch.dataset.color];
    if (!color) return;
    root.style.setProperty("--lab-accent", color.accent);
    root.dataset.color = swatch.dataset.color;
    for (const item of document.querySelectorAll("[data-color]")) item.classList.toggle("is-active", item === swatch);
    document.querySelector(".control-status").textContent = color.status;
  });
}

for (const segment of document.querySelectorAll("[data-detail]")) {
  segment.addEventListener("click", () => {
    root.dataset.detail = segment.dataset.detail;
    for (const item of document.querySelectorAll("[data-detail]")) item.classList.toggle("is-active", item === segment);
  });
}

for (const concept of document.querySelectorAll(".concept")) {
  const source = concept.querySelector(".standalone-mark svg");
  if (!source) continue;
  const shelf = document.createElement("div");
  shelf.className = "size-check";
  shelf.innerHTML = '<span class="size-check-label">Scale check</span>';
  for (const size of [16, 32, 64]) {
    const sample = document.createElement("span");
    sample.className = "size-sample";
    sample.style.setProperty("--sample-size", `${size}px`);
    const label = document.createElement("span");
    label.textContent = size;
    label.className = "size-sample-label";
    const svg = source.cloneNode(true);
    svg.setAttribute("aria-hidden", "true");
    sample.append(svg, label);
    shelf.append(sample);
  }
  concept.append(shelf);
}

for (const concept of concepts) {
  const title = concept.querySelector("h3")?.textContent.trim();
  if (!title) continue;
  concept.setAttribute("role", "button");
  concept.setAttribute("tabindex", "0");
  concept.setAttribute("aria-label", `Select ${title}`);
  concept.setAttribute("aria-pressed", "false");
  const select = () => {
    for (const item of concepts) {
      const selected = item === concept;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    }
    document.querySelector(".selection-status").textContent = `Selected: ${title}. Keep this direction, then ask for a focused iteration.`;
  };
  concept.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    select();
  });
  concept.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    select();
  });
}
