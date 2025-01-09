import KxsClient from "./KxsClient";
import { PingManager } from "./Ping";

interface HealthChangeAnimation {
  element: HTMLElement;
  startTime: number;
  duration: number;
  value: number;
}

interface CounterPosition {
  left: number;
  top: number;
}

class KxsClientHUD {
  frameCount: number;
  fps: number;
  kills: number;
  private pingManager: PingManager;
  isMenuVisible: boolean;
  kxsClient: KxsClient;
  private healthAnimations: HealthChangeAnimation[] = [];
  private lastHealthValue: number = 100;

  constructor(kxsClient: KxsClient) {
    this.kxsClient = kxsClient;
    this.frameCount = 0;
    this.fps = 0;
    this.kills = 0;
    this.isMenuVisible = true;
    this.pingManager = new PingManager();

    if (this.kxsClient.isPingVisible) {
      this.initCounter("ping", "Ping", "45ms");
    }
    if (this.kxsClient.isFpsVisible) {
      this.initCounter("fps", "FPS", "60");
    }
    if (this.kxsClient.isKillsVisible) {
      this.initCounter("kills", "Kills", "0");
    }

    this.setupWeaponBorderHandler();
    this.startUpdateLoop();
  }

  private initResponsiveHandling() {
    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();
  }

