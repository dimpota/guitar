/* ==================================================
GUITAR MANAGER - STATIC VERSION
================================================== */

/* ==================================================
CONFIGURATION
================================================== */

const PLAYLIST_FILE = "playlist.txt";

const FILE_DATES_FILE = "file_dates.json";

const SONGS_BASE_DIR = "TRAG";

/* ==================================================
ELEMENTS
================================================== */

const playlist =
document.getElementById("playlist");

const viewer =
document.getElementById("songViewer");

const explorer =
document.querySelector(".explorer");

const zoomIn =
document.getElementById("zoomIn");

const zoomOut =
document.getElementById("zoomOut");

const wrapText =
document.getElementById("wrapText");

/* ==================================================
STATE
================================================== */

let fileDates = [];

let currentExplorerPath = "";

let viewerFontSize = 16;

let textWrapped = false;

let selectedPlaylistItem = null;

/* ==================================================
ANDROID DETECTION
================================================== */

if (/Android/i.test(navigator.userAgent)) {
document.body.classList.add("android");
}

/* ==================================================
LOAD FILE DATES
================================================== */

async function loadFileDates() {

try {

const response =
  await fetch(FILE_DATES_FILE);

if (!response.ok) {
  throw new Error(
    "Could not load file_dates.json"
  );
}

const data =
  await response.json();

if (!Array.isArray(data)) {
  throw new Error(
    "file_dates.json must contain an array"
  );
}

fileDates = data;

console.log(
  "File dates loaded:",
  fileDates.length
);


}

catch (error) {

console.error(
  "ERROR loading file_dates.json:",
  error
);

fileDates = [];


}

}

/* ==================================================
LOAD PLAYLIST
================================================== */

async function loadPlaylist() {

try {

const response =
  await fetch(PLAYLIST_FILE);

if (!response.ok) {
  throw new Error(
    "Could not load playlist"
  );
}

const text =
  await response.text();

playlist.innerHTML = "";

text
  .split(/\r?\n/)
  .forEach(function (line) {

    if (!line.trim()) {
      return;
    }

    createPlaylistItem(
      line.trim()
    );

  });


}

catch (error) {

console.error(
  "ERROR loading playlist:",
  error
);

playlist.innerHTML = "";


}

}

/* ==================================================
CREATE PLAYLIST ITEM
================================================== */

function createPlaylistItem(songName) {

const item =
document.createElement("li");

item.textContent =
songName;

item.addEventListener(
"click",
function () {

  selectPlaylistSong(item);

}


);

playlist.appendChild(item);

}

/* ==================================================
SELECT PLAYLIST SONG
================================================== */

function selectPlaylistSong(item) {

playlist
.querySelectorAll("li")
.forEach(function (element) {

  element.style.backgroundColor = "";

});


item.style.backgroundColor =
"#cce5ff";

selectedPlaylistItem =
item;

const songName =
item.textContent;

loadSong(songName);

}

/* ==================================================
REMOVE ACCENTS
================================================== */

function removeAccents(text) {

return text
.normalize("NFD")
.replace(
/[\u0300-\u036f]/g,
""
);

}

/* ==================================================
CLEAN TITLE
================================================== */

