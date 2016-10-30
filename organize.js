/*!
 * github.com/codenameyau/music
 *
 * Description:
 * This scripts alphabetically sorts the songs in 'genre/'
 * and generates the files: 'music.txt' and 'README.md'.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');
var format = require('util').format;

var PATH = path.resolve(__dirname);
var GENRE_DIR = PATH + '/genre/';
var README_PATH = PATH + '/README.md';
var GEN_DIR = PATH + '/data/';
var MUSIC_PATH = GEN_DIR + 'music.txt';
var JSON_PATH = GEN_DIR + 'music.json';
var YOUTUBE_SEARCH = 'https://www.youtube.com/results?search_query=';
var GITHUB_PAGE = 'https://github.com/codenameyau/music';
var SONGS = {};


/********************************************************************
* UTILS
*********************************************************************/
var stripSymbols = function(string) {
  return string.replace(/[.,-\/#!$%\^\*;:{}=_`~()]/g, '');
};

var slugify = function(string) {
  return string.toLowerCase()
          .replace(/[^\w ]+/g, '')
          .replace(/\s+/g, '-');
};

var compareAlphabetically = function(a, b) {
  return a.toLowerCase().localeCompare(b.toLowerCase());
};


/********************************************************************
* SONG CONSTRUCTOR
*********************************************************************/
function Song(data) {
  this.artist = data[0];
  this.title = data[1];
}

Song.prototype.encodeForURL = function() {
  return encodeURIComponent(format('%s %s',
    stripSymbols(this.artist),
    stripSymbols(this.title)
  )).replace(/\%20/g, '+');
};

Song.prototype.getYoutubeSearch = function() {
  return YOUTUBE_SEARCH + this.encodeForURL();
};


/********************************************************************
* HELPER FUNCTIONS
*********************************************************************/
var getGithubReadmeLink = function(fragment) {
  return format('%s#%s', GITHUB_PAGE, slugify(fragment));
};

var alphabetize = function(data) {
  // Perform case-insensitive sort.
  data.sort(compareAlphabetically);

  // Filter extra newlines.
  return data.filter(Boolean);
};

var alphabetizeSongs = function(genre, subgenre, doneGenre) {
  var filename = GENRE_DIR + genre + '/' + subgenre;

  fs.readFile(filename, 'UTF-8', function(error, data) {
    // Propagate error while trying to read file.
    if (error) { return doneGenre(error); }

    // Trim spaces and replace dashes with pipes.
    data = data.replace(/ +/g, ' ');
    data = data.replace(/ - /g, ' | ');

    // Alphabetize and save the file.
    var songList = alphabetize(data.split('\n'));
    var stream = fs.createWriteStream(filename);
    stream.once('open', function() {
      songList.forEach(function(song) {
        stream.write(format('%s\n', song));
      });
    });

    // Store data for further use.
    songList.forEach(function(item) {
      var songData = item.split(/\s+\|\s+/);
      SONGS[genre][subgenre].push(new Song(songData));
    });
    doneGenre(null);
  });
};

var populateGenre = function(genre, doneReading, callback) {
  var genreDir = GENRE_DIR + genre;
  SONGS[genre] = {};

  fs.readdir(genreDir, function(error, genreFiles) {
    async.each(genreFiles, function(subgenre, doneGenre) {
      SONGS[genre][subgenre] = [];
      alphabetizeSongs(genre, subgenre, doneGenre);
    },
    function(readError) {
      if (callback) {
        return callback(readError, doneReading);
      }
      doneReading(readError);
    });
  });
};

var getGenreCount = function(songs) {
  var count = 0;
  for (var subgenre in songs) {
    count += songs[subgenre].length;
  }
  return count;
};

var createJSONFile = function() {
  var stream = fs.createWriteStream(JSON_PATH);
  stream.once('open', function() {
    console.log('Create file: %s', JSON_PATH);
    stream.write(JSON.stringify(SONGS, null, 2));
  });
};

var createMusicFile = function() {
  var stream = fs.createWriteStream(MUSIC_PATH);
  stream.once('open', function() {
    console.log('Create file: %s', MUSIC_PATH);
    for (var genre in SONGS) {
      if (SONGS.hasOwnProperty(genre)) {
        // Write the genre headings.
        stream.write(Array(71).join('-') + '\n');
        stream.write(format('+ %s\n', genre.toUpperCase()));
        stream.write(Array(71).join('-') + '\n');

        // Write the individual songs.
        for (var subgenre in SONGS[genre]) {
          if (SONGS[genre].hasOwnProperty(subgenre)) {
            var songs = SONGS[genre][subgenre];
            songs.forEach(function(song) {
              stream.write(format('%s - %s\n', song.artist, song.title));
            });
          }
        }
        stream.write('\n');
      }
    }
  });
};

var createReadmeFile = function() {
  var stream = fs.createWriteStream(README_PATH);

  stream.once('open', function() {

    // Setup the README and write timestamp.
    var datetime = new Date();
    console.log('Create file: %s', README_PATH);
    stream.write('# music\n\n');
    stream.write(format('Generated on: %s\n\n', datetime.toLocaleString()));

    // Sort genres by total count.
    var genreList = Object.keys(SONGS).map(function(genre) {
      console.log(SONGS[genre]);
      return {
        genre: genre,
        songs: SONGS[genre],
        count: getGenreCount(SONGS[genre])
      };
    }).sort(function(a, b) {
      return a.count >= b.count ? -1 : 1;
    });

    // Write table of contents and total counts.
    genreList.forEach(function(genre) {
      stream.write(format('- [%s](%s) (%s)\n',
        genre.genre.toUpperCase(),
        getGithubReadmeLink(genre.genre),
        genre.count
      ));
    });

    // Write horizontal rule.
    stream.write('\n--\n');

    // Write songs for each genre.
    genreList.forEach(function(genre) {
      stream.write(format('\n\n## %s\n', genre.genre.toUpperCase()));

      for (var subgenre in genre.songs) {
        var songs = genre.songs[subgenre];
        stream.write(format('\n##### %s\n', subgenre.toUpperCase()));

        songs.forEach(function(song) {
          stream.write(format('- [%s - %s](%s)\n',
            song.artist, song.title, song.getYoutubeSearch()
          ));
        });
      }
    });
  });
};


/********************************************************************
* MAIN PROGRAM
*********************************************************************/
fs.readdir(GENRE_DIR, function(error, genres) {
  async.each(genres, function(genre, doneReading) {
    // Read each subgenre file and populate songs.
    populateGenre(genre, doneReading);
  },
  function(doneError) {
    if (doneError) {
      console.error(doneError);
    }
    else {
      // SONGS has been populated, so create files.
      // createJSONFile();
      // createMusicFile();
      createReadmeFile();
    }
  });
});
