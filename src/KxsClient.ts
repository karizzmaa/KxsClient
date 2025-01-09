import { HealthWarning } from "./HealthWarning";
import { KillLeaderTracker } from "./KillLeaderTracking";
import { GridSystem } from "./GridSystem";
import { DiscordTracking } from "./DiscordTracking";
import { StatsParser } from "./StatsParser";
import { PlayerStats } from "./types/types";
import { Config } from "./types/configtype";
import { UpdateChecker } from "./UpdateChecker";
import { DiscordWebSocket } from "./DiscordRichPresence";
import { NotificationManager } from "./NotificationManager";
import { KxsClientSecondaryMenu } from "./ClientSecondaryMenuRework";
import { KxsLegacyClientSecondaryMenu } from "./ClientSecondaryMenu";

export default class KxsClient {
  lastFrameTime: DOMHighResTimeStamp;

  // configuration
  isFpsUncapped: boolean;
  isFpsVisible: boolean;
  isPingVisible: boolean;
  isKillsVisible: boolean;
  isDeathSoundEnabled: boolean;
  isWinSoundEnabled: boolean;
  isHealthWarningEnabled: boolean;
  isAutoUpdateEnabled: boolean;
  isWinningAnimationEnabled: boolean;
  isKillLeaderTrackerEnabled: boolean;
  isLegaySecondaryMenu: boolean;

  currentServer: string | null | undefined;
  discordRPC: DiscordWebSocket
  healWarning: HealthWarning | undefined;
  kill_leader: KillLeaderTracker | undefined;
  discordTracker: DiscordTracking;
  updater: UpdateChecker;
  discordWebhookUrl: string | undefined;
  counters: Record<string, HTMLElement>;
  defaultPositions: Record<string, { left: number; top: number }>;
  defaultSizes: Record<string, { width: number; height: number }>;
  config: Config;
  discordToken: string | null;
  secondaryMenu: KxsClientSecondaryMenu | KxsLegacyClientSecondaryMenu;
  nm: NotificationManager;
  private deathObserver: MutationObserver | null = null;

  protected menu: HTMLElement;
  animationFrameCallback:
    | ((callback: FrameRequestCallback) => void)
    | undefined;

  constructor() {
    this.config = require("../config.json");
    this.menu = document.createElement("div");
    this.lastFrameTime = performance.now();
    this.isFpsUncapped = this.getFpsUncappedFromLocalStorage();
    this.isFpsVisible = true;
    this.isPingVisible = true;
    this.isKillsVisible = true;
    this.isDeathSoundEnabled = true;
    this.isWinSoundEnabled = true;
    this.isHealthWarningEnabled = true;
    this.isAutoUpdateEnabled = true;
    this.isWinningAnimationEnabled = true;
    this.isKillLeaderTrackerEnabled = true;
    this.isLegaySecondaryMenu = true;
    this.discordToken = null;
    this.counters = {};

    this.defaultPositions = {
      fps: { left: 20, top: 160 },
      ping: { left: 20, top: 220 },
      kills: { left: 20, top: 280 },
    };
    this.defaultSizes = {
      fps: { width: 100, height: 30 },
      ping: { width: 100, height: 30 },
      kills: { width: 100, height: 30 },
    };


    // Before all, load local storage
    this.loadLocalStorage();
    this.changeSurvevLogo();

    this.nm = NotificationManager.getInstance();
    this.discordRPC = new DiscordWebSocket(this, this.parseToken(this.discordToken));
    this.updater = new UpdateChecker(this);
    this.kill_leader = new KillLeaderTracker(this);
    this.healWarning = new HealthWarning(this);

    this.setAnimationFrameCallback();
    this.loadBackgroundFromLocalStorage();
    this.initDeathDetection();
    this.discordRPC.connect();

    if (this.isLegaySecondaryMenu) {
      this.secondaryMenu = new KxsLegacyClientSecondaryMenu(this);
    } else {
      this.secondaryMenu = new KxsClientSecondaryMenu(this);
    }

    this.discordTracker = new DiscordTracking(this, this.discordWebhookUrl!);
  }

