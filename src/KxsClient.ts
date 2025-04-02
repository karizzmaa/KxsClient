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
	isKillFeedBlint: boolean;
	isSpotifyPlayerEnabled: boolean;
	isMainMenuCleaned: boolean;
	all_friends: string;

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
		this.isLegaySecondaryMenu = false;
		this.isKillFeedBlint = false;
		this.isSpotifyPlayerEnabled = false;
		this.discordToken = null;
		this.counters = {};
		this.all_friends = '';
		this.isMainMenuCleaned = false;

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

		if (this.isSpotifyPlayerEnabled) {
			this.createSimpleSpotifyPlayer();
		}

		this.MainMenuCleaning();
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
				isLegaySecondaryMenu: this.isLegaySecondaryMenu,
				isKillFeedBlint: this.isKillFeedBlint,
				all_friends: this.all_friends,
				isSpotifyPlayerEnabled: this.isSpotifyPlayerEnabled,
				isMainMenuCleaned: this.isMainMenuCleaned
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
				gridSystem.toggleGrid(); // Afficher la grille quand on commence à déplacer
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
				gridSystem.toggleGrid(); // Masquer la grille quand on arrête de déplacer
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
			this.isKillFeedBlint = savedSettings.isKillFeedBlint ?? this.isKillFeedBlint;
			this.all_friends = savedSettings.all_friends ?? this.all_friends;
			this.isSpotifyPlayerEnabled = savedSettings.isSpotifyPlayerEnabled ?? this.isSpotifyPlayerEnabled;
			this.isMainMenuCleaned = savedSettings.isMainMenuCleaned ?? this.isMainMenuCleaned;
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

	createSimpleSpotifyPlayer() {
		// Main container
		const container = document.createElement('div');
		container.id = 'spotify-player-container';
		Object.assign(container.style, {
			position: 'fixed',
			bottom: '20px',
			right: '20px',
			width: '320px',
			backgroundColor: '#121212',
			borderRadius: '12px',
			boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
			overflow: 'hidden',
			zIndex: '10000',
			fontFamily: 'Montserrat, Arial, sans-serif',
			transition: 'transform 0.3s ease, opacity 0.3s ease',
			transform: 'translateY(0)',
			opacity: '1'
		});

		// Player header
		const header = document.createElement('div');
		Object.assign(header.style, {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '12px 16px',
			backgroundColor: '#070707',
			color: 'white',
			borderBottom: '1px solid #282828',
			position: 'relative' // For absolute positioning of the button
		});

		// Spotify logo
		const logo = document.createElement('div');
		logo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;

		const title = document.createElement('span');
		title.textContent = 'Spotify Player';
		title.style.marginLeft = '8px';
		title.style.fontWeight = 'bold';

		const logoContainer = document.createElement('div');
		logoContainer.style.display = 'flex';
		logoContainer.style.alignItems = 'center';
		logoContainer.appendChild(logo);
		logoContainer.appendChild(title);

		// Control buttons
		const controls = document.createElement('div');
		controls.style.display = 'flex';
		controls.style.alignItems = 'center';

		// Minimize button
		const minimizeBtn = document.createElement('button');
		Object.assign(minimizeBtn.style, {
			background: 'none',
			border: 'none',
			color: '#aaa',
			cursor: 'pointer',
			fontSize: '18px',
			padding: '0',
			marginLeft: '10px',
			width: '24px',
			height: '24px',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center'
		});
		minimizeBtn.innerHTML = '−';
		minimizeBtn.title = 'Minimize';

		// Close button
		const closeBtn = document.createElement('button');
		Object.assign(closeBtn.style, {
			background: 'none',
			border: 'none',
			color: '#aaa',
			cursor: 'pointer',
			fontSize: '18px',
			padding: '0',
			marginLeft: '10px',
			width: '24px',
			height: '24px',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center'
		});
		closeBtn.innerHTML = '×';
		closeBtn.title = 'Close';

		controls.appendChild(minimizeBtn);
		controls.appendChild(closeBtn);

		header.appendChild(logoContainer);
		header.appendChild(controls);

		// Album cover image
		const albumArt = document.createElement('div');
		Object.assign(albumArt.style, {
			width: '50px',
			height: '50px',
			backgroundColor: '#333',
			backgroundSize: 'cover',
			backgroundPosition: 'center',
			borderRadius: '4px',
			flexShrink: '0'
		});
		albumArt.style.backgroundImage = `url('https://i.scdn.co/image/ab67616d00001e02fe24b9ffeb3c3fdb4f9abbe9')`;

		// Track information
		const trackInfo = document.createElement('div');
		Object.assign(trackInfo.style, {
			flex: '1',
			overflow: 'hidden'
		});
		// Player content
		const content = document.createElement('div');
		content.style.padding = '0';

		// Spotify iframe
		const iframe = document.createElement('iframe');
		iframe.id = 'spotify-player-iframe';
		iframe.src = 'https://open.spotify.com/embed/playlist/37i9dQZEVXcJZyENOWUFo7';
		iframe.width = '100%';
		iframe.height = '80px';
		iframe.frameBorder = '0';
		iframe.allow = 'encrypted-media';
		iframe.style.border = 'none';

		content.appendChild(iframe);

		// Playlist change button integrated in the header
		const changePlaylistContainer = document.createElement('div');
		Object.assign(changePlaylistContainer.style, {
			display: 'flex',
			alignItems: 'center',
			marginRight: '10px'
		});

		// Square button to enter a playlist ID
		const changePlaylistBtn = document.createElement('button');
		Object.assign(changePlaylistBtn.style, {
			width: '24px',
			height: '24px',
			backgroundColor: '#1DB954',
			color: 'white',
			border: 'none',
			borderRadius: '4px',
			fontSize: '14px',
			fontWeight: 'bold',
			cursor: 'pointer',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			margin: '0 8px 0 0'
		});
		changePlaylistBtn.innerHTML = `
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		`;

		changePlaylistBtn.addEventListener('click', () => {
			const id = prompt('Enter the Spotify playlist ID:', '37i9dQZEVXcJZyENOWUFo7');
			if (id) {
				iframe.src = `https://open.spotify.com/embed/playlist/${id}`;
				localStorage.setItem('kxsSpotifyPlaylist', id);


				// Simulate an album cover based on the playlist ID
				albumArt.style.backgroundImage = `url('https://i.scdn.co/image/ab67706f00000002${id.substring(0, 16)}')`;
			}
		});

		changePlaylistContainer.appendChild(changePlaylistBtn);

		// Load saved playlist
		const savedPlaylist = localStorage.getItem('kxsSpotifyPlaylist');
		if (savedPlaylist) {
			iframe.src = `https://open.spotify.com/embed/playlist/${savedPlaylist}`;

			// Simuler une pochette d'album basée sur l'ID de la playlist
			albumArt.style.backgroundImage = `url('https://i.scdn.co/image/ab67706f00000002${savedPlaylist.substring(0, 16)}')`;
		}

		// Integrate the playlist change button into the controls
		controls.insertBefore(changePlaylistContainer, minimizeBtn);

		// Assemble the elements
		container.appendChild(header);
		container.appendChild(content);

		// Add a title to the button for accessibility
		changePlaylistBtn.title = "Change playlist";

		// Add to document
		document.body.appendChild(container);

		// Player states
		let isMinimized = false;

		// Events
		minimizeBtn.addEventListener('click', () => {
			if (isMinimized) {
				content.style.display = 'block';
				changePlaylistContainer.style.display = 'block';
				container.style.transform = 'translateY(0)';
				minimizeBtn.innerHTML = '−';
			} else {
				content.style.display = 'none';
				changePlaylistContainer.style.display = 'none';
				container.style.transform = 'translateY(0)';
				minimizeBtn.innerHTML = '+';
			}
			isMinimized = !isMinimized;
		});

		closeBtn.addEventListener('click', () => {
			container.style.transform = 'translateY(150%)';
			container.style.opacity = '0';
			setTimeout(() => {
				container.style.display = 'none';
				showButton.style.display = 'flex';
				showButton.style.alignItems = 'center';
				showButton.style.justifyContent = 'center';
			}, 300);
		});

		// Make the player draggable
		let isDragging = false;
		let offsetX: number = 0;
		let offsetY: number = 0;

		header.addEventListener('mousedown', (e) => {
			isDragging = true;
			offsetX = e.clientX - container.getBoundingClientRect().left;
			offsetY = e.clientY - container.getBoundingClientRect().top;
			container.style.transition = 'none';
		});

		document.addEventListener('mousemove', (e) => {
			if (isDragging) {
				container.style.right = 'auto';
				container.style.bottom = 'auto';
				container.style.left = (e.clientX - offsetX) + 'px';
				container.style.top = (e.clientY - offsetY) + 'px';
			}
		});

		document.addEventListener('mouseup', () => {
			isDragging = false;
			container.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
		});

		// Button to show the player again
		const showButton = document.createElement('button');
		showButton.id = 'spotify-float-button';
		Object.assign(showButton.style, {
			position: 'fixed',
			bottom: '20px',
			right: '20px',
			width: '50px',
			height: '50px',
			borderRadius: '50%',
			backgroundColor: '#1DB954',
			color: 'white',
			border: 'none',
			boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
			cursor: 'pointer',
			zIndex: '9999',
			fontSize: '24px',
			transition: 'transform 0.2s ease',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center'
		});
		showButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="white" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;

		document.body.appendChild(showButton);

		showButton.addEventListener('mouseenter', () => {
			showButton.style.transform = 'scale(1.1)';
		});

		showButton.addEventListener('mouseleave', () => {
			showButton.style.transform = 'scale(1)';
		});

		showButton.addEventListener('click', () => {
			container.style.display = 'block';
			container.style.transform = 'translateY(0)';
			container.style.opacity = '1';
			showButton.style.display = 'none';
		});

		return container;
	}

	toggleSpotifyMenu() {
		if (this.isSpotifyPlayerEnabled) {
			this.createSimpleSpotifyPlayer();
		} else {
			this.removeSimpleSpotifyPlayer();
		}
	}

	private adBlockObserver: MutationObserver | null = null;

	MainMenuCleaning() {
		// Déconnecter l'observateur précédent s'il existe
		if (this.adBlockObserver) {
			this.adBlockObserver.disconnect();
			this.adBlockObserver = null;
		}

		// Sélectionne les éléments à masquer/afficher
		const newsWrapper = document.getElementById('news-wrapper');
		const adBlockLeft = document.getElementById('ad-block-left');
		const socialLeft = document.getElementById('social-share-block-wrapper');
		const leftCollun = document.getElementById('left-column');

		const elementsToMonitor = [
			{ element: newsWrapper, id: 'news-wrapper' },
			{ element: adBlockLeft, id: 'ad-block-left' },
			{ element: socialLeft, id: 'social-share-block-wrapper' },
			{ element: leftCollun, id: 'left-column' }
		];

		if (this.isMainMenuCleaned) {
			// Mode clean: masquer les éléments
			elementsToMonitor.forEach(item => {
				if (item.element) item.element.style.display = 'none';
			});

			// Créer un observateur pour empêcher que le site ne réaffiche les éléments
			this.adBlockObserver = new MutationObserver((mutations) => {
				let needsUpdate = false;

				mutations.forEach(mutation => {
					if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
						const target = mutation.target as HTMLElement;

						// Vérifier si l'élément est un de ceux que nous surveillons
						if (elementsToMonitor.some(item => item.id === target.id && target.style.display !== 'none')) {
							target.style.display = 'none';
							needsUpdate = true;
						}
					}
				});

				// Si le site essaie de réafficher un élément publicitaire, on l'empêche
				if (needsUpdate) {
					console.log('[KxsClient] Détection de tentative de réaffichage de publicités - Masquage forcé');
				}
			});

			// Observer les changements de style sur les éléments
			elementsToMonitor.forEach(item => {
				if (item.element && this.adBlockObserver) {
					this.adBlockObserver.observe(item.element, {
						attributes: true,
						attributeFilter: ['style']
					});
				}
			});

			// Vérifier également le document body pour de nouveaux éléments ajoutés
			const bodyObserver = new MutationObserver(() => {
				// Réappliquer notre nettoyage après un court délai
				setTimeout(() => {
					if (this.isMainMenuCleaned) {
						elementsToMonitor.forEach(item => {
							const element = document.getElementById(item.id);
							if (element && element.style.display !== 'none') {
								element.style.display = 'none';
							}
						});
					}
				}, 100);
			});

			// Observer les changements dans le DOM
			bodyObserver.observe(document.body, { childList: true, subtree: true });

		} else {
			// Mode normal: rétablir l'affichage
			elementsToMonitor.forEach(item => {
				if (item.element) item.element.style.display = 'block';
			});
		}
	}

	removeSimpleSpotifyPlayer() {
		// Supprimer le conteneur principal du lecteur
		const container = document.getElementById('spotify-player-container');
		if (container) {
			container.remove();
		}

		// Supprimer aussi le bouton flottant grâce à son ID
		const floatButton = document.getElementById('spotify-float-button');
		if (floatButton) {
			floatButton.remove();
		}
	}

}
