const express = require('express'),
      bodyParser = require('body-parser'),
      morgan = require('morgan'),
      uuid = require('uuid'),
      mongoose = require('mongoose'),
      Models = require('./models.js'); // Import local Models.js file

const app = express();
const Movies = Models.Movie;
const Users = Models.User;

// connection to mongoose DB
mongoose.connect(process.env.CONNECTION_URI,{
   useNewUrlParser: true,
   useUnifiedTopology: true,
   dbName: "myFlixDB" },
   () => {console.log('connected to DB!')
});

app.use(morgan('common'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));


/**
 *  CORS restricted to only "allowedOrigins" below and not open to ALL
 *  Origins list constantly updated during the Full Stack Development course
 * 
 */

const cors = require('cors');
let allowedOrigins = ['http://localhost:8080','http://localhost:4200', 'http://testsite.com',
 'http://localhost:1234', 'https://at-myflix-app.netlify.app', 'https://andrew0t.github.io' ];

app.use(cors(
{
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}
));

/**
 * Authorization requires validation
 * Passport generated in the passport.js file 
 * 
 */

let auth = require('./auth.js')(app); // Imports local auth file
const passport = require('passport');
require('./passport.js'); // Imports local passport file

const { check, validationResult } = require('express-validator');

/**
 * GET welcome text from '/' endpoint
 */
app.get('/', (req, res) => {
 res.send('Welcome to myFlix App')
});


/**
 * POST new user if no matching user found in user JSON
 * Username, Password, Email and Birthday are required fields
 * Password hashed
 * @name createUser
 * @kind function
 * @returns new user object
 */
app.post('/users',
  // Validation requirements of data input 
  [ 
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {

  let errors = validationResult(req);     // check the validation object for errors

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);

    Users.findOne({ Username: req.body.Username })    // Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users.create({
              Username: req.body.Username,
              Password: hashedPassword,
              Email: req.body.Email,
              Birthday: req.body.Birthday
            })
            .then((user) => { res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });


/**
 * GET user from user JSON
 * Username and password are required fields 
 * @name getUser
 * @kind function
 * @requires passport
 * @returns user object
 */
app.get('/users',
 passport.authenticate('jwt', { session: false }),
 (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
  })
  .catch((err) => {console.error(err);
    res.status(500).send("error:" + err);
  });
});

/**
 * GET user by Username
 * Username and password are required fields
 * @name getUser
 * @kind function
 * @requires passport
 * @returns user object
 */
app.get('/users/:Username',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
  Users.findOne({Username: req.params.Username })
    .then((user) => {
      res.json(user);
  })
  .catch((err) => {console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

/**
* GET the list of ALL movies from JSON
* @name getMovies
* @kind function
* @param {string} movies
* @requires passport
* @returns array of movie objects
*/
app.get('/movies',
  passport.authenticate('jwt', { session: false}),
  (req, res) => {
  Movies.find()
  .then((movies) => {
  res.status(201).json(movies);
})
.catch((err) => {console.error(err);
    res.status(500).send('Error: ' + err);
  });
});


/**
* GET one movie by Title
* @name getMovies/Title
* @kind function
* @param {string} movieTitle
* @requires passport
* @returns array of movie objects
*/
app.get('/movies/:Title',
  passport.authenticate('jwt', { session: false}),
  (req, res) => {
  Movies.findOne({'Title': req.params.Title })
    .then((movie) => {
      res.json(movie);
  })
.catch((err) => {console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

/**
* GET the movie genre by Name
* @name getGenre
* @kind function
* @param {string} genreName
* @requires passport
* @returns array of movie objects
*/
app.get('/movies/genres/:Name',
  passport.authenticate('jwt', { session: false}),
  (req, res) => {
  Movies.findOne({'Genre.Name': req.params.Name })
    .then((movie) => {
      res.json(movie.Genre);
  })
  .catch((err) => {console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

/**
* GET the director by Name
* @name getDirector
* @kind function
* @param {string} directorName
* @requires passport
* @returns array of movie objects
*/

app.get('/movies/directors/:Name',
  passport.authenticate('jwt', { session: false}),
  (req, res) => {
  Movies.findOne({'Director.Name': req.params.Name })
    .then((movie) => {
      res.json(movie.Director);
  })
  .catch((err) => {console.error(err);
    res.status(500).send('Error: ' + err);
  });
});


/**
 * PUT update user data.
 * Checks Username, Password, Email and Birthday fields
 * @name updateUser
 * @kind function
 * @param {string} Username
 * @requires passport
 * @returns updated user object
 */
app.put('/users/:Username',
  passport.authenticate('jwt', { session: false}),
  (req, res) => {

  let hashedPassword = Users.hashPassword(req.body.Password);

  Users.findOneAndUpdate({Username: req.params.Username},
    { $set:
      {
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        Birthday: req.body.Birthday
      }
    },
    { new: true},
    (err, updatedUser)=> {
    if (err) {
      console.error(err);
      res.status(500).send('Error:' + err);
  } else {
    res.json(updatedUser);
  }
  });
});

/**
* POST movie to user's list of favorites
* @name addFavoriteMovie
* @kind function
* @param {string} Username
* @param {string} MovieID
* @requires passport
* @returns updated user object with newly added movie to user's list of favorites
*/
app.post('/users/:Username/movies/:MovieID',
    passport.authenticate('jwt', { session: false}),
    (req, res) => {
    Users.findOneAndUpdate({ Username: req.params.Username },
      { $push: { FavoriteMovies: req.params.MovieID }
    },
    { new: true},
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error:' + err);
      }else{
        res.json(updatedUser);
      }
    });
  });

/**
* DELETE movie from user's list of favorites
* @name addFavoriteMovie
* @kind function
* @param {string} username
* @param {string} movie ID
* @requires passport
* @returns updated user object with newly added movie to user's list of favorites
*/
app.delete('/users/:Username/movies/:MovieID',
  passport.authenticate('jwt', { session: false}),
  (req, res) => {
    Users.findOneAndUpdate({ Username: req.params.Username },
      { $pull: { FavoriteMovies: req.params.MovieID }
    },
     { new: true},
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error:' + err);
      }else{
        res.json(updatedUser);
      }
    });
  });

/**
* DELETE user from user JSON
* @name deleteUser
* @kind function
* @param {string} Username
* @requires passport
* @returns a message after deletion
*/
app.delete('/users/:Username',
  passport.authenticate('jwt', { session: false}),
  (req, res) => {
  Users.findOneAndRemove({Username: req.params.Username})
  .then((user) =>{
  if (!user) {
    res.status(400).send(req.params.Username +' was not found.');
  } else {
    res.status(200).send(req.params.Username + ' was deleted.');
    }
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

// get api documentation at /doumentation
app.get( '/documentation', (req, res) => {
        res.sendFile('public/documentation.html', { root: __dirname });
  });

// error handling middleware function

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('There was an error. Please try again.');
});

// listen for requests

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
  console.log('Listening on Port ' + port);
});