  parseToken(token: string | null): string | null {
    if (token) {
      return token.replace(/^(["'`])(.+)\1$/, '$2');
    }
    return null;
  }

  getPlayerName() {
    let config = localStorage.getItem("surviv_config");
    if (config) {
      let configObject = JSON.parse(config);
      return configObject.playerName;
    }
  }

  private changeSurvevLogo() {
    var startRowHeader = document.querySelector("#start-row-header");

    if (startRowHeader) {
      (startRowHeader as HTMLElement).style.backgroundImage =
        `url("${this.config.base_url}/assets/KysClient.gif")`;
    }
  }

  updateLocalStorage() {
    localStorage.setItem(
      "userSettings",
      JSON.stringify({
        isFpsVisible: this.isFpsVisible,
        isPingVisible: this.isPingVisible,
        isFpsUncapped: this.isFpsUncapped,
        isKillsVisible: this.isKillsVisible,
        discordWebhookUrl: this.discordWebhookUrl,
        isDeathSoundEnabled: this.isDeathSoundEnabled,
        isWinSoundEnabled: this.isWinSoundEnabled,
        isHealthWarningEnabled: this.isHealthWarningEnabled,
        isAutoUpdateEnabled: this.isAutoUpdateEnabled,
        isWinningAnimationEnabled: this.isWinningAnimationEnabled,
        discordToken: this.discordToken,
        isKillLeaderTrackerEnabled: this.isKillLeaderTrackerEnabled,
        isLegaySecondaryMenu: this.isLegaySecondaryMenu
      }),
    );
  };

  private initDeathDetection(): void {
    const config = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    };

    this.deathObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          this.checkForDeathScreen(mutation.addedNodes);
        }
      }
    });

    this.deathObserver.observe(document.body, config);
  }

  private checkForDeathScreen(nodes: NodeList): void {
    let loseArray = [
      "died",
      "eliminated",
      "was"
    ];

    let winArray = [
      "Winner",
      "Victory",
      "dinner",
    ];

    nodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        const deathTitle = node.querySelector(".ui-stats-header-title");
        if (loseArray.some((word) => deathTitle?.textContent?.toLowerCase().includes(word))) {
          this.handlePlayerDeath();
        } else if (winArray.some((word) => deathTitle?.textContent?.toLowerCase().includes(word))) {
          this.handlePlayerWin();
        }
      }
    });
  }

  private async handlePlayerDeath(): Promise<void> {
    try {
      if (this.isDeathSoundEnabled) {
        const audio = new Audio(
          this.config.base_url + "/assets/dead.m4a",
        );
        audio.volume = 0.3;
        audio.play().catch((err) => false);
      }
    } catch (error) {
      console.error("Reading error:", error);
    }

    const stats = this.getPlayerStats(false);

    await this.discordTracker.trackGameEnd({
      username: stats.username,
      kills: stats.kills,
      damageDealt: stats.damageDealt,
      damageTaken: stats.damageTaken,
      duration: stats.duration,
      position: stats.position,
      isWin: false,
    });
  }

  private async handlePlayerWin(): Promise<void> {
    if (this.isWinningAnimationEnabled) {
      this.felicitation();
    }

    const stats = this.getPlayerStats(true);

    await this.discordTracker.trackGameEnd({
      username: stats.username,
      kills: stats.kills,
      damageDealt: stats.damageDealt,
      damageTaken: stats.damageTaken,
      duration: stats.duration,
      position: stats.position,
      isWin: true,
      stuff: {
        main_weapon: document.querySelector('#ui-weapon-id-1 .ui-weapon-name')?.textContent,
        secondary_weapon: document.querySelector('#ui-weapon-id-2 .ui-weapon-name')?.textContent,
        soda: document.querySelector("#ui-loot-soda .ui-loot-count")?.textContent,
        melees: document.querySelector('#ui-weapon-id-3 .ui-weapon-name')?.textContent,
        grenades: document.querySelector(`#ui-weapon-id-4 .ui-weapon-name`)?.textContent,
        medkit: document.querySelector("#ui-loot-healthkit .ui-loot-count")?.textContent,
        bandage: document.querySelector("#ui-loot-bandage .ui-loot-count")?.textContent,
        pills: document.querySelector("#ui-loot-painkiller .ui-loot-count")?.textContent,
        backpack: document.querySelector("#ui-armor-backpack .ui-armor-level")?.textContent,
        chest: document.querySelector("#ui-armor-chest .ui-armor-level")?.textContent,
        helmet: document.querySelector("#ui-armor-helmet .ui-armor-level")?.textContent,
      }
    });
  }

  felicitation() {
    const goldText = document.createElement("div");
    goldText.textContent = "#1";
    goldText.style.position = "fixed";
    goldText.style.top = "50%";
    goldText.style.left = "50%";
    goldText.style.transform = "translate(-50%, -50%)";
    goldText.style.fontSize = "80px";
    goldText.style.color = "gold";
    goldText.style.textShadow = "2px 2px 4px rgba(0,0,0,0.3)";
    goldText.style.zIndex = "10000";
    document.body.appendChild(goldText);

    function createConfetti() {
      const colors = [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#ff00ff",
        "#00ffff",
        "gold",
      ];
      const confetti = document.createElement("div");

      confetti.style.position = "fixed";
      confetti.style.width = Math.random() * 10 + 5 + "px";
      confetti.style.height = Math.random() * 10 + 5 + "px";
      confetti.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      confetti.style.borderRadius = "50%";
      confetti.style.zIndex = "9999";

      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.top = "-20px";

      document.body.appendChild(confetti);

      let posY = -20;
      let posX = parseFloat(confetti.style.left);
      let rotation = 0;
      let speedY = Math.random() * 2 + 1;
      let speedX = Math.random() * 2 - 1;

      function fall() {
        posY += speedY;
        posX += speedX;
        rotation += 5;

        confetti.style.top = posY + "px";
        confetti.style.left = posX + "vw";
        confetti.style.transform = `rotate(${rotation}deg)`;

        if (posY < window.innerHeight) {
          requestAnimationFrame(fall);
        } else {
          confetti.remove();
        }
      }

      fall();
    }

    const confettiInterval = setInterval(() => {
      for (let i = 0; i < 5; i++) {
        createConfetti();
      }
    }, 100);

    if (this.isWinSoundEnabled) {
      const audio = new Audio(
        this.config.base_url + "/assets/win.m4a",
      );
      audio.play().catch((err) => console.error("Erreur lecture:", err));
    }

    setTimeout(() => {
      clearInterval(confettiInterval);
      goldText.style.transition = "opacity 1s";
      goldText.style.opacity = "0";
      setTimeout(() => goldText.remove(), 1000);
    }, 5000);
  }

  public cleanup(): void {
    if (this.deathObserver) {
      this.deathObserver.disconnect();
      this.deathObserver = null;
    }
  }

  private getUsername(): string {
    const configKey = "surviv_config";
    const savedConfig = localStorage.getItem(configKey)!;

    const config = JSON.parse(savedConfig);

    if (config.playerName) {
      return config.playerName;
    } else {
      return "Player";
    }
  }

  private getPlayerStats(win: boolean): PlayerStats {
    const statsInfo = win
      ? document.querySelector(".ui-stats-info-player")
      : document.querySelector(".ui-stats-info-player.ui-stats-info-status");
    const rank = document.querySelector(".ui-stats-header-value");

    if (!statsInfo?.textContent || !rank?.textContent) {
      return {
        username: this.getUsername(),
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        duration: "0s",
        position: "#unknown",
      };
    }

    const parsedStats = StatsParser.parse(
      statsInfo.textContent,
      rank?.textContent,
    );
    parsedStats.username = this.getUsername();

    return parsedStats;
  }

  setAnimationFrameCallback() {
    this.animationFrameCallback = this.isFpsUncapped
      ? (callback) => setTimeout(callback, 1)
      : window.requestAnimationFrame.bind(window);
  }

  makeResizable(element: HTMLDivElement, storageKey: string) {
    let isResizing = false;
    let startX: number, startY: number, startWidth: number, startHeight: number;

    // Ajouter une zone de redimensionnement en bas à droite
    const resizer = document.createElement("div");
    Object.assign(resizer.style, {
      width: "10px",
      height: "10px",
      backgroundColor: "white",
      position: "absolute",
      right: "0",
      bottom: "0",
      cursor: "nwse-resize",
      zIndex: "10001",
    });
    element.appendChild(resizer);

    resizer.addEventListener("mousedown", (event) => {
      isResizing = true;
      startX = event.clientX;
      startY = event.clientY;
      startWidth = element.offsetWidth;
      startHeight = element.offsetHeight;
      event.stopPropagation(); // Empêche l'activation du déplacement
    });

    window.addEventListener("mousemove", (event) => {
      if (isResizing) {
        const newWidth = startWidth + (event.clientX - startX);
        const newHeight = startHeight + (event.clientY - startY);

        element.style.width = `${newWidth}px`;
        element.style.height = `${newHeight}px`;

        // Sauvegarde de la taille
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            width: newWidth,
            height: newHeight,
          }),
        );
      }
    });

    window.addEventListener("mouseup", () => {
      isResizing = false;
    });

    const savedSize = localStorage.getItem(storageKey);
    if (savedSize) {
      const { width, height } = JSON.parse(savedSize);
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
    } else {
      element.style.width = "150px"; // Taille par défaut
      element.style.height = "50px";
    }
  }

  makeDraggable(element: HTMLElement, storageKey: string) {
    const gridSystem = new GridSystem();
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    element.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        // Left click only
        isDragging = true;
        dragOffset = {
          x: event.clientX - element.offsetLeft,
          y: event.clientY - element.offsetTop,
        };
        element.style.cursor = "grabbing";
      }
    });

    window.addEventListener("mousemove", (event) => {
      if (isDragging) {
        const rawX = event.clientX - dragOffset.x;
        const rawY = event.clientY - dragOffset.y;

        // Get snapped coordinates from grid system
        const snapped = gridSystem.snapToGrid(element, rawX, rawY);

        // Prevent moving off screen
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;

        element.style.left = `${Math.max(0, Math.min(snapped.x, maxX))}px`;
        element.style.top = `${Math.max(0, Math.min(snapped.y, maxY))}px`;

        // Highlight nearest grid lines while dragging
        gridSystem.highlightNearestGridLine(rawX, rawY);

        // Save position
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            x: parseInt(element.style.left),
            y: parseInt(element.style.top),
          }),
        );
      }
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = "move";
      }
    });

    // Load saved position
    const savedPosition = localStorage.getItem(storageKey);
    if (savedPosition) {
      const { x, y } = JSON.parse(savedPosition);
      const snapped = gridSystem.snapToGrid(element, x, y);
      element.style.left = `${snapped.x}px`;
      element.style.top = `${snapped.y}px`;
    }
  }

  getKills() {
    const killElement = document.querySelector(
      ".ui-player-kills.js-ui-player-kills",
    );
    if (killElement) {
      const kills = parseInt(killElement.textContent || "", 10);
      return isNaN(kills) ? 0 : kills;
    }
    return 0;
  }

  getRegionFromLocalStorage() {
    let config = localStorage.getItem("surviv_config");
    if (config) {
      let configObject = JSON.parse(config);
      return configObject.region;
    }
    return null;
  }

  getFpsUncappedFromLocalStorage() {
    const savedConfig = localStorage.getItem("userSettings");
    if (savedConfig) {
      const configObject = JSON.parse(savedConfig);
      return configObject.isFpsUncapped || false;
    }
    return false;
  }

  saveFpsUncappedToLocalStorage() {
    let config = JSON.parse(localStorage.getItem("userSettings")!) || {};
    config.isFpsUncapped = this.isFpsUncapped;
    localStorage.setItem("userSettings", JSON.stringify(config));
  }

  saveBackgroundToLocalStorage(image: string | File) {
    if (typeof image === "string") {
      localStorage.setItem("lastBackgroundUrl", image);
    }

    if (typeof image === "string") {
      localStorage.setItem("lastBackgroundType", "url");
      localStorage.setItem("lastBackgroundValue", image);
    } else {
      localStorage.setItem("lastBackgroundType", "local");
      const reader = new FileReader();
      reader.onload = () => {
        localStorage.setItem("lastBackgroundValue", reader.result as string);
      };
      reader.readAsDataURL(image);
    }
  }

  loadBackgroundFromLocalStorage() {
    const backgroundType = localStorage.getItem("lastBackgroundType");
    const backgroundValue = localStorage.getItem("lastBackgroundValue");

    const backgroundElement = document.getElementById("background");
    if (backgroundElement && backgroundType && backgroundValue) {
      if (backgroundType === "url") {
        backgroundElement.style.backgroundImage = `url(${backgroundValue})`;
      } else if (backgroundType === "local") {
        backgroundElement.style.backgroundImage = `url(${backgroundValue})`;
      }
    }
  }

  loadLocalStorage() {
    const savedSettings = localStorage.getItem("userSettings")
      ? JSON.parse(localStorage.getItem("userSettings")!)
      : null;
    if (savedSettings) {
      this.isFpsVisible = savedSettings.isFpsVisible ?? this.isFpsVisible;
      this.isPingVisible = savedSettings.isPingVisible ?? this.isPingVisible;
      this.isFpsUncapped = savedSettings.isFpsUncapped ?? this.isFpsUncapped;
      this.isKillsVisible = savedSettings.isKillsVisible ?? this.isKillsVisible;
      this.discordWebhookUrl = savedSettings.discordWebhookUrl ?? this.discordWebhookUrl;
      this.isHealthWarningEnabled = savedSettings.isHealthWarningEnabled ?? this.isHealthWarningEnabled;
      this.isAutoUpdateEnabled = savedSettings.isAutoUpdateEnabled ?? this.isAutoUpdateEnabled;
      this.isWinningAnimationEnabled = savedSettings.isWinningAnimationEnabled ?? this.isWinningAnimationEnabled;
      this.discordToken = savedSettings.discordToken ?? this.discordToken;
      this.isKillLeaderTrackerEnabled = savedSettings.isKillLeaderTrackerEnabled ?? this.isKillLeaderTrackerEnabled;
      this.isLegaySecondaryMenu = savedSettings.isLegaySecondaryMenu ?? this.isLegaySecondaryMenu
    }

    this.updateKillsVisibility();
    this.updateFpsVisibility();
    this.updatePingVisibility();
  }

  updateFpsVisibility() {
    if (this.counters.fps) {
      this.counters.fps.style.display = this.isFpsVisible ? "block" : "none";
      this.counters.fps.style.backgroundColor = this.isFpsVisible
        ? "rgba(0, 0, 0, 0.2)"
        : "transparent";
    }
  }

  updatePingVisibility() {
    if (this.counters.ping) {
      this.counters.ping.style.display = this.isPingVisible ? "block" : "none";
    }
  }

  updateKillsVisibility() {
    if (this.counters.kills) {
      this.counters.kills.style.display = this.isKillsVisible
        ? "block"
        : "none";
      this.counters.kills.style.backgroundColor = this.isKillsVisible
        ? "rgba(0, 0, 0, 0.2)"
        : "transparent";
    }
  }

  toggleFpsUncap() {
    this.isFpsUncapped = !this.isFpsUncapped;
    this.setAnimationFrameCallback();
    this.saveFpsUncappedToLocalStorage();
  }
}