  private handleResize() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    for (const name of ['fps', 'kills', 'ping']) {
      const counterContainer = document.getElementById(`${name}CounterContainer`);
      if (!counterContainer) continue;

      const counter = this.kxsClient.counters[name];
      if (!counter) continue;

      const rect = counterContainer.getBoundingClientRect();
      const savedPosition = this.getSavedPosition(name);

      let newPosition = this.calculateSafePosition(
        savedPosition,
        rect.width,
        rect.height,
        viewportWidth,
        viewportHeight
      );

      this.applyPosition(counterContainer, newPosition);
      this.savePosition(name, newPosition);
    }
  }

  private calculateSafePosition(
    currentPosition: CounterPosition,
    elementWidth: number,
    elementHeight: number,
    viewportWidth: number,
    viewportHeight: number
  ): CounterPosition {
    let { left, top } = currentPosition;

    // Ajuster la position horizontale si nécessaire
    if (left + elementWidth > viewportWidth) {
      left = viewportWidth - elementWidth;
    }
    if (left < 0) {
      left = 0;
    }

    // Ajuster la position verticale si nécessaire
    if (top + elementHeight > viewportHeight) {
      top = viewportHeight - elementHeight;
    }
    if (top < 0) {
      top = 0;
    }

    return { left, top };
  }

  private getSavedPosition(name: string): CounterPosition {
    const savedPosition = localStorage.getItem(`${name}CounterPosition`);
    if (savedPosition) {
      try {
        return JSON.parse(savedPosition);
      } catch {
        return this.kxsClient.defaultPositions[name];
      }
    }
    return this.kxsClient.defaultPositions[name];
  }

  private applyPosition(element: HTMLElement, position: CounterPosition) {
    element.style.left = `${position.left}px`;
    element.style.top = `${position.top}px`;
  }

  private savePosition(name: string, position: CounterPosition) {
    localStorage.setItem(`${name}CounterPosition`, JSON.stringify(position));
  }

  startUpdateLoop() {
    const now = performance.now();
    const delta = now - this.kxsClient.lastFrameTime;

    this.frameCount++;

    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.kxsClient.lastFrameTime = now;

      this.kills = this.kxsClient.getKills();

      if (this.kxsClient.isFpsVisible && this.kxsClient.counters.fps) {
        this.kxsClient.counters.fps.textContent = `FPS: ${this.fps}`;
      }

      if (this.kxsClient.isKillsVisible && this.kxsClient.counters.kills) {
        this.kxsClient.counters.kills.textContent = `Kills: ${this.kills}`;
      }

      if (
        this.kxsClient.isPingVisible &&
        this.kxsClient.counters.ping &&
        this.pingManager
      ) {
        const result = this.pingManager.getPingResult();
        this.kxsClient.counters.ping.textContent = `PING: ${result.ping} ms`;
      }
    }

    this.pingManager.startPingTest();

    if (this.kxsClient.animationFrameCallback) {
      this.kxsClient.animationFrameCallback(() => this.startUpdateLoop());
    }
    this.updateUiElements();
    this.updateBoostBars();
    this.updateHealthBars();
    this.kxsClient.kill_leader?.update(this.kills);
  }

  initCounter(name: string, label: string, initialText: string) {
    const counter = document.createElement("div");
    counter.id = `${name}Counter`;
    const counterContainer = document.createElement("div");
    counterContainer.id = `${name}CounterContainer`;

    Object.assign(counterContainer.style, {
      position: "absolute",
      left: `${this.kxsClient.defaultPositions[name].left}px`,
      top: `${this.kxsClient.defaultPositions[name].top}px`,
      zIndex: "10000",
    });

    Object.assign(counter.style, {
      color: "white",
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderRadius: "5px",
      fontFamily: "Arial, sans-serif",
      padding: "5px 10px",
      pointerEvents: "auto",
      cursor: "move",
      width: `${this.kxsClient.defaultSizes[name].width}px`,
      height: `${this.kxsClient.defaultSizes[name].height}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      resize: "both",
      overflow: "hidden",
    });

    counter.textContent = `${label}: ${initialText}`;
    counterContainer.appendChild(counter);

    const uiTopLeft = document.getElementById("ui-top-left");
    if (uiTopLeft) {
      uiTopLeft.appendChild(counterContainer);
    }

    const adjustFontSize = () => {
      const { width, height } = counter.getBoundingClientRect();
      const size = Math.min(width, height) * 0.4;
      counter.style.fontSize = `${size}px`;
    };

    new ResizeObserver(adjustFontSize).observe(counter);

    counter.addEventListener("mousedown", (event) => {
      if (event.button === 1) {
        this.resetCounter(name, label, initialText);
        event.preventDefault();
      }
    });

    this.kxsClient.makeDraggable(counterContainer, `${name}CounterPosition`);
    this.kxsClient.counters[name] = counter;
  }

  resetCounter(name: string, label: string, initialText: string) {
    const counter = this.kxsClient.counters[name];
    const container = document.getElementById(`${name}CounterContainer`);

    if (!counter || !container) return;

    // Reset only this counter's position and size
    Object.assign(container.style, {
      left: `${this.kxsClient.defaultPositions[name].left}px`,
      top: `${this.kxsClient.defaultPositions[name].top}px`,
    });

    Object.assign(counter.style, {
      width: `${this.kxsClient.defaultSizes[name].width}px`,
      height: `${this.kxsClient.defaultSizes[name].height}px`,
      fontSize: "18px",
    });

    counter.textContent = `${label}: ${initialText}`;

    // Clear the saved position for this counter only
    localStorage.removeItem(`${name}CounterPosition`);
  }

  updateBoostBars() {
    const boostCounter = document.querySelector("#ui-boost-counter");
    if (boostCounter) {
      const boostBars = boostCounter.querySelectorAll(
        ".ui-boost-base .ui-bar-inner",
      );

      let totalBoost = 0;
      const weights = [25, 25, 40, 10];

      boostBars.forEach((bar, index) => {
        const width = parseFloat((bar as HTMLElement).style.width);
        if (!isNaN(width)) {
          totalBoost += width * (weights[index] / 100);
        }
      });

      const averageBoost = Math.round(totalBoost);
      let boostDisplay = boostCounter.querySelector(".boost-display");

      if (!boostDisplay) {
        boostDisplay = document.createElement("div");
        boostDisplay.classList.add("boost-display");
        Object.assign((boostDisplay as HTMLElement).style, {
          position: "absolute",
          bottom: "75px",
          right: "335px",
          color: "#FF901A",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          padding: "5px 10px",
          borderRadius: "5px",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          zIndex: "10",
          textAlign: "center",
        });

        boostCounter.appendChild(boostDisplay);
      }

      boostDisplay.textContent = `AD: ${averageBoost}%`;
    }
  }

  setupWeaponBorderHandler() {
    const weaponContainers = Array.from(
      document.getElementsByClassName("ui-weapon-switch"),
    );
    weaponContainers.forEach((container) => {
      if (container.id === "ui-weapon-id-4") {
        (container as HTMLElement).style.border = "3px solid #2f4032";
      } else {
        (container as HTMLElement).style.border = "3px solid #FFFFFF";
      }
    });

    const weaponNames = Array.from(
      document.getElementsByClassName("ui-weapon-name"),
    );
    weaponNames.forEach((weaponNameElement) => {
      const weaponContainer = weaponNameElement.closest(".ui-weapon-switch");
      const observer = new MutationObserver(() => {
        const weaponName = weaponNameElement.textContent?.trim()!;
        let border = "#FFFFFF";

        switch (weaponName.toUpperCase()) {
          case "CZ-3A1":
          case "G18C":
          case "M9":
          case "M93R":
          case "MAC-10":
          case "MP5":
          case "P30L":
          case "DUAL P30L":
          case "UMP9":
          case "VECTOR":
          case "VSS":
          case "FLAMETHROWER":
            border = "#FFAE00";
            break;

          case "AK-47":
          case "OT-38":
          case "OTS-38":
          case "M39 EMR":
          case "DP-28":
          case "MOSIN-NAGANT":
          case "SCAR-H":
          case "SV-98":
          case "M1 GARAND":
          case "PKP PECHENEG":
          case "AN-94":
          case "BAR M1918":
          case "BLR 81":
          case "SVD-63":
          case "M134":
          case "WATER GUN":
          case "GROZA":
          case "GROZA-S":
            border = "#007FFF";
            break;

          case "FAMAS":
          case "M416":
          case "M249":
          case "QBB-97":
          case "MK 12 SPR":
          case "M4A1-S":
          case "SCOUT ELITE":
          case "L86A2":
            border = "#0f690d";
            break;

          case "M870":
          case "MP220":
          case "SAIGA-12":
          case "SPAS-12":
          case "USAS-12":
          case "SUPER 90":
          case "LASR GUN":
          case "M1100":
            border = "#FF0000";
            break;

          case "DEAGLE 50":
          case "RAINBOW BLASTER":
            border = "#000000";
            break;

          case "AWM-S":
          case "MK 20 SSR":
            border = "#808000";
            break;

          case "FLARE GUN":
            border = "#FF4500";
            break;

          case "MODEL 94":
          case "PEACEMAKER":
          case "VECTOR (.45 ACP)":
          case "M1911":
          case "M1A1":
            border = "#800080";
            break;

          case "M79":
            border = "#008080";
            break;

          case "POTATO CANNON":
          case "SPUD GUN":
            border = "#A52A2A";
            break;

          case "HEART CANNON":
            border = "#FFC0CB";
            break;

          default:
            border = "#FFFFFF";
            break;
        }

        if (weaponContainer && weaponContainer.id !== "ui-weapon-id-4") {
          (weaponContainer as HTMLElement).style.border = `3px solid ${border}`;
        }
      });

      observer.observe(weaponNameElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
  }

  updateUiElements() {
    const currentUrl = window.location.href;

    const isSpecialUrl = /\/#\w+/.test(currentUrl);

    const playerOptions = document.getElementById("player-options");
    const teamMenuContents = document.getElementById("team-menu-contents");
    const startMenuContainer = document.querySelector(
      "#start-menu .play-button-container",
    );

    if (!playerOptions) return;

    if (
      isSpecialUrl &&
      teamMenuContents &&
      playerOptions.parentNode !== teamMenuContents
    ) {
      teamMenuContents.appendChild(playerOptions);
    } else if (
      !isSpecialUrl &&
      startMenuContainer &&
      playerOptions.parentNode !== startMenuContainer
    ) {
      const firstChild = startMenuContainer.firstChild;
      startMenuContainer.insertBefore(playerOptions, firstChild);
    }
    const teamMenu = document.getElementById("team-menu");
    if (teamMenu) {
      teamMenu.style.height = "355px";
    }
    const menuBlocks = document.querySelectorAll(".menu-block");
    menuBlocks.forEach((block) => {
      (block as HTMLElement).style.maxHeight = "355px";
    });
    //scalable?
  }

  updateMenuButtonText() {
    const hideButton = document.getElementById("hideMenuButton")!;
    hideButton.textContent = this.isMenuVisible
      ? "Hide Menu [P]"
      : "Show Menu [P]";
  }

  updateHealthBars() {
    const healthBars = document.querySelectorAll("#ui-health-container");
    healthBars.forEach((container) => {
      const bar = container.querySelector("#ui-health-actual");
      if (bar) {
        const currentHealth = Math.round(parseFloat((bar as HTMLElement).style.width));
        let percentageText = container.querySelector(".health-text");

        // Create or update percentage text
        if (!percentageText) {
          percentageText = document.createElement("span");
          percentageText.classList.add("health-text");
          Object.assign((percentageText as HTMLElement).style, {
            width: "100%",
            textAlign: "center",
            marginTop: "5px",
            color: "#333",
            fontSize: "20px",
            fontWeight: "bold",
            position: "absolute",
            zIndex: "10",
          });
          container.appendChild(percentageText);
        }

        // Check for health change
        if (currentHealth !== this.lastHealthValue) {
          const healthChange = currentHealth - this.lastHealthValue;
          if (healthChange !== 0) {
            this.showHealthChangeAnimation(container as HTMLElement, healthChange);
          }
          this.lastHealthValue = currentHealth;
        }

        if (this.kxsClient.isHealthWarningEnabled) {
          this.kxsClient.healWarning?.update(currentHealth);
        } else {
          this.kxsClient.healWarning?.hide();
        }
        percentageText.textContent = `${currentHealth}%`;

        // Update animations
        this.updateHealthAnimations();
      }
    });
  }

  private showHealthChangeAnimation(container: HTMLElement, change: number) {
    const animation = document.createElement("div");
    const isPositive = change > 0;

    Object.assign(animation.style, {
      position: "absolute",
      color: isPositive ? "#2ecc71" : "#e74c3c",
      fontSize: "24px",
      fontWeight: "bold",
      fontFamily: "Arial, sans-serif",
      textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
      pointerEvents: "none",
      zIndex: "100",
      opacity: "1",
      top: "50%",
      right: "-80px", // Position à droite de la barre de vie
      transform: "translateY(-50%)", // Centre verticalement
      whiteSpace: "nowrap", // Empêche le retour à la ligne
    });

    animation.textContent = `${isPositive ? "+" : ""}${change} HP`;

    container.appendChild(animation);

    this.healthAnimations.push({
      element: animation,
      startTime: performance.now(),
      duration: 1500, // Animation duration in milliseconds
      value: change,
    });
  }

  private updateHealthAnimations() {
    const currentTime = performance.now();

    this.healthAnimations = this.healthAnimations.filter(animation => {
      const elapsed = currentTime - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);

      if (progress < 1) {
        // Update animation position and opacity
        // Maintenant l'animation se déplace horizontalement vers la droite
        const translateX = progress * 20; // Déplacement horizontal
        Object.assign(animation.element.style, {
          transform: `translateY(-50%) translateX(${translateX}px)`,
          opacity: String(1 - progress),
        });
        return true;
      } else {
        // Remove completed animation
        animation.element.remove();
        return false;
      }
    });
  }
}

export { KxsClientHUD };
