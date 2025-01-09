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
  };

  constructor(selectedServer: { region: string; url: string }) {
    this.ptcDataBuf = new ArrayBuffer(1);
    this.test = {
      region: selectedServer.region,
      url: `wss://${selectedServer.url}/ptc`,
      ping: 0, // Initialize to 0 instead of 9999
      ws: null,
      sendTime: 0,
      retryCount: 0,
      isConnecting: false,
    };
  }

  startPingTest() {
    if (this.test.isConnecting) return; // Prevent multiple connection attempts
    if (this.test.ws) return; // Don't create new connection if one exists

    this.test.isConnecting = true;

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
        this.test.ping = Math.min(Math.round(elapsed), 999); // Cap at 999ms

        // Schedule next ping
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