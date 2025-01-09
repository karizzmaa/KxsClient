// this function come from the discord.js-selfbot-v13 

function parseImage(image) {
  if (typeof image != 'string') {
    image = null;
  } else if (URL.canParse(image) && ['http:', 'https:'].includes(new URL(image).protocol)) {
    // Discord URL:
    image = image
      .replace('https://cdn.discordapp.com/', 'mp:')
      .replace('http://cdn.discordapp.com/', 'mp:')
      .replace('https://media.discordapp.net/', 'mp:')
      .replace('http://media.discordapp.net/', 'mp:');
    //
    if (!image.startsWith('mp:')) {
      throw new Error('INVALID_URL');
    }
  } else if (/^[0-9]{17,19}$/.test(image)) {
    // ID Assets
  } else if (['mp:', 'youtube:', 'spotify:', 'twitch:'].some(v => image.startsWith(v))) {
    // Image
  } else if (image.startsWith('external/')) {
    image = `mp:${image}`;
  }
  return image;
}


console.log(
  parseImage("https://cdn.discordapp.com/app-assets/1321193265533550602/1322173537326338058.png?size=512")
)

module.exports = {
  parseImage
}