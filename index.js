const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

// ================= START BOT CODE ===================

/* FEATURES TO IMPLEMENT
  - option to make the bot a player
  - suggest a word if a player asks for help -- could have limited uses per player for each day --
*/
const { Client, Intents } = require('discord.js');
const { PerformanceObserver, performance } = require('perf_hooks');
const client = new Client({ intents: [Intents.FLAGS.GUILDS,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const DISCORD_TOKEN = process.env['DISCORD_TOKEN'];
const Database = require("@replit/database");


// Import dictionary.txt to array
var fs = require("fs");
var TR = fs.readFileSync("./TDK.txt");
var dictionary = TR.toString().split("\n");


// Sort Turkish Characters Correctly
dictionary.sort(function (a, b) {
  return a.localeCompare(b);
});

// database
const db = new Database();



// Initialise starting letter
var startingLetter = dictionary[(Math.floor(Math.random() * dictionary.length))].toString().charAt(0);
console.log('startingLetter is '+startingLetter);


// Javascript program to implement Binary Search for strings
// Returns index of x if it is present in arr[],
// else return -1
function binarySearch(arr,x)
{
    let l = 0, r = arr.length - 1;
        while (l <= r) {
            let m = l + Math.floor((r - l) / 2);
            let res = x.localeCompare(arr[m]);
            // Check if x is present at mid
            if (res == 0)
                return m;
   
            // If x greater, ignore left half
            if (res > 0)
                l = m + 1;
   
            // If x is smaller, ignore right half
            else
                r = m - 1;
        }
   
        return -1;
}
 
function isLetter (str) {
    let res = /^[a-zA-Z' 'wığüşöçĞÜŞÖÇİ]+$/.test(str);
    console.log('isLetter '+res);
    return res;
}

function isOneWord (str) {
    console.log('isOneWord input type is '+typeof str);
    let res = (str.toString().trim().indexOf(' ') == -1)
    console.log('isOneWord '+res);
    return res;
}

function checkStartingLetter (str,startingLetter) {
    return str.startsWith(startingLetter.toLocaleLowerCase('tr'));
}


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


client.on('messageCreate', (message) => {
  word = message.content.toString().toLocaleLowerCase('tr');

  // get emotes
  let emote0 = performance.now();
  let altarSopali = message.guild.emojis.cache.find(emoji => emoji.name === "altarsopali");
  let taam = message.guild.emojis.cache.find(emoji => emoji.name === "taamtaaminandim");
  let emote1 = performance.now();
  console.log("emotes found in " + (emote1 - emote0) + " milliseconds.");

  console.log(word);
  let t0 = performance.now();
  if (message.author.bot) return;
  if (word.startsWith('.')) return;

  if (!isLetter(word)) {
    message.reply({
      content: 'sadece harf kullanmalısınız!'
    })
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  if (!isOneWord(word)) {
    message.reply({
      content: 'sadece tek kelime kullanmalısınız!'
    })
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  if (!checkStartingLetter(word,startingLetter)) {
    message.reply({
      content: 'başlangıç harfi '+ `**${startingLetter.toLocaleUpperCase('tr')}**` +  ' olmalı! ' + `${altarSopali}`
    })
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  
  if (binarySearch(dictionary,word) == -1) {
     message.reply(`${taam}
son harf **${startingLetter.toLocaleUpperCase('tr')}**`);
  }
  else {
    message.react('✅');
    startingLetter = word.slice(-1); 
  } 
  let t1 = performance.now();
  console.log("replied in " + (t1 - t0) + " milliseconds.");
})

client.login(process.env.DISCORD_TOKEN);


