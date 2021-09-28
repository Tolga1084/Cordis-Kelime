const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

// ================= START BOT CODE ===================

/* FEATURES TO IMPLEMENT
  - command system
  - end conditions
  - styled messages for informing users. -- score tables, starting letter etc... --
  - scoring
  - option for players to play against the bot
  - suggest a word if a player asks for help -- could have limited uses per player for each day --
  - suggestions to correct typos in answers: "did you mean ... ?"
  - show dictionary meaning
  - voting in new words
*/
const { Client, Intents } = require('discord.js');
const { PerformanceObserver, performance } = require('perf_hooks');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const DISCORD_TOKEN = process.env['DISCORD_TOKEN'];
const Database = require("@replit/database");

// server uptime
console.time("upTime");

// Import dictionary.txt to array
var fs = require("fs");
var TR = fs.readFileSync("./TDK.txt");
var dictionary = TR.toString().toLowerCase().split("\n");


// Sort Turkish characters alphabetically
dictionary.sort(function(a, b) {
  return a.localeCompare(b);
});

// Get dictionary copy to keep track of unused words
const remainingWords = dictionary.slice();

// Convert dict into key-value array
var keyValueDictionary = dictionary.map(x => [x,0]);
  
console.log(keyValueDictionary[1000]);
console.log(dictionary[1000]);

// database
const dictDB = new Database();

// Initialise starting letter
var startingLetter = dictionary[(Math.floor(Math.random() * dictionary.length))].toString().charAt(0);
console.log('startingLetter is ' + startingLetter);


