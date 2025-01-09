const config = require('./config.json');
const packageInfo = require('./package.json');

module.exports = {
    banner: `// ==UserScript==
// @name         Kxs Client - Survev.io Client
// @namespace    ${packageInfo.namespace}
// @version      ${packageInfo.version}
// @description  ${packageInfo.description}
// @author       ${packageInfo.author}
// @license      ${packageInfo.license}
// @run-at       document-end
// @downloadURL  ${config.base_url}/download/latest-dev.js
${config.match.map((match) => `// @match        ${match}`).join('\n')}
${config.grant.map((grant) => `// @grant        ${grant}`).join('\n')}
// ==/UserScript==
;`
}