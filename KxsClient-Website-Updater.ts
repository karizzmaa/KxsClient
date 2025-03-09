import { execSync } from 'child_process';
import { promises as fs, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';

const config = require('./config.json');

const website_folder = "KxsWebsite";
const clientPath = path.join(process.cwd(), 'dist', config.fileName);

const websitePath = path.join(
	process.env.HOME || "",
	"Documents",
	'GitHub',
	website_folder
)

// Compile the client

execSync('npx webpack', {
	cwd: process.cwd(),
	stdio: 'inherit'
})

// Read the client's file

const client = readFileSync(clientPath, 'utf-8');

// Update the client from the website folder

const indexScriptFile = path.join(
	websitePath,
	'download',
	"latest-dev.js"
);

writeFile(indexScriptFile, client, 'utf-8');

// Push the changes to the repository

execSync('git add .', {
	cwd: websitePath,
	stdio: 'inherit'
})

execSync('git commit -m "Update the client"', {
	cwd: websitePath,
	stdio: 'inherit'
})

execSync('git push', {
	cwd: websitePath,
	stdio: 'inherit'
})

console.log('Client updated successfully!')