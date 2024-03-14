const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const bodyParser = require('body-parser');

// 連接到 MongoDB 數據庫
mongoose.connect('mongodb://localhost:27017/exercisetrackerdb');
const db = mongoose.connection;

// 監聽連接錯誤
db.on('error', console.error.bind(console, 'Connection fails!'));

// 一旦成功連接，顯示成功訊息
db.once('open', function () {
    console.log('Connected to database...');
});

// 使用中間件
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

// 建立使用者和運動記錄的模式
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

// 建立使用者和運動記錄的模型
let User = mongoose.model('user', userSchema);
let Exercise = mongoose.model('exercise', exerciseSchema);

// 處理根路由
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  let userName = req.body.username;
  
  let user = new User({
    username: userName
  });
  

  try {
    const savedUser = await user.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }

});

app.get('/api/users', async (_, res) => {
  try {
    const data = await User.find({});
    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

app.post("/api/users/:_id/exercises", (req, res) => {
  User.findById({_id: req.params._id}, (err, user) => {
    if (err) {
      console.log(err);
      res.json(err);
    } else {
      let exercise = new Exercise({
        user_id: req.params._id,
        username: user.username,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: req.body.date ? new Date(req.body.date) : new Date(),
      })

      exercise.save((err, data) => {
        if (err) {
          console.log(err);
          res.json(err);
        } else {
          res.json({
            username: data.username,
            description: data.description,
            duration: data.duration,
            date: data.date.toDateString(),
            _id: req.params._id
          });
        }
      })
    }
  });
})

app.get('/api/users/:_id/logs', (req, res) => {
  console.log("LOGS", req.query?.from, req.query.to);
  let query = {
    user_id: req.params._id,
    from: new Date(req.query?.from),
    to: new Date(req.query?.to),
    limit: req.query.limit
  }
  console.log(query);
  Exercise.find(
    {
      user_id: query.user_id,
        ...((req.query.to || req.query.from) && {date: {
        ...(req.query.from && {$gte: query.from}), 
        ...(req.query.to && {$lte: query.to})
      }})
    })
        .limit(query.limit)
        .exec((err, exercise) => {
          if (err) {
            console.log('error', err);
            res.json(err);
          } else {
            console.log(exercise);
            console.log(exercise.username);
            User.findById(query.user_id, (err, user)=>{
              res.json({
                username: user.username,
                count: Object.keys(exercise).length,
                _id: query.user_id,
                log: exercise.map(v => ({
                        description: v.description,
                        duration: v.duration,
                        date: v.date.toDateString()
                  }))
              });
            })
          }
        })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})