function cleanTitle(text) {

if (!text) {
return "";
}

text =
String(text);

text =
text
.split("/")[0]
.toUpperCase()
.trim();

text =
removeAccents(text);

text =
text.replace(/ /g, "_");

text =
text.replace(/\//g, "_");

const charactersToRemove = [
"\",
"(",
")",
"-",
"─",
"{",
"}",
"]",
"["
];

charactersToRemove.forEach(
function (character) {

  text =
    text
      .split(character)
      .join("");

}


);

return text;

}

/* ==================================================
FIND SONG IN JSON
================================================== */

function findSongPath(songName) {

const target =
cleanTitle(songName);

if (!target) {
return null;
}

const candidates =
fileDates
.map(function (entry) {

    if (!entry || !entry.path) {
      return null;
    }

    return {
      path: entry.path,
      clean: cleanTitle(
        entry.path
          .split("/")
          .pop()
          .replace(/\.[^.]+$/, "")
      )
    };

  })
  .filter(Boolean);


/*
Same matching logic as the old server:
progressively compare the beginning of
the cleaned filename.
*/

for (
let length = 4;
length <= target.length;
length++
) {

const targetSlice =
  target.substring(0, length);

const matches =
  candidates.filter(function (item) {

    return item.clean.substring(
      0,
      length
    ) === targetSlice;

  });


if (matches.length === 1) {

  return matches[0].path;

}


if (matches.length > 1) {

  continue;

}


break;


}

/*
Exact match fallback.
*/

const exact =
candidates.find(function (item) {

  return item.clean === target;

});


if (exact) {
return exact.path;
}

/*
Starts-with fallback.
*/

const startsWith =
candidates.find(function (item) {

  return item.clean.startsWith(target);

});


if (startsWith) {
return startsWith.path;
}

return null;

}

/* ==================================================
BUILD SONG URL
================================================== */

function buildSongUrl(relativePath) {

const normalized =
relativePath
.replace(/\/g, "/")
.replace(/^/+/, "");

return (
SONGS_BASE_DIR +
"/" +
normalized
)
.split("/")
.map(encodeURIComponent)
.join("/");

}

/* ==================================================
LOAD SONG
================================================== */

async function loadSong(songName) {

const relativePath =
findSongPath(songName);

if (!relativePath) {

console.error(
  "SONG NOT FOUND:",
  songName
);

viewer.textContent =
  "Song file not found.";

currentExplorerPath = "";

renderExplorer();

return;


}

const url =
buildSongUrl(relativePath);

try {

const response =
  await fetch(url);

if (!response.ok) {
  throw new Error(
    "Song file not found"
  );
}

const text =
  await response.text();

viewer.textContent =
  text;


/*
   Open the folder containing
   the selected song.
*/

const normalized =
  relativePath
    .replace(/\\/g, "/");


const parts =
  normalized.split("/");


parts.pop();


currentExplorerPath =
  parts.join("/");


renderExplorer();


}

catch (error) {

console.error(
  "ERROR loading song:",
  error
);

viewer.textContent = "";


}

}

/* ==================================================
GET DIRECTORY ITEMS FROM file_dates.json
================================================== */

function getExplorerItems(directoryPath) {

const prefix =
directoryPath
? directoryPath.replace(
//+$/,
""
) + "/"
: "";

const directories = new Map();

const files = [];

fileDates.forEach(
function (entry) {

  if (
    !entry ||
    !entry.path
  ) {
    return;
  }


  const normalized =
    entry.path
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");


  if (
    !normalized.startsWith(prefix)
  ) {
    return;
  }


  const remaining =
    normalized.substring(
      prefix.length
    );


  if (!remaining) {
    return;
  }


  const slashIndex =
    remaining.indexOf("/");


  /*
     DIRECTORY
  */

  if (slashIndex !== -1) {

    const directoryName =
      remaining.substring(
        0,
        slashIndex
      );


    if (
      !directories.has(
        directoryName
      )
    ) {

      directories.set(
        directoryName,
        {
          name: directoryName,
          type: "directory",
          modified: entry.modified || null
        }
      );

    }

    return;

  }


  /*
     FILE
  */

  files.push({

    name: remaining,

    type: "file",

    modified:
      entry.modified || null,

    path:
      normalized

  });

}


);

return [
...directories.values(),
...files
];

}

/* ==================================================
SORT EXPLORER
NEWEST -> OLDEST
================================================== */

function sortExplorerItems(items) {

return [...items].sort(
function (a, b) {

  const dateA =
    a.modified
      ? new Date(a.modified).getTime()
      : 0;

  const dateB =
    b.modified
      ? new Date(b.modified).getTime()
      : 0;


  if (dateA !== dateB) {

    return dateB - dateA;

  }


  return a.name.localeCompare(
    b.name,
    "el",
    {
      sensitivity: "base"
    }
  );

}


);

}

/* ==================================================
GET FOLDER NAME
================================================== */

function getFolderName(path) {

if (!path) {
return "TRAGOUDI_TXT";
}

const parts =
path.split("/");

return parts[
parts.length - 1
];

}

/* ==================================================
RENDER EXPLORER
================================================== */

function renderExplorer() {

if (!explorer) {
return;
}

explorer.innerHTML = "";

/*
HEADER
*/

const header =
document.createElement("div");

header.className =
"explorerHeader";

/*
BACK
*/

const backButton =
document.createElement("button");

backButton.type =
"button";

backButton.textContent =
"← BACK";

backButton.addEventListener(
"click",
function () {

  if (!currentExplorerPath) {
    return;
  }


  const parts =
    currentExplorerPath
      .split("/");


  parts.pop();


  currentExplorerPath =
    parts.join("/");


  renderExplorer();

}


);

header.appendChild(
backButton
);

explorer.appendChild(
header
);

/*
FOLDER NAME
*/

const folderName =
document.createElement("div");

folderName.className =
"explorerCurrentFolder";

folderName.textContent =
getFolderName(
currentExplorerPath
);

explorer.appendChild(
folderName
);

/*
LIST
*/

const list =
document.createElement("ul");

const items =
sortExplorerItems(
getExplorerItems(
currentExplorerPath
)
);

items.forEach(
function (item) {

  const listItem =
    document.createElement("li");


  if (
    item.type === "directory"
  ) {

    listItem.textContent =
      "📁 " + item.name;

  }

  else {

    listItem.textContent =
      "📄 " + item.name;

  }


  listItem.addEventListener(
    "click",
    function () {

      list
        .querySelectorAll("li")
        .forEach(function (element) {

          element.style.backgroundColor =
            "";

        });


      listItem.style.backgroundColor =
        "#cce5ff";


      /*
         DIRECTORY
      */

      if (
        item.type === "directory"
      ) {

        currentExplorerPath =
          currentExplorerPath
            ? currentExplorerPath +
              "/" +
              item.name
            : item.name;

        renderExplorer();

        return;

      }


      /*
         FILE
      */

      if (
        item.type === "file"
      ) {

        if (
          !item.name
            .toLowerCase()
            .endsWith(".txt")
        ) {

          return;

        }


        loadExplorerFile(
          item.path,
          item.name
        );

      }

    }
  );


  list.appendChild(
    listItem
  );

}


);

explorer.appendChild(
list
);

}

/* ==================================================
LOAD EXPLORER TXT
================================================== */

async function loadExplorerFile(
filePath,
fileName
) {

const url =
buildSongUrl(
filePath
);

try {

const response =
  await fetch(url);

if (!response.ok) {

  throw new Error(
    "Could not load TXT file"
  );

}


const text =
  await response.text();


viewer.textContent =
  text;

console.log(
  "Explorer TXT loaded:",
  fileName
);


}

catch (error) {

console.error(
  "ERROR loading Explorer TXT:",
  error
);


}

}

/* ==================================================
ZOOM IN
================================================== */

zoomIn.addEventListener(
"click",
function () {

viewerFontSize++;

if (viewerFontSize > 40) {
  viewerFontSize = 40;
}

viewer.style.fontSize =
  viewerFontSize + "px";


}
);

/* ==================================================
ZOOM OUT
================================================== */

zoomOut.addEventListener(
"click",
function () {

viewerFontSize--;

if (viewerFontSize < 8) {
  viewerFontSize = 8;
}

viewer.style.fontSize =
  viewerFontSize + "px";


}
);

/* ==================================================
WRAP TEXT
================================================== */

wrapText.addEventListener(
"click",
function () {

textWrapped =
  !textWrapped;


if (textWrapped) {

  viewer.style.whiteSpace =
    "pre-wrap";

  viewer.style.overflowX =
    "hidden";

  wrapText.textContent =
    "NO";

  wrapText.setAttribute(
    "aria-pressed",
    "true"
  );

}

else {

  viewer.style.whiteSpace =
    "pre";

  viewer.style.overflowX =
    "auto";

  wrapText.textContent =
    "WR";

  wrapText.setAttribute(
    "aria-pressed",
    "false"
  );

}


}
);

/* ==================================================
START
================================================== */

async function startApplication() {

await loadFileDates();

await loadPlaylist();

renderExplorer();

}

startApplication();