const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

// ================= START BOT CODE ===================

/* FEATURES TO IMPLEMENT
  - purge the dictionary of duplicate words.
  - styled messages for informing users. -- score tables, starting letter etc... --
  - scoring
  - option for players to play against the bot
  - custom reactions for certain players
  - suggest a word if a player asks for help -- could have limited uses per player for each day --
  - suggestions to correct typos in answers: "did you mean ... ?"
  - show dictionary meaning (button reaction below an answer for inquiry?)
  - voting in new words
  - offensive abilities ??? 
*/
const { Client, Intents } = require('discord.js');
const { PerformanceObserver, performance } = require('perf_hooks');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const DISCORD_TOKEN = process.env['DISCORD_TOKEN'];
const Database = require("@replit/database");

client.login(process.env.DISCORD_TOKEN);

// server uptime
console.time("upTime");

// database
const dictDB = new Database();

// Import dictionary.txt to array
var fs = require("fs");
var TR = fs.readFileSync("./TDK.txt");
var dictionary = TR.toString().toLocaleLowerCase('tr-Tr').split("\n");

// Sort Turkish characters alphabetically
dictionary.sort(function(a, b) {
  return a.localeCompare(b,"tr-TR",{ sensitivity: 'base' });
});


// INITIALISE THE GAME
var remainingWords = [];
var keyValueDictionary = [];
var startingLetter;
var depletedInitials = [];
var winAnswerCountLimit;
var lastAnswerer;
var answerCount = 0;
var winFlag = false;
var altarSopali;
var taam;
var altar;
var cemismont;
var ever;
var ebu_leheb;
var gate = false;
var channel = undefined;

function initialise(dictionary,winCount,message){
  // restrict listening, to the channel the message is sent on
  channel = message.channel;

  // Get dictionary copy to keep track of unused words
  remainingWords = dictionary.slice();

  // Convert dict into key-value array
  keyValueDictionary = dictionary.map(x => [x,0]);

  // Initialise starting letter
  startingLetter = dictionary[(Math.floor(Math.random() * dictionary.length))].toString().charAt(0);
  console.log('startingLetter is ' + startingLetter);

  // set depleted initials
  depletedInitials = ['ğ'];

  // config
  winAnswerCountLimit = winCount;

  // initialise values
  lastAnswerer = undefined;
  answerCount = 0;
  winFlag = false;

  // get emojis
  altarSopali = message.guild.emojis.cache.find(emoji => emoji.name === "altarsopali");
  taam = message.guild.emojis.cache.find(emoji => emoji.name === "taamtaaminandim");
  altar = message.guild.emojis.cache.find(emoji => emoji.name === "altar");
  cemismont = message.guild.emojis.cache.find(emoji => emoji.name === "cemismont");
  ever = message.guild.emojis.cache.find(emoji => emoji.name === "ever");
  ebu_leheb = message.guild.emojis.cache.find(emoji => emoji.name === "ebu_leheb");

  // let the game start
  gate = true;
}

