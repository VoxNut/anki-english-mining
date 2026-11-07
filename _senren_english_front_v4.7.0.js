var senren_englishConfig = {};

    // Deck Presets
    (function () {
        const themeRuntime = window.SenrenEnglishTheme;
        const themeScopedPresetVars = new Set(
            themeRuntime?.themeScopedVariables || [],
        );

        const shouldApplyDeckPresetVar = (settings, key) => {
            if (!key.startsWith("--") || key === "--english-theme-mode") return false;
            return !(
                themeRuntime?.getActive() !== "nord" &&
                themeScopedPresetVars.has(key)
            );
        };

        // Apply cached settings
        const meta = document.getElementById("senren_english-metadata");
        const currentDeck = meta ? meta.getAttribute("data-deck") : null;

        if (!currentDeck) return;

        try {
            const linksJson = localStorage.getItem("senren_english_deck_presets_cache");
            const presetsJson = localStorage.getItem("senren_english_presets_cache");

            if (linksJson && presetsJson) {
                const links = JSON.parse(linksJson);
                const presets = JSON.parse(presetsJson);
                const targetPresetName = links[currentDeck];

                if (targetPresetName && presets[targetPresetName]) {
                    const settings = presets[targetPresetName];
                    for (const [key, val] of Object.entries(settings)) {
                        if (shouldApplyDeckPresetVar(settings, key)) {
                            document.documentElement.style.setProperty(
                                key,
                                val,
                            );
                            localStorage.setItem("senren_english_" + key, val);
                        }
                    }
                } else if (
                    sessionStorage.getItem("senren_english_deck_preset_applied") ===
                    "true"
                ) {
                    const activeName = presets["_active"] || "Default";
                    if (presets[activeName]) {
                        const settings = presets[activeName];
                        for (const [key, val] of Object.entries(settings)) {
                            if (shouldApplyDeckPresetVar(settings, key)) {
                                document.documentElement.style.setProperty(
                                    key,
                                    val,
                                );
                                localStorage.setItem("senren_english_" + key, val);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Sync deck style error:", e);
        }

        // Update cache if deck changed
        (async function () {
            const lastDeck = sessionStorage.getItem("senren_english_last_deck");
            if (currentDeck === lastDeck) return;

            try {
                const linksRes = await fetch(
                    `_senren_english_deck_presets.js?t=${Date.now()}`,
                );
                const presetsRes = await fetch(
                    `_senren_english_presets.js?t=${Date.now()}`,
                );

                if (linksRes.ok && presetsRes.ok) {
                    const links = await linksRes.json();
                    const presets = await presetsRes.json();

                    localStorage.setItem(
                        "senren_english_deck_presets_cache",
                        JSON.stringify(links),
                    );
                    localStorage.setItem(
                        "senren_english_presets_cache",
                        JSON.stringify(presets),
                    );

                    const targetPresetName = links[currentDeck];
                    if (targetPresetName && presets[targetPresetName]) {
                        sessionStorage.setItem(
                            "senren_english_deck_preset_applied",
                            "true",
                        );
                    } else {
                        sessionStorage.removeItem("senren_english_deck_preset_applied");
                    }
                }
            } catch (e) {
                console.error("Async deck sync error:", e);
            }
            sessionStorage.setItem("senren_english_last_deck", currentDeck);
        })();
    })();

    // Remove duplicate listeners
    if (window.senrenFrontSettingsHandler) {
        document.removeEventListener(
            "keydown",
            window.senrenFrontSettingsHandler,
        );
        window.senrenFrontSettingsHandler = null;
    }
    if (window.senrenBackKeyHandler) {
        document.removeEventListener("keydown", window.senrenBackKeyHandler);
        window.senrenBackKeyHandler = null;
    }

    // Helper functions for shortcuts
    function english_parseKeyConfig(configStr) {
        if (!configStr) return null;
        const parts = configStr
            .toLowerCase()
            .split(/[\s+]+/)
            .filter((p) => p);
        if (parts.length === 0) return null;

        const key = parts.pop();
        return {
            key: key,
            ctrl: parts.includes("ctrl") || parts.includes("control"),
            alt: parts.includes("alt"),
            shift: parts.includes("shift"),
            meta: parts.includes("meta") || parts.includes("cmd"),
        };
    }

    function english_isKeyMatch(event, config) {
        if (!config) return false;
        return (
            event.key.toLowerCase() === config.key &&
            event.ctrlKey === config.ctrl &&
            event.altKey === config.alt &&
            event.shiftKey === config.shift &&
            event.metaKey === config.meta
        );
    }

    // Theme toggle
    function darkMode() {
        if (!window.SenrenEnglishTheme) return;
        const button = document.querySelector(".toggle-custom-dark-mode");
        window.SenrenEnglishTheme.apply();

        if (button && !button.dataset.hasClickListener) {
            button.addEventListener("click", () => {
                window.SenrenEnglishTheme.cycle();
            });
            button.dataset.hasClickListener = "true";
        }
    }

    // Toggles visibility of word/sentence
    function toggleVisibility(wrapperId, innerElementId) {
        const wrapper = document.getElementById(wrapperId);
        const innerElement = document.getElementById(innerElementId);

        if (wrapper && innerElement) {
            const isExpanded = wrapper.classList.contains("expanded");

            if (!isExpanded) {
                const scrollHeight = innerElement.scrollHeight + "px";
                wrapper.style.maxHeight = scrollHeight;
                wrapper.classList.add("expanded");
            } else {
                wrapper.style.maxHeight = wrapper.scrollHeight + "px";
                requestAnimationFrame(() => {
                    wrapper.classList.remove("expanded");
                    wrapper.style.maxHeight = "0px";
                });
            }
        }
    }

    // Shows or hides the audio card sentence based on CSS variables
    function initializeAudioSentenceState() {
        const isAudioCard =
            document.getElementById("senren_english-metadata")?.getAttribute("data-audio-card") ===
            "true";
        if (!isAudioCard) {
            return;
        }

        const wrapper = english_ELS.sentenceWrapperAudio;
        const innerElement = english_ELS.sentenceAudio;

        if (wrapper && innerElement) {
            const expandByDefault = senren_englishConfig.audioSentenceDefaultExpanded;

            if (expandByDefault === "true") {
                const originalWrapperTransition = wrapper.style.transition;
                const originalInnerElementTransition =
                    innerElement.style.transition;

                wrapper.style.transition = "none";
                innerElement.style.transition = "none";

                requestAnimationFrame(() => {
                    const scrollHeight = innerElement.scrollHeight + "px";
                    wrapper.style.maxHeight = scrollHeight;
                    wrapper.classList.add("expanded");

                    requestAnimationFrame(() => {
                        wrapper.style.transition = originalWrapperTransition;
                        innerElement.style.transition =
                            originalInnerElementTransition;
                    });
                });
            }
        }
    }

    // Shows or hides the word card sentence based on CSS variables
    function initializeSentenceState() {
        const wrapper = english_ELS.sentenceWrapper;
        const innerElement = english_ELS.sentence;

        if (wrapper && innerElement) {
            const expandByDefault = senren_englishConfig.wordSentenceDefaultExpanded;

            if (expandByDefault === "true") {
                const originalWrapperTransition = wrapper.style.transition;
                const originalInnerElementTransition =
                    innerElement.style.transition;

                wrapper.style.transition = "none";
                innerElement.style.transition = "none";

                requestAnimationFrame(() => {
                    const scrollHeight = innerElement.scrollHeight + "px";
                    wrapper.style.maxHeight = scrollHeight;
                    wrapper.classList.add("expanded");

                    requestAnimationFrame(() => {
                        wrapper.style.transition = originalWrapperTransition;
                        innerElement.style.transition =
                            originalInnerElementTransition;
                    });
                });
            }
        }
    }

    // Shows or hides the hint based on CSS variables
    function initializeHintState() {
        const wrapper = english_ELS.hintWrapper;
        const innerElement = english_ELS.hintContent;

        if (wrapper && innerElement) {
            const expandByDefault = senren_englishConfig.hintDefaultExpanded;

            if (expandByDefault === "true") {
                const originalWrapperTransition = wrapper.style.transition;
                const originalInnerElementTransition =
                    innerElement.style.transition;

                wrapper.style.transition = "none";
                innerElement.style.transition = "none";

                requestAnimationFrame(() => {
                    const scrollHeight = innerElement.scrollHeight + "px";
                    wrapper.style.maxHeight = scrollHeight;
                    wrapper.classList.add("expanded");

                    requestAnimationFrame(() => {
                        wrapper.style.transition = originalWrapperTransition;
                        innerElement.style.transition =
                            originalInnerElementTransition;
                    });
                });
            }
        }
    }

    // Groups text and audio into navigable scenes
    function enableFrontSceneSwitching() {
        let initialPlayTimeout;
        let replayTimeout;

        const textContainers = [english_ELS.sentence, english_ELS.sentenceAudio].filter(
            Boolean,
        );

        const audioWrapper = english_ELS.sentenceAudioContainer;
        let audioParts = [];
        if (audioWrapper) {
            audioParts = Array.from(audioWrapper.children).filter((el) => {
                return (
                    el.classList.contains("soundLink") ||
                    el.classList.contains("replay-button") ||
                    el.tagName === "AUDIO"
                );
            });
        }

        let hasSplitText = false;
        let textSlideCount = 0;

        textContainers.forEach((container) => {
            if (container.getAttribute("data-split-done")) {
                const existingParts = container.querySelectorAll(
                    ".split-sentence-part",
                );
                if (existingParts.length > 0) {
                    hasSplitText = true;
                    textSlideCount = Math.max(
                        textSlideCount,
                        existingParts.length,
                    );
                }
                return;
            }

            const groupWrappers = Array.from(
                container.querySelectorAll(".group"),
            ).filter((el) => el.textContent.trim().length > 0);

            if (groupWrappers.length > 0) {
                const parts = groupWrappers.map((el) => el.outerHTML);
                container.innerHTML = "";
                parts.forEach((partHTML, index) => {
                    const div = document.createElement("div");
                    div.classList.add("split-sentence-part");
                    div.innerHTML = partHTML;
                    div.style.display = index === 0 ? "block" : "none";
                    container.appendChild(div);
                });
                container.setAttribute("data-split-done", "true");
                hasSplitText = true;
                textSlideCount = Math.max(textSlideCount, parts.length);
            }
        });

        let totalSlides = Math.max(textSlideCount, audioParts.length);

        if (totalSlides <= 1) {
            return;
        }

        const frontContainer = english_ELS.front;
        if (frontContainer && !frontContainer.querySelector(".sentence-nav")) {
            const arrowLeft = document.createElement("div");
            arrowLeft.className = "sentence-nav left";
            frontContainer.appendChild(arrowLeft);
            const arrowRight = document.createElement("div");
            arrowRight.className = "sentence-nav right";
            frontContainer.appendChild(arrowRight);

            [arrowLeft, arrowRight].forEach((arrow) => {
                arrow.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (initialPlayTimeout) clearTimeout(initialPlayTimeout);
                    const direction = arrow.classList.contains("left") ? -1 : 1;
                    changeScene(direction);
                });
            });
        }

        let currentIndex = 0;

        function changeScene(direction) {
            currentIndex += direction;
            if (currentIndex >= totalSlides) currentIndex = 0;
            else if (currentIndex < 0) currentIndex = totalSlides - 1;
            updateDisplay(true);
        }

        const baseWaitTime = 100;
        const timePerChar = 150;

        const readingEl = english_ELS.hiddenReading;
        let charCount = 5;

        if (readingEl) {
            const targetEl = readingEl.querySelector("li") || readingEl;
            let rawText = targetEl.textContent || "";

            let cleanedText = rawText.replace(english_REGEX.KANA_MODIFIERS, "");

            cleanedText = cleanedText.replace(
                /[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]/g,
                "",
            );

            let effectiveCount = cleanedText.length;

            const narrowMatches = cleanedText.match(english_REGEX.NARROW_VOWELS);

            if (narrowMatches) {
                effectiveCount -= narrowMatches.length * 0.3;
            }

            charCount = Math.round(effectiveCount);

            if (charCount < 1) charCount = 1;
        }

        let SENTENCE_DELAY;

        const hasWordAudio = !!english_ELS.wordAudio?.querySelector(
            ".soundLink, .replaybutton, .replay-button, audio",
        );

        if (!hasWordAudio) {
            SENTENCE_DELAY = 0;
        } else {
            if (charCount === 2) SENTENCE_DELAY = 550;
            else if (charCount === 3) SENTENCE_DELAY = 650;
            else if (charCount === 4) SENTENCE_DELAY = 700;
            else if (charCount === 5) SENTENCE_DELAY = 850;
            else if (charCount === 6) SENTENCE_DELAY = 1000;
            else if (charCount === 7) SENTENCE_DELAY = 1080;
            else if (charCount === 8) SENTENCE_DELAY = 1150;
            else SENTENCE_DELAY = baseWaitTime + charCount * timePerChar;
        }

        const handleFrontShortcuts = (e) => {
            if (
                document.activeElement &&
                ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
            )
                return;

            const cssVal = senren_englishConfig.sceneReplayShortcutKey;
            const replayConfig = english_parseKeyConfig(cssVal) || {
                key: "w",
                ctrl: false,
                alt: false,
                shift: false,
                meta: false,
            };

            if (english_isKeyMatch(e, replayConfig)) {
                e.preventDefault();
                e.stopPropagation();
                if (initialPlayTimeout) clearTimeout(initialPlayTimeout);
                if (replayTimeout) clearTimeout(replayTimeout);

                document.querySelectorAll("audio").forEach((a) => {
                    try {
                        a.pause();
                        a.currentTime = 0;
                    } catch (e) {}
                });

                const wordAudioContainer = english_ELS.wordAudio;
                const wordAudioBtn = wordAudioContainer
                    ? wordAudioContainer.querySelector(
                          ".soundLink, .replaybutton, .replay-button",
                      )
                    : null;

                if (wordAudioBtn) {
                    wordAudioBtn.click();
                }

                const replayLoadOffset = 200;
                const delay = wordAudioBtn
                    ? SENTENCE_DELAY + replayLoadOffset
                    : 0;

                replayTimeout = setTimeout(() => {
                    updateDisplay(true);
                }, delay);

                return;
            }

            if (e.ctrlKey && e.key === "j") {
                e.preventDefault();
                e.stopPropagation();
                if (initialPlayTimeout) clearTimeout(initialPlayTimeout);
                if (replayTimeout) clearTimeout(replayTimeout);
                changeScene(-1);
            } else if (e.ctrlKey && e.key === "k") {
                e.preventDefault();
                e.stopPropagation();
                if (initialPlayTimeout) clearTimeout(initialPlayTimeout);
                if (replayTimeout) clearTimeout(replayTimeout);
                changeScene(1);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                e.stopPropagation();
                if (initialPlayTimeout) clearTimeout(initialPlayTimeout);
                if (replayTimeout) clearTimeout(replayTimeout);
                changeScene(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                e.stopPropagation();
                if (initialPlayTimeout) clearTimeout(initialPlayTimeout);
                if (replayTimeout) clearTimeout(replayTimeout);
                changeScene(1);
            }
        };

        if (window.currentSceneKeyHandler) {
            document.removeEventListener(
                "keydown",
                window.currentSceneKeyHandler,
            );
            window.currentSceneKeyHandler = null;
        }
        window.currentSceneKeyHandler = handleFrontShortcuts;
        document.addEventListener("keydown", handleFrontShortcuts);

        function updateDisplay(playAudio) {
            textContainers.forEach((container) => {
                const parts = container.querySelectorAll(
                    ".split-sentence-part",
                );
                if (parts.length > 0) {
                    parts.forEach((part, i) => {
                        part.style.display =
                            i === currentIndex ? "block" : "none";
                    });
                    const wrapper = container.closest(".expanded");
                    if (wrapper)
                        wrapper.style.maxHeight = container.scrollHeight + "px";
                }
            });

            if (audioParts.length > 0) {
                audioParts.forEach((btn, i) => {
                    const shouldShow =
                        i === currentIndex || audioParts.length === 1;
                    if (shouldShow) {
                        btn.style.setProperty(
                            "display",
                            "inline-flex",
                            "important",
                        );
                    } else {
                        btn.style.setProperty("display", "none", "important");
                    }
                });
            }

            if (playAudio && audioParts.length > 0) {
                let target = audioParts[currentIndex];
                if (!target && audioParts.length === 1) target = audioParts[0];

                if (target) {
                    if (typeof target.click === "function") target.click();
                    else {
                        const trigger = target.querySelector(
                            ".soundLink, .replaybutton, .replay-button",
                        );
                        if (trigger) trigger.click();
                    }
                }
            }
        }

        updateDisplay(false);

        const muteNsfw = senren_englishConfig.muteNsfwAudio;

        if (muteNsfw !== "true") {
            initialPlayTimeout = setTimeout(() => {
                updateDisplay(true);
            }, SENTENCE_DELAY);
        }
    }

    // Enables custom shortcuts
    function enableCustomShortcuts() {
        ["senrenFrontSettingsHandler", "senrenBackKeyHandler"].forEach((h) => {
            if (window[h]) document.removeEventListener("keydown", window[h]);
            window[h] = null;
        });

        const utils = {
            isTyping: () => {
                const active = document.activeElement;
                return active && ["INPUT", "TEXTAREA"].includes(active.tagName);
            },

            getVar: (name) => {
                const map = {
                    "--english-toggle-settings-key": "toggleSettingsKey",
                    "--english-toggle-custom-dark-mode-key": "toggleCustomDarkModeKey",
                };
                const key = map[name];
                return key ? senren_englishConfig[key] : "";
            },
        };

        const actions = {
            settings: () => {
                const modal = document.getElementById("senren_english-settings-modal");
                const btn = document.querySelector(".toggle-settings-btn");

                if (modal) {
                    modal.classList.toggle("active");
                } else if (btn) {
                    btn.click();
                }
            },

            customDarkMode: () => {
                const dmBtn = document.querySelector(
                    ".toggle-custom-dark-mode",
                );

                if (dmBtn) dmBtn.click();
            },
        };

        window.senrenFrontSettingsHandler = (e) => {
            if (utils.isTyping()) return;

            const shortcuts = [
                {
                    key: senren_englishConfig.toggleSettingsKey,
                    action: actions.settings,
                },
                {
                    key: senren_englishConfig.toggleCustomDarkModeKey,
                    action: actions.customDarkMode,
                },
            ];

            for (const item of shortcuts) {
                const keyStr = item.key;

                if (!keyStr) continue;

                const config = english_parseKeyConfig(keyStr);

                if (english_isKeyMatch(e, config)) {
                    e.preventDefault();
                    e.stopPropagation();

                    item.action();
                    break;
                }
            }
        };

        document.addEventListener("keydown", window.senrenFrontSettingsHandler);
    }

    // Adjusts word size based on character length
    function dynamicWordSize() {}

    (function () {
        window.senren_englishUpdateConfig = function () {
            // Regex Cache
            window.english_REGEX = {
                KANA_MODIFIERS: /[\s\u3099\u309A\u309B\u309C]/g,
                NARROW_VOWELS:
                    /[いきしちにひみりぎじぢびぴイキシチニヒミリギジヂビピうくすつぬふむるぐずづぶぷウクスツヌフムルグズヅブプ]/g,
            };

            // DOM Cache
            window.english_ELS = {
                word: document.getElementById("word"),
                sentence: document.getElementById("sentence"),
                sentenceAudio: document.getElementById("sentence-audio"),
                sentenceWrapper: document.getElementById("sentence-wrapper"),
                sentenceWrapperAudio: document.getElementById(
                    "sentence-wrapper-audio",
                ),
                hiddenReading: document.getElementById("hiddenReading"),
                sentenceAudioContainer:
                    document.getElementById("sentenceAudio"),
                wordAudio: document.getElementById("wordAudio"),
                words: document.querySelectorAll("#word"),
                front: document.querySelector(".front"),
                hintWrapper: document.getElementById("hint-wrapper"),
                hintContent: document.getElementById("hint-content"),
            };

            const style = getComputedStyle(document.documentElement);
            const getVar = (prop) =>
                style.getPropertyValue(prop).trim().toLowerCase();

            // Sentence
            senren_englishConfig.audioSentenceDefaultExpanded = getVar(
                "--english-audio-sentence-default-expanded",
            );
            senren_englishConfig.wordSentenceDefaultExpanded = getVar(
                "--english-word-sentence-default-expanded",
            );

            // Hint
            senren_englishConfig.hintDefaultExpanded = getVar(
                "--english-hint-default-expanded",
            );

            // Audio
            senren_englishConfig.muteNsfwAudio = getVar("--english-mute-nsfw-audio");

            // Keys
            senren_englishConfig.sceneReplayShortcutKey = getVar(
                "--english-scene-replay-shortcut-key",
            );
            senren_englishConfig.toggleSettingsKey = getVar("--english-toggle-settings-key");
            senren_englishConfig.toggleCustomDarkModeKey = getVar(
                "--english-toggle-custom-dark-mode-key",
            );
        };

        // Initial load
        window.senren_englishUpdateConfig();

        window.english_IS_MOBILE =
            document.documentElement.classList.contains("mobile") ||
            document.body.classList.contains("mobile");
        window.SENREN_ENGLISH_COMPACT_VIEW =
            window.english_IS_MOBILE ||
            (window.matchMedia &&
                window.matchMedia("(max-width: 1050px)").matches);
        window.SENREN_ENGLISH_HAS_HOVER = !(
            window.matchMedia && window.matchMedia("(hover: none)").matches
        );

        const delayedFunctions =
            window.requestIdleCallback ||
            function (cb) {
                return setTimeout(cb, 1);
            };

        // Initializes immediate functions
        function init() {
            darkMode();
            dynamicWordSize();
            initializeAudioSentenceState();
            initializeSentenceState();
            initializeHintState();
            enableFrontSceneSwitching();
            setupSettingsButton();
        }

        window.senren_englishLoadSettingsMenu = function (callback) {
            if (window.senren_englishBuildMenu) {
                if (callback) callback();
                return;
            }
            const script = document.createElement("script");
            script.src = "_senren_english_settings_v4.7.0.js?v=20261008.1";
            script.onload = () => {
                setTimeout(callback, 100);
            };
            document.body.appendChild(script);
        };

        function setupSettingsButton() {
            const btn = document.querySelector(".toggle-settings-btn");
            if (btn && !btn.dataset.hasLazyLoadListener) {
                btn.dataset.hasLazyLoadListener = "true";
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const modal = document.getElementById("senren_english-settings-modal");
                    if (modal) {
                        modal.classList.add("active");
                        if (window.english_renderPresetUI) window.english_renderPresetUI();
                    } else {
                        window.senren_englishLoadSettingsMenu(() => {
                            const m = document.getElementById("senren_english-settings-modal");
                            if (m) {
                                m.classList.add("active");
                                if (window.english_renderPresetUI) window.english_renderPresetUI();
                            }
                        });
                    }
                });
            }
        }

        // initializes deferred functions
        function initDeferred() {
            delayedFunctions(() => {
                if (!window.SENREN_ENGLISH_COMPACT_VIEW) {
                    enableCustomShortcuts();
                }
            });
        }

        init();
        initDeferred();
    })();

    void "_senren_english_settings_v4.7.0.css";
    void "_senren_english_defaults_v4.7.0.css";
    void "_senren_english_deck_presets.js";
    void "_senren_english_presets.js";
