class PingTest {
	private ptcDataBuf: ArrayBuffer;
	private ping: number = 0;
	private ws: WebSocket | null = null;
	private sendTime: number = 0;
	private retryCount: number = 0;
	private isConnecting: boolean = false;
	private isWebSocket: boolean = true;
	private url: string = "";
	private region: string = "";
	private hasPing: boolean = false;

	constructor() {
		this.ptcDataBuf = new ArrayBuffer(1);
		this.waitForServerSelectElements();
	}


	private waitForServerSelectElements() {
		const checkInterval = setInterval(() => {
			const teamSelect = document.getElementById("team-server-select");
			const mainSelect = document.getElementById("server-select-main");

			if (teamSelect || mainSelect) {
				clearInterval(checkInterval);
				this.setServerFromDOM();
				this.attachRegionChangeListener();
			}
		}, 100); // Vérifie toutes les 100ms
	}

	private setServerFromDOM() {
		const { region, url } = this.detectSelectedServer();
		this.region = region;
		this.url = `wss://${url}/ptc`;
	}

	private detectSelectedServer(): { region: string; url: string } {
		const currentUrl = window.location.href;
		const isSpecialUrl = /\/#\w+/.test(currentUrl);

		const teamSelectElement = document.getElementById("team-server-select") as HTMLSelectElement | null;
		const mainSelectElement = document.getElementById("server-select-main") as HTMLSelectElement | null;

		const region =
			isSpecialUrl && teamSelectElement
				? teamSelectElement.value
				: mainSelectElement?.value || "NA";

		console.log("-----------------------------------------------------------", region)
		const servers = [
			{ region: "NA", url: "usr.mathsiscoolfun.com:8001" },
			{ region: "EU", url: "eur.mathsiscoolfun.com:8001" },
			{ region: "Asia", url: "asr.mathsiscoolfun.com:8001" },
			{ region: "SA", url: "sa.mathsiscoolfun.com:8001" },
		];

		const selectedServer = servers.find((s) => s.region.toUpperCase() === region.toUpperCase());

		if (!selectedServer) throw new Error("Aucun serveur correspondant trouvé");

		return selectedServer;
	}

	private attachRegionChangeListener() {
		const teamSelectElement = document.getElementById("team-server-select");
		const mainSelectElement = document.getElementById("server-select-main");

		const onChange = () => {
			const { region } = this.detectSelectedServer();
			if (region !== this.region) {
				this.restart();
			}
		};

		teamSelectElement?.addEventListener("change", onChange);
		mainSelectElement?.addEventListener("change", onChange);
	}

	public start() {
		if (this.isConnecting) return;
		this.isConnecting = true;
		this.startWebSocketPing();
	}

	private startWebSocketPing() {
		console.log(this.url)
		if (this.ws || !this.url) return;

		const ws = new WebSocket(this.url);
		ws.binaryType = "arraybuffer";

		ws.onopen = () => {
			this.ws = ws;
			this.retryCount = 0;
			this.isConnecting = false;
			this.sendPing();
		};

		ws.onmessage = () => {
			this.hasPing = true;
			const elapsed = (Date.now() - this.sendTime) / 1e3;
			this.ping = Math.round(elapsed * 1000);
			setTimeout(() => this.sendPing(), 250);
		};

		ws.onerror = () => {
			this.ping = 0;
			this.retryCount++;
			if (this.retryCount < 3) {
				setTimeout(() => this.startWebSocketPing(), 1000);
			} else {
				this.ws?.close();
				this.ws = null;
				this.isConnecting = false;
			}
		};

		ws.onclose = () => {
			this.ws = null;
			this.isConnecting = false;
		};
	}

	private sendPing() {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.sendTime = Date.now();
			this.ws.send(this.ptcDataBuf);
		}
	}

	public stop() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.isConnecting = false;
		this.retryCount = 0;
		this.hasPing = false;
	}


	public restart() {
		this.stop();
		this.setServerFromDOM();
		this.start();
	}

	public getPingResult() {
		return {
			region: this.region,
			ping: this.hasPing ? this.ping : null,
		};
	}

}

export { PingTest };