// Binary Search to check if a word(x) exist in the keyValueDictionary(arr)
// Returns index of x if it is present in arr[],
// else return -1
function checkWord(arr, x) {
  let l = 0, r = arr.length - 1;
  while (l <= r) {
    let m = l + Math.floor((r - l) / 2);
    let res = x.localeCompare(arr[m][0],"tr-TR",{ sensitivity: 'base' });
    // Check if x is present at mid
    console.log(x +" " + arr[m][0]);
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
    let res = x.localeCompare(arr[m],"tr-TR",{ sensitivity: 'base' });
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
  let res = /^[a-zA-Z' 'âwığüşöçÂĞÜŞÖÇİ]+$/.test(str);
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
  return str.startsWith(startingLetter.toLocaleLowerCase("tr-TR"));
}

function remindStartingLetter(startingLetter, channel) {
  channel.send({
      content: 'başlangıç harfi ' + `**${startingLetter.toLocaleUpperCase("tr-TR")}**  ${altar}`
    })
}

// Keep track of depleted initials
function isLastRemainingInitial (remainingWordIndex,remainingWords) {
  let initial = remainingWords[remainingWordIndex].charAt(0);
  let previousWordInitial;
  let nextWordInitial;
  let result = false;

  if (remainingWordIndex != 0){  
    let previousWordInitial = remainingWords[remainingWordIndex-1].charAt(0);
    result = (previousWordInitial == initial);
  }
  if (remainingWordIndex != remainingWords.length){
    let nextWordInitial = remainingWords[remainingWordIndex+1].charAt(0);
    result = result || (nextWordInitial == initial);
  }
  if(result) {
    return
    }
  console.log(initial+" is depleted.");
  depletedInitials.push(initial);
}

function isNumeric(val) {
    return /^-?\d+$/.test(val);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


//EVALUATE MESSAGE
client.on('messageCreate', (message) => {
  console.timeLog("upTime");
  
  let t0 = performance.now();
  if (message.author.bot) return;

  console.log("type of channel "+typeof channel);
  // restrict to the channel
  if (typeof channel !== 'undefined') {
    console.log("checking channel... ")
    if (message.channel !== channel) {
      console.log("incorrect channel!");
      return;
    }
  }

  word = message.content.toString().toLocaleLowerCase("tr-TR");
  console.log(word);
  if (word.startsWith('.')) return;

  //COMMANDS
  if (word.startsWith(';;başlat')){
    let commands = word.split(' ');
    let winlimit = commands[1];

    if (typeof winlimit === 'undefined') {
      message.reply ("kelime limiti belirlenmeli! -- ;;başlat kelime_limiti --")
      return;
    }
    
    if (isNumeric(winlimit)) {
      winlimit = parseInt(winlimit); 
      if ((winlimit >= 0) && (winlimit < 1000000)) {
        initialise(dictionary,winlimit,message);
        remindStartingLetter(startingLetter,channel);
        let t1 = performance.now();
        console.log("starting eval completed in "+ (t1-t0));
        return;
      }
      else {
        message.reply ("geçersiz komut! -- 0 ila 1000000 arasında olmalı ---")
      }
    }
    else {
      message.reply ("geçersiz komut!")
    }
    let t1 = performance.now();
    console.log("starting eval completed in "+ (t1-t0));
    return;
  }

  if (word.startsWith(";;durdur")){
    gate = false;
    channel = undefined;
    message.reply ("durduruldu. başlatmak için: ';;başlat kelime_limiti'")
    return;
  }

  // see if the game should start
  if (gate == false) return;

              // START OF THE GAME

  if (!isLetter(word)) {
    message.reply({
      content: 'sadece harf kullanabilirsin!' + `${altarSopali}`
    })
    remindStartingLetter(startingLetter,channel);
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
    remindStartingLetter(startingLetter,channel);
    return;
    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  if (!isOneWord(word)) {

    message.reply({
      content: 'sadece tek kelime kullanabilirsin!' + `${altarSopali}`
    })
    remindStartingLetter(startingLetter,channel);

    let t1 = performance.now();
    console.log("replied in " + (t1 - t0) + " milliseconds.");
    return;
  }

  if (!checkStartingLetter(word, startingLetter)) {

    message.reply({
      content: 'başlangıç harfi ' + `**${startingLetter.toLocaleUpperCase("tr-TR")}**` + `${altarSopali}`
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
      remindStartingLetter(startingLetter,channel);

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
  console.log("DI "+ depletedInitials);
  console.log("word.slice(-1)"+ word.slice(-1))
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
      console.log("oyun bitti!");
      message.reply({
      content: 'Oyunu bitirdin!'
      })
      channel.send(`${cemismont}
      `);
      channel.send(`-------\n\n-------`)
      winFlag = false;

      //reset
      channel.send("Tekrar başlıyor.");
      channel.send(`${ebu_leheb}`);
      initialise(dictionary,winAnswerCountLimit,message);
      remindStartingLetter(startingLetter,channel);
      let t1 = performance.now();
      console.log("replied in " + (t1 - t0) + " milliseconds.");
      return;
    }

    // Assign lastletter and mark the word as used and remove it from the remainingWords. check if initial is depleted.
    let remainingWordIndex = checkRemainingWords(remainingWords,word)
    isLastRemainingInitial(remainingWordIndex,remainingWords);
    startingLetter = word.slice(-1);
    keyValueDictionary[wordIndex][1] = 1;
    remainingWords.splice(remainingWordIndex,1);
    answerCount++;
    lastAnswerer = message.author;
  }
  let t1 = performance.now();
  console.log("replied in " + (t1 - t0) + " milliseconds.\n\n");
})

