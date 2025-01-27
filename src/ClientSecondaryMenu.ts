import { KxsClientSecondaryMenu } from "./ClientSecondaryMenuRework";
import KxsClient from "./KxsClient";

interface MenuOption {
  label: string;
  value: string | boolean | number;
  type: "toggle" | "input";
  onChange?: (value: string | boolean) => void;
}

interface MenuSection {
  title: string;
  options: MenuOption[];
  element?: HTMLDivElement; // Ajout d'une référence à l'élément DOM
}

class KxsLegacyClientSecondaryMenu {
  private isClientMenuVisible: boolean;
  private isDragging: boolean;
  private dragOffset: { x: number; y: number };
  private sections: MenuSection[];
  menu: HTMLDivElement;
  kxsClient: KxsClient;

  private boundShiftListener: (event: KeyboardEvent) => void;
  private boundMouseDownListener: (event: MouseEvent) => void;
  private boundMouseMoveListener: (event: MouseEvent) => void;
  private boundMouseUpListener: (event: MouseEvent) => void;

  constructor(kxsClient: KxsClient) {
    this.kxsClient = kxsClient;
    this.isClientMenuVisible = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.sections = [];
    this.menu = document.createElement("div");

    this.boundShiftListener = this.handleShiftPress.bind(this);
    this.boundMouseDownListener = this.handleMouseDown.bind(this);
    this.boundMouseMoveListener = this.handleMouseMove.bind(this);
    this.boundMouseUpListener = this.handleMouseUp.bind(this);

    this.initMenu();
    this.addShiftListener();
    this.addDragListeners();
  }

  private handleShiftPress(event: KeyboardEvent): void {
    if (event.key === "Shift" && event.location == 2) {
      this.clearMenu();
      this.toggleMenuVisibility();
      this.loadOption();
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.target instanceof HTMLElement && !e.target.matches("input, select, button")) {
      this.isDragging = true;
      const rect = this.menu.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      this.menu.style.cursor = "grabbing";
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    e.preventDefault();

    const newX = e.clientX - this.dragOffset.x;
    const newY = e.clientY - this.dragOffset.y;

    const maxX = window.innerWidth - this.menu.offsetWidth;
    const maxY = window.innerHeight - this.menu.offsetHeight;

    this.menu.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
    this.menu.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.menu.style.cursor = "move";
  }

  private initMenu(): void {
    this.menu.id = "kxsMenuIG";
    this.applyMenuStyles();
    this.createHeader();
    document.body.appendChild(this.menu);
  }

  private loadOption(): void {
    let HUD = this.addSection("HUD");

    this.addOption(HUD, {
      label: "Use Legacy Menu",
      value: this.kxsClient.isLegaySecondaryMenu,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isLegaySecondaryMenu = !this.kxsClient.isLegaySecondaryMenu
        this.kxsClient.updateLocalStorage()
        this.kxsClient.secondaryMenu = new KxsClientSecondaryMenu(this.kxsClient);
        this.destroy();
      },
    });

    this.addOption(HUD, {
      label: "Show Ping",
      value: this.kxsClient.isPingVisible,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isPingVisible = !this.kxsClient.isPingVisible
        this.kxsClient.updatePingVisibility()
        this.kxsClient.updateLocalStorage()
      },
    });

