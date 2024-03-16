const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const bodyParser = require('body-parser');

// 連接到 MongoDB 數據庫
mongoose.connect('mongodb://localhost:27017/exercisetrackerdb');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection fails!'));
db.once('open', function () {
    console.log('Connected to database...');
});


app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));


const { Schema } = mongoose;
const userSchema = new Schema({
    username: String
});
const exerciseSchema = new Schema({
    user_id: String,
    username: String,
    description: String,
    duration: Number,
    date: Date,
});


let User = mongoose.model('user', userSchema);
let Exercise = mongoose.model('exercise', exerciseSchema);


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  const {username} = req.body;
  
  const user = new User({
    username: username
  });
  
  try {
    const savedUser = await user.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }

});

app.get('/api/users', async (req, res) => {
  try {
    const data = await User.find({});
    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description } = req.body;
  const { duration } = req.body;
  const { date } = req.body;
  try {
    const user = await User.findById(req.params._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const exercise = new Exercise({
      user_id: _id,
      username: user.username,
      description: description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    const savedExercise = await exercise.save();
    res.json({
      username: savedExercise.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: _id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    console.log("LOGS", req.query?.from, req.query.to);
    let query = {
      user_id: req.params._id,
      from: req.query.from ? new Date(req.query.from) : undefined,
      to: req.query.to ? new Date(req.query.to) : undefined,
      limit: parseInt(req.query.limit)
    };
    console.log(query);

    const exerciseQuery = {
      user_id: query.user_id
    };

    if (query.from || query.to) {
      exerciseQuery.date = {};
      if (query.from) exerciseQuery.date.$gte = query.from;
      if (query.to) exerciseQuery.date.$lte = query.to;
    }

    let exercises = await Exercise.find(exerciseQuery)
                                   .limit(query.limit)
                                   .exec();

    console.log(exercises);
    const user = await User.findById(query.user_id);

    res.json({
      username: user.username,
      count: exercises.length,
      _id: query.user_id,
      log: exercises.map(v => ({
        description: v.description,
        duration: v.duration,
        date: v.date.toDateString()
      }))
    });
  } catch (err) {
    console.error('error', err);
    res.status(500).json(err);
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})