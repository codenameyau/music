/*!
 * github.com/codenameyau/music
 *
 * Description:
 * This scripts alphabetically sorts the songs in 'genre/'
 * and generates the files: 'music' and 'stats'. All operations
 * occur asynchronously either through callbacks or observers.
 */
'use strict';

// Dependencies.
var fs = require('fs');
var path = require('path');
var async = require('async');

// Constants and globals.
var PATH = path.resolve(__dirname);
var GENRE_DIR = PATH + '/genre/';
var MUSIC_PATH = PATH + '/music';
var SONGS = {};


/********************************************************************
* FUNCTION Constructors
*********************************************************************/
function Song(data) {
  this.artist = data[0];
  this.title = data[1];
}


/********************************************************************
* HELPER FUNCTIONS
*********************************************************************/
var alphabetize = function(data) {
  // Perform case-insensitive sort.
  data.sort(function(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });

  // Filter extra newlines.
  return data.filter(Boolean);
};

var alphabetizeSongs = function(genre, subgenre, doneGenre) {
  var filename = GENRE_DIR + genre + '/' + subgenre;

  fs.readFile(filename, 'UTF-8', function(error, data) {
    // Error trying to read file. Propagate error.
    if (error) { return doneGenre(error); }

    // Alphabetize and save the file.
    var songList = alphabetize(data.split('\n'));
    var stream = fs.createWriteStream(filename);
    stream.once('open', function() {
      songList.forEach(function(song) {
        stream.write(song + '\n');
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
    }, function(readError) {
      if (callback) {
        return callback(readError, doneReading);
      } doneReading(readError);
    });
  });
};

var createMusicFile = function() {
  var stream = fs.createWriteStream(MUSIC_PATH);
  stream.once('open', function() {
    console.log('Create file: music');
    for (var genre in SONGS) {
      if (SONGS.hasOwnProperty(genre)) {
        stream.write(Array(71).join('-') + '\n');
        stream.write('+ ' + genre.toUpperCase() + '\n');
        stream.write(Array(71).join('-') + '\n');

        for (var subgenre in SONGS[genre]) {
          if (SONGS[genre].hasOwnProperty(subgenre)) {
            var songs = SONGS[genre][subgenre];
            songs.forEach(function(song) {
              stream.write(song.artist + ' - ' + song.title + '\n');
            });
          }
        }
        stream.write('\n');
      }
    }
  });
};


/********************************************************************
* MAIN PROGRAM
*********************************************************************/
fs.readdir(GENRE_DIR, function(error, genres) {
  async.each(genres, function(genre, doneReading) {
    // Read each subgenre file and populate songs.
    populateGenre(genre, doneReading);
  }, function(doneError) {
    // SONGS has been populated, so create extra files.
    if (doneError) {
      console.log(doneError);
    } else {
      console.log('Finished alphabetizing songs');
      createMusicFile();
    }
  });
});