    this.addOption(HUD, {
      label: "Show FPS",
      value: this.kxsClient.isFpsVisible,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isFpsVisible = !this.kxsClient.isFpsVisible
        this.kxsClient.updateFpsVisibility()
        this.kxsClient.updateLocalStorage()
      },
    });

    this.addOption(HUD, {
      label: "Show Kills",
      value: this.kxsClient.isKillsVisible,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isKillsVisible = !this.kxsClient.isKillsVisible
        this.kxsClient.updateKillsVisibility()
        this.kxsClient.updateLocalStorage()
      },
    });

    this.addOption(HUD, {
      label: "Kill Feed Blint Text",
      value: this.kxsClient.isKillFeedBlint,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isKillFeedBlint = !this.kxsClient.isKillFeedBlint
        this.kxsClient.updateLocalStorage()
      },
    });

    let musicSection = this.addSection("Music");

    this.addOption(musicSection, {
      label: "Death sound",
      value: this.kxsClient.isDeathSoundEnabled,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isDeathSoundEnabled = !this.kxsClient.isDeathSoundEnabled
        this.kxsClient.updateLocalStorage()
      },
    });

    this.addOption(musicSection, {
      label: "Win sound",
      value: this.kxsClient.isWinSoundEnabled,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isWinSoundEnabled = !this.kxsClient.isWinSoundEnabled
        this.kxsClient.updateLocalStorage()
      },
    });

    let pluginsSection = this.addSection("Plugins");

    this.addOption(pluginsSection, {
      label: "Webhook URL",
      value: this.kxsClient.discordWebhookUrl || "",
      type: "input",
      onChange: (value) => {
        value = value.toString().trim();
        this.kxsClient.discordWebhookUrl = value as string
        this.kxsClient.discordTracker.setWebhookUrl(value as string)
        this.kxsClient.updateLocalStorage()
      },
    });

    this.addOption(pluginsSection, {
      label: "Heal Warning",
      value: this.kxsClient.isHealthWarningEnabled,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isHealthWarningEnabled = !this.kxsClient.isHealthWarningEnabled
        this.kxsClient.updateLocalStorage()
      },
    });

    this.addOption(pluginsSection, {
      label: "Update Checker",
      value: this.kxsClient.isAutoUpdateEnabled,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isAutoUpdateEnabled = !this.kxsClient.isAutoUpdateEnabled
        this.kxsClient.updateLocalStorage()
      },
    });

    this.addOption(pluginsSection, {
      label: `Uncap FPS`,
      value: this.kxsClient.isFpsUncapped,
      type: "toggle",
      onChange: () => {
        this.kxsClient.isFpsUncapped = !this.kxsClient.isFpsUncapped;
        this.kxsClient.toggleFpsUncap();
        this.kxsClient.updateLocalStorage();
      },
    });

    this.addOption(pluginsSection, {
      label: `Winning Animation`,
      value: this.kxsClient.isWinningAnimationEnabled,
      type: "toggle",
      onChange: () => {
        this.kxsClient.isWinningAnimationEnabled = !this.kxsClient.isWinningAnimationEnabled;
        this.kxsClient.updateLocalStorage();
      },
    });

    this.addOption(pluginsSection, {
      label: `Rich Presence (Account token required)`,
      value: this.kxsClient.discordToken || "",
      type: "input",
      onChange: (value) => {
        value = value.toString().trim();
        this.kxsClient.discordToken = this.kxsClient.parseToken(value as string);
        this.kxsClient.discordRPC.disconnect();
        this.kxsClient.discordRPC.connect();
        this.kxsClient.updateLocalStorage();
      },
    });

    this.addOption(pluginsSection, {
      label: `Kill Leader Tracking`,
      value: this.kxsClient.isKillLeaderTrackerEnabled,
      type: "toggle",
      onChange: (value) => {
        this.kxsClient.isKillLeaderTrackerEnabled = !this.kxsClient.isKillLeaderTrackerEnabled;
        this.kxsClient.updateLocalStorage();
      },
    });
  }

  private clearMenu(): void {
    this.sections.forEach((section) => {
      if (section.element) {
        section.element.remove();
      }
    });
    this.sections = [];
  }

  private applyMenuStyles(): void {
    Object.assign(this.menu.style, {
      backgroundColor: "rgba(30, 30, 30, 0.95)",
      padding: "15px",
      borderRadius: "10px",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.7)",
      zIndex: "10001",
      width: "300px",
      fontFamily: "Arial, sans-serif",
      color: "#fff",
      maxHeight: "500px",
      overflowY: "auto",
      position: "fixed",
      top: "15%",
      left: "10%",
      cursor: "move",
      display: "none",
    });
  }

  private createHeader(): void {
    const title = document.createElement("h2");
    title.textContent = "KxsClient alpha";
    Object.assign(title.style, {
      margin: "0 0 10px",
      textAlign: "center",
      fontSize: "18px",
      color: "#FFAE00",
    });

    const subtitle = document.createElement("p");
    subtitle.textContent = "reset with tab";
    Object.assign(subtitle.style, {
      margin: "0 0 10px",
      textAlign: "center",
      fontSize: "12px",
      color: "#ccc",
    });

    this.menu.appendChild(title);
    this.menu.appendChild(subtitle);
  }

  public addSection(title: string): MenuSection {
    const section: MenuSection = {
      title,
      options: [],
    };

    const sectionElement = document.createElement("div");
    sectionElement.className = "menu-section";

    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = title;
    Object.assign(sectionTitle.style, {
      margin: "15px 0 10px",
      fontSize: "16px",
      color: "#4CAF50",
    });

    sectionElement.appendChild(sectionTitle);
    this.menu.appendChild(sectionElement);

    // Stocker la référence à l'élément DOM
    section.element = sectionElement;
    this.sections.push(section);
    return section;
  }

  public addOption(section: MenuSection, option: MenuOption): void {
    section.options.push(option);

    const optionDiv = document.createElement("div");
    Object.assign(optionDiv.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px",
      padding: "4px",
      borderRadius: "4px",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    });

    const label = document.createElement("span");
    label.textContent = option.label;
    label.style.color = "#fff";

    const valueElement =
      option.type === "toggle"
        ? this.createToggleElement(option)
        : this.createInputElement(option);

    optionDiv.appendChild(label);
    optionDiv.appendChild(valueElement);

    // Utiliser la référence stockée à l'élément de section
    if (section.element) {
      section.element.appendChild(optionDiv);
    }
  }

  private createToggleElement(option: MenuOption): HTMLElement {
    const toggle = document.createElement("div");
    toggle.style.cursor = "pointer";
    toggle.style.color = (option.value as boolean) ? "#4CAF50" : "#ff4444";
    toggle.textContent = String(option.value);

    toggle.addEventListener("click", () => {
      const newValue = !(option.value as boolean);
      option.value = newValue;
      toggle.textContent = String(newValue);
      toggle.style.color = newValue ? "#4CAF50" : "#ff4444";
      option.onChange?.(newValue);
    });

    return toggle;
  }

  private createInputElement(option: MenuOption): HTMLElement {
    const input = document.createElement("input");
    input.type = "text";
    input.value = String(option.value);
    Object.assign(input.style, {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      border: "none",
      borderRadius: "3px",
      color: "#FFAE00",
      padding: "2px 5px",
      width: "60px",
      textAlign: "right",
    });

    input.addEventListener("change", () => {
      option.value = input.value;
      option.onChange?.(input.value);
    });

    return input;
  }

  addShiftListener(): void {
    window.addEventListener("keydown", this.boundShiftListener);
  }

  addDragListeners(): void {
    this.menu.addEventListener("mousedown", this.boundMouseDownListener);
    window.addEventListener("mousemove", this.boundMouseMoveListener);
    window.addEventListener("mouseup", this.boundMouseUpListener);
  }

  toggleMenuVisibility() {
    this.isClientMenuVisible = !this.isClientMenuVisible;
    this.kxsClient.nm.showNotification(this.isClientMenuVisible ? "Opening menu..." : "Closing menu...", "info", 1400);
    this.menu.style.display = this.isClientMenuVisible ? "block" : "none";
  }

  destroy(): void {
    // Remove event listeners
    window.removeEventListener("keydown", this.boundShiftListener);
    this.menu.removeEventListener("mousedown", this.boundMouseDownListener);
    window.removeEventListener("mousemove", this.boundMouseMoveListener);
    window.removeEventListener("mouseup", this.boundMouseUpListener);

    // Remove all section elements and clear sections array
    this.sections.forEach(section => {
      if (section.element) {
        // Remove all option elements within the section
        const optionElements = section.element.querySelectorAll("div");
        optionElements.forEach(element => {
          // Remove event listeners from toggle and input elements
          const interactive = element.querySelector("div, input");
          if (interactive) {
            interactive.replaceWith(interactive.cloneNode(true));
          }
          element.remove();
        });
        section.element.remove();
      }
    });
    this.sections = [];

    // Remove the menu from DOM
    this.menu.remove();

    // Reset instance variables
    this.isClientMenuVisible = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.menu = null as any;

    // Clear references
    this.kxsClient = null as any;
    this.boundShiftListener = null as any;
    this.boundMouseDownListener = null as any;
    this.boundMouseMoveListener = null as any;
    this.boundMouseUpListener = null as any;
  }
}

export { KxsLegacyClientSecondaryMenu, type MenuSection, type MenuOption };
