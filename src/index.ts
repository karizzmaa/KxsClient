import { KxsMainClientMenu } from "./ClientMainMenu";
import { KxsClientSecondaryMenu } from "./ClientSecondaryMenuRework";
import { KxsClientHUD } from "./ClientHUD";
import { intercept } from "./intercept";

import KxsClient from "./KxsClient";
import { Config } from "./types/configtype";
import { KxsLegacyClientSecondaryMenu } from "./ClientSecondaryMenu";
import { LoadingScreen } from "./LoadingScreen";

const packageInfo = require('../package.json');
const config: Config = require('../config.json');

export const background_song = config.base_url + "/assets/Stranger_Things_Theme_Song_C418_REMIX.mp3";
export const kxs_logo = config.base_url + "/assets/KysClientLogo.png";

const loadingScreen = new LoadingScreen(kxs_logo);
loadingScreen.show();

const backgroundElement = document.getElementById("background");
if (backgroundElement) backgroundElement.style.backgroundImage = `url("${config.base_url}/assets/background.jpg")`;

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = kxs_logo
document.head.appendChild(favicon);
document.title = "KxsClient";

intercept("audio/ambient/menu_music_01.mp3", background_song);
intercept('img/survev_logo_full.png', kxs_logo);

const uiStatsLogo = document.querySelector('#ui-stats-logo') as HTMLElement | null;
if (uiStatsLogo) {
	uiStatsLogo.style.backgroundImage = `url('${kxs_logo}')`;
}
const newChangelogUrl = config.base_url;
const startBottomMiddle = document.getElementById("start-bottom-middle");

if (startBottomMiddle) {
	const links = startBottomMiddle.getElementsByTagName("a");

	for (let i = 0; i < links.length; i++) {
		const link = links[i];

		if (link.href.includes("changelogRec.html") || link.href.includes("changelog.html")) {
			link.href = newChangelogUrl;
			link.textContent = packageInfo.version;
		}
		if (i === 1) {
			link.remove();
		}
	}
}


const kxsClient = new KxsClient();
const kxsClientHUD = new KxsClientHUD(kxsClient);
const mainMenu = new KxsMainClientMenu(kxsClient);

setInterval(() => {
	loadingScreen.hide();
}, 1400);