// Binary Search to check if a word(x) exist in the keyValueDictionary(arr)
// Returns index of x if it is present in arr[],
// else return -1
function checkWord(arr, x) {
  let l = 0, r = arr.length - 1;
  while (l <= r) {
    let m = l + Math.floor((r - l) / 2);
    let res = x.localeCompare(arr[m][0]);
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

// Binary Search to check if a word starting with the startingletter(x) exist in the remainingWords(arr)
// Returns index of x if it is present in arr[],
// else return -1
function checkRemainingWords(arr, x) {
  let l = 0, r = arr.length - 1;
  while (l <= r) {
    let m = l + Math.floor((r - l) / 2);
    //console.log(arr[m] + "  " + arr[m])
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

function isLetter(str) {
  let res = /^[a-zA-Z' 'wığüşöçĞÜŞÖÇİ]+$/.test(str);
  //console.log('isLetter ' + res);
  return res;
}

function isOneWord(str) {
  //console.log('isOneWord input type is ' + typeof str);
  let res = (str.toString().trim().indexOf(' ') == -1)
  //console.log('isOneWord ' + res);
  return res;
}

function checkStartingLetter(str, startingLetter) {
  return str.startsWith(startingLetter.toLocaleLowerCase('tr'));
}

function remindStartingLetter(startingLetter, message) {
  message.channel.send({
      content: 'başlangıç harfi ' + `**${startingLetter.toLocaleUpperCase('tr')}**`
    })
}

// Keep track of depleted initials
const depletedInitials = ['ğ'];
function isLastRemainingInitial (remainingWordIndex,remainingWords) {
  let t0 = performance.now();
  let initial = remainingWords[remainingWordIndex].charAt(0);
  let previousWordInitial;
  let nextWordInitial;
  let result = false;

  if (remainingWordIndex != 0){
    let previousWordInitial = remainingWords[remainingWordIndex-1].charAt(0);
    console.log("pwi "+previousWordInitial);
    result = (previousWordInitial == initial);
    console.log("result "+result);
  }
  console.log("rw.length " + remainingWords.length);
  if (remainingWordIndex != remainingWords.length){
    let nextWordInitial = remainingWords[remainingWordIndex+1].charAt(0);
    console.log("nwi "+ nextWordInitial);
    result = result || (previousWordInitial == initial);
    console.log("result "+result);
  }
  if(result) {
    let t1 = performance.now();
    console.log("isLastRemainingInitial completed in " + (t1-t0));
    return
    }
  let t1 = performance.now();
  console.log("isLastRemainingInitial completed in " + (t1-t0));
  console.log(initial+" is depleted.");
  depletedInitials.push(initial);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// config
const winAnswerCountLimit = 3;

//Evaluate the answer
var lastAnswerer;
var answerCount = 0;
var winFlag = false;

client.on('messageCreate', (message) => {
  console.timeLog("upTime");
  // get emotes -- !! move these out of the event handler once the channel is set !! --
  let emote0 = performance.now();
  let altarSopali = message.guild.emojis.cache.find(emoji => emoji.name === "altarsopali");
  let taam = message.guild.emojis.cache.find(emoji => emoji.name === "taamtaaminandim");
  let emote1 = performance.now();
  console.log("emotes found in " + (emote1 - emote0) + " milliseconds.");

  word = message.content.toString().toLocaleLowerCase('tr');
  

  console.log(word);
  let t0 = performance.now();
  if (message.author.bot) return;
  if (word.startsWith('.')) return;

  if (!isLetter(word)) {
    message.reply({
      content: 'sadece harf kullanabilirsin!' + `${altarSopali}`
    })
    remindStartingLetter(startingLetter,message);
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  console.log('lastAnswerer '+lastAnswerer);
  console.log('messageAuthor '+message.author);
  if (lastAnswerer === message.author) {

    message.reply({
      content: 'sen sıranı savdın!' + `${altarSopali}`
    })
    remindStartingLetter(startingLetter,message);
    return;
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  if (!isOneWord(word)) {

    message.reply({
      content: 'sadece tek kelime kullanabilirsin!' + `${altarSopali}`
    })
    remindStartingLetter(startingLetter,message);

    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  if (!checkStartingLetter(word, startingLetter)) {

    message.reply({
      content: 'başlangıç harfi ' + `**${startingLetter.toLocaleUpperCase('tr')}**` + `${altarSopali}`
    })
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }
  
  let wordIndex = checkWord(keyValueDictionary, 
  word); // returns -1 if no match is found
  console.log("wordIndex "+wordIndex);
  
  if (wordIndex == -1) {
      message.reply(`${taam}`);
      remindStartingLetter(startingLetter,message);

    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  if (keyValueDictionary[wordIndex][1]) {
    message.reply({
      content: 'bu kelime zaten kullanıldı!' + `${altarSopali}`
    })
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }  

  // CHECK WIN CONDITION. Deny answer if winning answer is submitted before the answer limit

  var remainingWordIndex = checkRemainingWords(remainingWords,word)

  if (depletedInitials.includes(word.slice(-1))) {
    if (answerCount >= winAnswerCountLimit){
      winFlag = true;
    }
    else {
      message.reply ("oyunun bitebilmesi için en az " + (winAnswerCountLimit-answerCount) + " kelime daha gerekli!" + `${altarSopali}`)
      return;
    }
  }
  
  
  // SUCCESS  
   {
    message.react('✅');

    // check if the answer ends the game
    if (winFlag) {
      // End the game and reset it
      console.log("oyun bitti");
      message.channel.send({
      content: 'oyun bitti'
      })
      winFlag = false;
      let t1 = performance.now();
      console.log("replied in " + (t1 - t0) + " milliseconds.");
    }

    // Assign lastletter and mark the word as used and remove it from the remainingWords. check if initial is depleted.
    console.log("rwi"+remainingWordIndex);
    isLastRemainingInitial(remainingWordIndex,remainingWords);
    startingLetter = word.slice(-1);
    keyValueDictionary[wordIndex][1] = 1;
    remainingWords.splice(remainingWordIndex,1);
    answerCount++;
    //lastAnswerer = message.author;
  }
  let t1 = performance.now();
  console.log("replied in " + (t1 - t0) + " milliseconds.");
})

client.login(process.env.DISCORD_TOKEN);