import { MenuManager } from "./ButtonManager";
import { WebhookValidator } from "./DiscordTracking";
import KxsClient from "./KxsClient";

class KxsMainClientMenu {
  menuManager: MenuManager | undefined;
  menu: HTMLDivElement;
  kxsClient: KxsClient;

  constructor(kxsClient: KxsClient) {
    this.kxsClient = kxsClient;
    this.menu = document.createElement("div");
    this.setupKeyListeners();
    this.initMenu();
  }

  initMenu() {
    this.menu.id = "kxsMenu";
    Object.assign(this.menu.style, {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: "15px",
      marginLeft: "15px",
      borderRadius: "10px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.6)",
      zIndex: "10001",
      width: "250px",
      fontFamily: "Arial, sans-serif",
      color: "#fff",
      maxHeight: "400px",
      overflowY: "auto",
    });

    const title = document.createElement("h2");
    title.textContent = "Kxs Client";
    title.style.margin = "0 0 10px";
    title.style.textAlign = "center";
    title.style.fontSize = "18px";
    title.style.color = "#FFAE00";
    this.menu.appendChild(title);

    window.onload = () => {
      const savedBackground = localStorage.getItem("backgroundImage");
      if (savedBackground) {
        const backgroundElement = document.getElementById("background");
        if (backgroundElement) {
          backgroundElement.style.backgroundImage = `url(${savedBackground})`;
        }
      }
    };

    const startRowTop = document.getElementById("start-row-top");
    if (startRowTop) {
      startRowTop.appendChild(this.menu);
    }

    this.menuManager = new MenuManager(this.menu);

    this.menuManager.addToggleButton({
      id: "fps",
      text: "Show FPS",
      initialState: this.kxsClient.isFpsVisible,
      onClick: () => {
        this.kxsClient.isFpsVisible = !this.kxsClient.isFpsVisible;
        this.kxsClient.updateFpsVisibility();
        this.kxsClient.updateLocalStorage();
      },
    });

    this.menuManager.addToggleButton({
      id: "ping",
      text: `Show Ping`,
      initialState: this.kxsClient.isPingVisible,
      onClick: () => {
        this.kxsClient.isPingVisible = !this.kxsClient.isPingVisible;
        this.kxsClient.updatePingVisibility();
        this.kxsClient.updateLocalStorage();
      },
    });

    this.menuManager.addToggleButton({
      id: "kills",
      text: `Show Kills`,
      initialState: this.kxsClient.isKillsVisible,
      onClick: () => {
        this.kxsClient.isKillsVisible = !this.kxsClient.isKillsVisible;
        this.kxsClient.updateKillsVisibility();
        this.kxsClient.updateLocalStorage();
      },
    });

    this.menuManager.addToggleButton({
      id: "uncapFps",
      text: `Uncap FPS`,
      initialState: this.kxsClient.isFpsUncapped,
      onClick: () => {
        this.kxsClient.updateLocalStorage();
        this.kxsClient.toggleFpsUncap();
      },
    });

    this.menuManager.addButton({
      id: "hideShow",
      text: "👀 Hide/Show Menu [P]",
      color: "#6F42C1",
      onClick: () => this.toggleMenuVisibility(),
    });

    this.menuManager.addButton({
      id: "background",
      text: `🎨 Change Background`,
      color: "#007BFF",
      onClick: () => {
        const backgroundElement = document.getElementById("background");
        if (!backgroundElement) {
          alert("Element with id 'background' not found.");
          return;
        }
        const choice = prompt(
          "Enter '1' to provide a URL or '2' to upload a local image:",
        );

        if (choice === "1") {
          const newBackgroundUrl = prompt(
            "Enter the URL of the new background image:",
          );
          if (newBackgroundUrl) {
            backgroundElement.style.backgroundImage = `url(${newBackgroundUrl})`;
            this.kxsClient.saveBackgroundToLocalStorage(newBackgroundUrl);
            alert("Background updated successfully!");
          }
        } else if (choice === "2") {
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = "image/*";
          fileInput.onchange = (event) => {
            const file = (event.target as HTMLInputElement)?.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                backgroundElement.style.backgroundImage = `url(${reader.result})`;
                this.kxsClient.saveBackgroundToLocalStorage(file);
                alert("Background updated successfully!");
              };
              reader.readAsDataURL(file);
            }
          };
          fileInput.click();
        }
      },
    });

    this.menuManager.addButton({
      id: "webhook",
      text: `🕸️ Change Discord Webhook`,
      color: "#007BFF",
      onClick: async () => {
        const choice = prompt("enter the new discord webhook url:");

        if (choice) {
          const result = await WebhookValidator.testWebhook(choice);

          if (result.isValid) {
            this.kxsClient.discordWebhookUrl = choice;
            this.kxsClient.discordTracker.setWebhookUrl(choice);
            this.kxsClient.updateLocalStorage();
            alert(result.message);
          } else {
            alert(result.message);
          }
        }
      },
    });
  }

  setupKeyListeners() {
    document.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "p") {
        this.toggleMenuVisibility();
      }
    });
  }

  protected toggleMenuVisibility() {
    const isVisible = this.menu?.style.display !== "none";
    this.menu!.style.display = isVisible ? "none" : "block";
  }
}

export { KxsMainClientMenu };
