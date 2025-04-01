class PingTest {
	private ptcDataBuf: ArrayBuffer;
	test: {
		region: string;
		url: string;
		ping: number;
		ws: WebSocket | null;
		sendTime: number;
		retryCount: number;
		isConnecting: boolean;
		isWebSocket: boolean;
	};

	constructor(selectedServer: { region: string; url: string }) {
		this.ptcDataBuf = new ArrayBuffer(1);
		this.test = {
			region: selectedServer.region,
			url: selectedServer.url.startsWith("ws://") || selectedServer.url.startsWith("wss://")
				? selectedServer.url
				: `https://${selectedServer.url}/ping`, // If not WebSocket, assume HTTP
			ping: 0, // Initialize to 0 instead of 9999
			ws: null,
			sendTime: 0,
			retryCount: 0,
			isConnecting: false,
			isWebSocket: selectedServer.url.startsWith("ws://") || selectedServer.url.startsWith("wss://"),
		};
	}
//check to see if urls match
	private getMatchingGameUrl() {
		const gameUrls = [
			"*://survev.io/*",
			"*://66.179.254.36/*",
			"*://zurviv.io/*",
			"*://expandedwater.online/*",
			"*://localhost:3000/*",
			"*://surviv.wf/*",
			"*://resurviv.biz/*",
			"*://82.67.125.203/*",
			"*://leia-uwu.github.io/survev/*",
			"*://50v50.online/*",
			"*://eu-comp.net/*",
			"*://survev.leia-is.gay/*"
		];
		
		const currentDomain = window.location.hostname;
		for (let i = 0; i < gameUrls.length; i++) {
			const url = new URL(gameUrls[i].replace('*://', 'http://')); 
			if (currentDomain === url.hostname) {
				return gameUrls[i]; 
			}
		}
		console.warn("No matching game URL found for the current domain");
		return null;
	}

	startPingTest() {
		if (this.test.isConnecting) return; 
		this.test.isConnecting = true;
		const matchingUrl = this.getMatchingGameUrl();
		if (matchingUrl) {
			this.test.url = matchingUrl; 
		} else {
			console.error("No valid URL for ping test found.");
			this.handleConnectionError();
			return;
		}

		if (this.test.isWebSocket) {
			try {
				const ws = new WebSocket(this.test.url);
				ws.binaryType = "arraybuffer";

				ws.onopen = () => {
					this.test.ws = ws;
					this.test.isConnecting = false;
					this.test.retryCount = 0;
					this.sendPing();
				};

				ws.onmessage = (event) => {
					if (this.test.sendTime === 0) return;

					const elapsed = Date.now() - this.test.sendTime;
					this.test.ping = Math.min(Math.round(elapsed), 999);
					setTimeout(() => this.sendPing(), 250);
				};

				ws.onerror = (error) => {
					console.error("WebSocket error:", error);
					this.handleConnectionError();
				};

				ws.onclose = () => {
					this.test.ws = null;
					this.test.isConnecting = false;
					if (this.test.retryCount < 3) {
						setTimeout(() => this.startPingTest(), 1000);
					}
				};
			} catch (error) {
				console.error("Failed to create WebSocket:", error);
				this.handleConnectionError();
			}
		} else {
			this.sendHttpPing();
		}
	}

	private sendHttpPing() {
		this.test.sendTime = Date.now();

		fetch(this.test.url, { method: "HEAD", cache: "no-cache" })
			.then(() => {
				const elapsed = Date.now() - this.test.sendTime;
				this.test.ping = Math.min(Math.round(elapsed), 999); 
				setTimeout(() => this.sendHttpPing(), 250);
			})
			.catch((error) => {
				console.error("HTTP Ping error:", error);
				this.handleConnectionError();
			});
	}

	private handleConnectionError() {
		this.test.ping = 0;
		this.test.isConnecting = false;
		this.test.retryCount++;

		if (this.test.ws) {
			this.test.ws.close();
			this.test.ws = null;
		}

		if (this.test.retryCount < 3) {
			setTimeout(() => this.startPingTest(), 1000);
		}
	}

	sendPing() {
		if (this.test.isWebSocket) {
			if (!this.test.ws || this.test.ws.readyState !== WebSocket.OPEN) {
				this.handleConnectionError();
				return;
			}

			try {
				this.test.sendTime = Date.now();
				this.test.ws.send(this.ptcDataBuf);
			} catch (error) {
				console.error("Failed to send ping:", error);
				this.handleConnectionError();
			}
		}
	}

	getPingResult() {
		return {
			region: this.test.region,
			ping: this.test.ping || 0,
		};
	}
}

class PingManager {
	private currentServer: string | null = null;
	private pingTest: PingTest | null = null;

	startPingTest() {
		const currentUrl = window.location.href;
		const isSpecialUrl = /\/#\w+/.test(currentUrl);

		const teamSelectElement = document.getElementById("team-server-select");
		const mainSelectElement = document.getElementById("server-select-main");

		const region =
			isSpecialUrl && teamSelectElement
				? (teamSelectElement as HTMLSelectElement).value
				: mainSelectElement
					? (mainSelectElement as HTMLSelectElement).value
					: null;

		if (!region || region === this.currentServer) return;

		this.currentServer = region;
		this.resetPing();

		const servers = [
			{ region: "NA", url: "usr.mathsiscoolfun.com:8001" },
			{ region: "EU", url: "eur.mathsiscoolfun.com:8001" },
			{ region: "Asia", url: "asr.mathsiscoolfun.com:8001" },
			{ region: "SA", url: "sa.mathsiscoolfun.com:8001" },
		];

		const selectedServer = servers.find(
			(server) => region.toUpperCase() === server.region.toUpperCase(),
		);

		if (selectedServer) {
			this.pingTest = new PingTest(selectedServer);
			this.pingTest.startPingTest();
		}
	}

	resetPing() {
		if (this.pingTest?.test.ws) {
			this.pingTest.test.ws.close();
			this.pingTest.test.ws = null;
		}
		this.pingTest = null;
	}

	getPingResult() {
		return this.pingTest?.getPingResult() || { region: "", ping: 0 };
	}
}

export { PingTest, PingManager };
