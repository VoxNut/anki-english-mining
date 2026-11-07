(function () {
  "use strict";

  if (window.SenrenEnglishTheme) return;

  const modes = Object.freeze(["nord", "focus"]);
  const storageKey = "senren_english_--english-theme-mode";
  const legacyStorageKey = "senren_englishTheme";
  const legacyDarkModeKey = "english_darkMode";
  const themeClasses = [
    "custom-dark-mode",
    "focus-theme",
  ];
  const themeScopedVariables = Object.freeze([
    "--english-bd-text-shadow-color-light",
    "--english-bd-text-shadow-color",
    "--english-bd-text-shadow-opacity-light",
    "--english-bd-text-shadow-opacity",
    "--english-text-light",
    "--english-text",
    "--english-light-highlight",
    "--english-dark-highlight",
    "--english-light-devoiced-color",
    "--english-dark-devoiced-color",
    "--english-freq-text-light",
    "--english-freq-text",
    "--english-tag-bg-light",
    "--english-tag-bg",
    "--english-tag-color-light",
    "--english-tag-color",
    "--english-tag-color-hover-light",
    "--english-tag-color-hover",
    "--english-external-links-bg-light",
    "--english-external-links-bg",
    "--english-external-links-bg-hover-light",
    "--english-external-links-bg-hover",
    "--english-misc-info-text-light",
    "--english-misc-info-text",
    "--english-misc-info-text-hover-light",
    "--english-misc-info-text-hover",
    "--english-misc-info-bg-light",
    "--english-misc-info-bg",
    "--english-misc-info-bg-hover-light",
    "--english-misc-info-bg-hover",
    "--english-svg-color-light",
    "--english-svg-color",
    "--english-svg-hover-light",
    "--english-svg-hover",
    "--english-buttons-bg-light",
    "--english-buttons-bg",
    "--english-buttons-bg-hover-light",
    "--english-buttons-bg-hover",
    "--english-background-light",
    "--english-background",
    "--english-card-bg-light",
    "--english-card-bg",
    "--english-card-shadow-light",
    "--english-card-shadow",
    "--english-lightbox-bg-light",
    "--english-lightbox-bg",
    "--english-pitch-position-bg-light",
    "--english-pitch-position-bg",
    "--english-pitch-red-light",
    "--english-pitch-red",
    "--english-pitch-blue-light",
    "--english-pitch-blue",
    "--english-pitch-orange-light",
    "--english-pitch-orange",
    "--english-pitch-green-light",
    "--english-pitch-green",
    "--english-pitch-purple-light",
    "--english-pitch-purple",
    "--english-word-bg-light",
    "--english-word-bg",
    "--english-picture-bg-light",
    "--english-picture-bg",
    "--english-notes-bg-light",
    "--english-notes-bg",
    "--english-definition-bg-light",
    "--english-definition-bg",
    "--english-frequency-bg-light",
    "--english-frequency-bg",
  ]);

  function normalize(value) {
    const mode = String(value || "").trim().toLowerCase();
    return modes.includes(mode) ? mode : "";
  }

  function getStored() {
    const rawStored =
      localStorage.getItem(storageKey) ||
      localStorage.getItem(legacyStorageKey);
    const stored = normalize(rawStored);
    if (stored) return stored;
    if (rawStored) return "nord";

    return localStorage.getItem(legacyDarkModeKey) === "enabled"
      ? "focus"
      : "nord";
  }

  function getActive() {
    const root = document.documentElement;
    return (
      normalize(root.dataset.senren_englishTheme) ||
      normalize(root.style.getPropertyValue("--english-theme-mode")) ||
      getStored()
    );
  }

  function syncControls(mode) {
    document.querySelectorAll(".toggle-custom-dark-mode").forEach((button) => {
      button.classList.toggle("dark-mode", mode !== "nord");
      button.setAttribute(
        "title",
        `Theme: ${mode === "nord" ? "Nord" : "Focus"}`,
      );
    });

    document.querySelectorAll(".sun-icon").forEach((icon) => {
      icon.style.display = mode === "focus" ? "inline" : "none";
    });
    document.querySelectorAll(".moon-icon").forEach((icon) => {
      icon.style.display = mode === "focus" ? "none" : "inline";
    });

    document
      .querySelectorAll(
        '.senren_english-segment-group[data-var="--english-theme-mode"] .senren_english-segment-btn',
      )
      .forEach((button) => {
        button.classList.toggle(
          "active",
          normalize(button.getAttribute("data-val")) === mode,
        );
      });
  }

  function syncThemeVariables(mode) {
    const root = document.documentElement;

    themeScopedVariables.forEach((variable) => {
      if (mode !== "nord") {
        // Focus owns a complete monochrome palette in style.css. Removing
        // inline settings prevents an older Nord preset from leaking into it.
        root.style.removeProperty(variable);
        return;
      }

      const storedValue = localStorage.getItem("senren_english_" + variable);
      if (storedValue === null) root.style.removeProperty(variable);
      else root.style.setProperty(variable, storedValue);
    });
  }

  function apply(value, options = {}) {
    const mode = normalize(value) || getStored();
    const root = document.documentElement;
    const persist = options.persist !== false;

    root.classList.remove(...themeClasses);
    if (mode !== "nord") root.classList.add("custom-dark-mode");
    if (mode === "focus") root.classList.add("focus-theme");

    root.dataset.senren_englishTheme = mode;
    root.style.setProperty("--english-theme-mode", mode);
    syncThemeVariables(mode);

    if (persist) {
      localStorage.setItem(storageKey, mode);
      localStorage.setItem(legacyStorageKey, mode);
      localStorage.setItem(
        legacyDarkModeKey,
        mode === "nord" ? "disabled" : "enabled",
      );
    }

    syncControls(mode);
    return mode;
  }

  function cycle() {
    const currentIndex = modes.indexOf(getActive());
    return apply(modes[(currentIndex + 1) % modes.length]);
  }

  function restoreVariables() {
    const root = document.documentElement;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith("senren_english_--") || key === storageKey) {
        continue;
      }

      const value = localStorage.getItem(key);
      if (value !== null) root.style.setProperty(key.substring("senren_english_".length), value);
    }
  }

  function setupLeftControlsReveal() {
    if (window.__senren_englishLeftControlsRevealBound) return;
    window.__senren_englishLeftControlsRevealBound = true;

    const closeHeader = (header) => {
      header.classList.remove("left-controls-open");
      const focused = document.activeElement;
      if (focused && header.contains(focused) && typeof focused.blur === "function") {
        focused.blur();
      }
    };

    const closeAll = (except = null) => {
      document.querySelectorAll(".header.left-controls-open").forEach((header) => {
        if (header !== except) closeHeader(header);
      });
    };

    document.addEventListener("click", (event) => {
      const reveal = event.target.closest?.(".left-controls-reveal");
      if (reveal) {
        event.preventDefault();
        event.stopPropagation();
        const header = reveal.closest(".header");
        if (!header) return;

        const shouldOpen = !header.classList.contains("left-controls-open");
        closeAll(header);
        if (shouldOpen) header.classList.add("left-controls-open");
        else closeHeader(header);
        return;
      }

      if (!event.target.closest?.(".header .senren_english-left-control")) closeAll();
    });

    document.addEventListener("keydown", (event) => {
      const reveal = event.target.closest?.(".left-controls-reveal");
      if (reveal && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        reveal.click();
      } else if (event.key === "Escape") {
        closeAll();
      }
    });
  }

  const api = Object.freeze({
    modes,
    themeScopedVariables,
    normalize,
    getStored,
    getActive,
    apply,
    cycle,
    syncControls,
    isThemeScopedVariable: (variable) =>
      themeScopedVariables.includes(variable),
  });

  window.SenrenEnglishTheme = api;
  window.SENREN_ENGLISH_THEME_MODES = modes;
  window.senren_englishApplyThemeMode = apply;

  restoreVariables();
  setupLeftControlsReveal();
  apply(getStored(), { persist: false });
  window.__senren_englishSettingsRestored = true;
})();
