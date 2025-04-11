import { WebSocket } from "ws";
import fs from 'fs';

// List of common English words for verification (a small list for example)
const englishWords = fs.readFileSync('words.txt', 'utf-8').split('\n');

// Function to check if a string contains an English word
function containsEnglishWord(text: string): string | null {
	// Remove # and convert to lowercase
	const cleanText = text.replace('#', '')//.toLowerCase();

	// Check if a whole word is present
	for (const word of englishWords) {
		if (cleanText === word) {
			return word;
		}
	}

	return null;
}


// Function to create a connection and check the URL
async function tryConnection(attemptNumber: number): Promise<string | null> {
	return new Promise((resolve, reject) => {
		// 10-second timeout
		const timeout = setTimeout(() => {
			console.log(`Attempt ${attemptNumber} timed out, moving to next`);
			if (wsClient.readyState === WebSocket.OPEN) {
				wsClient.close();
			}
			resolve(null);
		}, 10000);

		const wsClient = new WebSocket("wss://surviv.mathsiscoolfun.com/team_v2", {
			headers: {
				"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
				"Accept": "*/*",
				"Accept-Language": "en-US,en;q=0.5"
			}
		});

		wsClient.on('open', () => {
			console.log(`Attempt ${attemptNumber}: Connected to server`);

			wsClient.send(JSON.stringify({
				"type": "create",
				"data": {
					"roomData": {
						"roomUrl": "",
						"region": "eu",
						"gameModeIdx": 1,
						"autoFill": false,
						"findingGame": false,
						"lastError": ""
					},
					"playerData": {
						"name": `kxs.rip-${attemptNumber}`
					}
				}
			}));
		});

		wsClient.on('message', (data) => {
			try {
				const message = JSON.parse(data.toString());
				const roomUrl = message?.data?.room?.roomUrl || "";

				console.log(`Attempt ${attemptNumber}: Received URL: ${roomUrl}`);

				// Check if URL contains an English word
				const foundWord = containsEnglishWord(roomUrl);
				if (foundWord) {
					console.log(`✅ FOUND! Attempt ${attemptNumber}: URL ${roomUrl} contains the English word "${foundWord}"`);

					// Save the result to a file
					const result = {
						attempt: attemptNumber,
						roomUrl: roomUrl,
						word: foundWord,
						fullData: message
					};

					fs.writeFileSync('roomurl_match.json', JSON.stringify(result, null, 2));

					// Keep the connection open
					clearTimeout(timeout);
					console.log(`🔌 Connection kept open for room: ${roomUrl}`);
					console.log(`💬 You can use this room with the word "${foundWord}"`);
					console.log(`⚠️ Press Ctrl+C to terminate the program`);

					// Resolve the promise but keep the connection open
					resolve(roomUrl);
				} else {
					// Close the connection to move to the next one
					setTimeout(() => {
						clearTimeout(timeout);
						wsClient.close();
						resolve(null);
					}, 500);
				}
			} catch (error) {
				console.error(`Error processing message: ${error}`);
				clearTimeout(timeout);
				wsClient.close();
				resolve(null);
			}
		});

		wsClient.on('close', () => {
			console.log(`Attempt ${attemptNumber}: Disconnected from server`);
			clearTimeout(timeout);
			resolve(null);
		});

		wsClient.on('error', (error) => {
			console.error(`Attempt ${attemptNumber}: WebSocket error:`, error);
			clearTimeout(timeout);
			wsClient.close();
			resolve(null);
		});
	});
}

// Main function to start the bruteforce
async function startBruteforce(maxAttempts: number) {
	console.log(`Starting bruteforce with ${maxAttempts} maximum attempts`);

	let attemptCount = 0;
	let resultFound = false;

	while (attemptCount < maxAttempts && !resultFound) {
		attemptCount++;
		console.log(`\n--- Attempt ${attemptCount}/${maxAttempts} ---`);

		const result = await tryConnection(attemptCount);
		if (result) {
			console.log(`\n🎉 SUCCESS! URL found with an English word: ${result}`);
			resultFound = true;

			// Keep the program active while the connection is open
			console.log(`\n⏳ Program waiting... WebSocket kept active.`);
			// Wait indefinitely (until the user presses Ctrl+C)
			await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000)); // 24 hours
		}

		// Small pause between attempts to avoid being blocked
		if (!resultFound && attemptCount < maxAttempts) {
			// console.log(`Pausing for 2 seconds before next attempt...`);
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	if (!resultFound) {
		console.log(`\n❌ Failed after ${maxAttempts} attempts. No URL with English word found.`);
	}
}

// Launch bruteforce with a maximum of 1,000,000 attempts
startBruteforce(1000000).catch(error => {
	console.error('Error during bruteforce:', error);
});