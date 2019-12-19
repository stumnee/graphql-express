var createError = require('http-errors');
var express = require('express');
var expressGraphQL = require('express-graphql');
const {GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList, GraphQLNonNull} = require('graphql');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const songs = require('./store/songs');
const bands = require('./store/bands');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const BandType = new GraphQLObjectType({
  name: 'Band',
  description: 'Band',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt)},
    name: { type: GraphQLNonNull(GraphQLString)},
    albums: { type: GraphQLList(AlbumType)}
  })
});

const AlbumType = new GraphQLObjectType({
  name: 'Album',
  description: 'Album description',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt)},
    name: { type: GraphQLNonNull(GraphQLString)},
    band: {
      type: BandType,
      resolve: (item) => bands.find(band=>band.albums.find(album => album.id === item.id))

    }
  })
});

const SongType = new GraphQLObjectType({
  name: 'Song',
  description: 'Song',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt)},
    name: { type: GraphQLNonNull(GraphQLString) },
    albumId: { type: GraphQLNonNull(GraphQLInt) },
    album: {
      type: AlbumType,
      resolve: (song) => {
        let album = null;
        bands.forEach(band=>{
          album = band.albums.find(album=>album.id === song.albumId) || album
        });
        return album
      }
    }
  })
});

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  description: 'Root Query',
  fields: () => ({
    song: {
      type: SongType,
      description: 'A song',
      args: {
        id: { type: GraphQLInt}
      },
      resolve: (parent, args) => songs.find(song=>args.id === song.id)
    },
    songs: {
      type: GraphQLList(SongType),
      description: 'List of Playlist',
      resolve: () => songs
    },
    bands: {
      type: GraphQLList(BandType),
      description: 'List of Bands',
      resolve: () => bands
    },
    albums: {
      type: GraphQLList(AlbumType),
      description: 'List of Albums',
      resolve: () => {
        return bands.map(band => band.albums).flat()
      }
    }
  })
});

const RootMutationType = new GraphQLObjectType({
  name: 'Mutation',
  description: 'Mutation',
  fields: () => ({
    addSong: {
      type: SongType,
      args: {
        name: { type: GraphQLNonNull(GraphQLString) },
        albumId: {type: GraphQLNonNull(GraphQLInt) }
      },
      resolve: (parent, args) => {
        const song = {
          id: songs.length + 1,
          albumId: args.albumId,
          name: args.name
        };
        songs.push(song);
        return song
      }
    },
    editSong: {
      type: SongType,
      args: {
        id: { type: GraphQLNonNull(GraphQLInt) },
        name: { type: GraphQLString },
        albumId: {type: GraphQLInt }
      },
      resolve: (parent, args) => {
        const song = songs.find( song=>song.id === args.id);
        song.name = args.name || song.name;
        song.albumId = args.albumId || song.albumId;
        return song
      }
    },
    deleteSong: {
      type: SongType,
      args: {
        id: { type: GraphQLNonNull(GraphQLInt) }
      },
      resolve: (parent, args) => {
        let song = songs.find(song => song.id === args.id)
        songs.splice(songs.indexOf(song), 1);
        return song
      }
    }
  })

});

app.use('/graphql', expressGraphQL({
  schema: new GraphQLSchema({
    query: RootQueryType,
    mutation: RootMutationType
  }),
  graphiql: true
}));


app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
