const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3000;

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'surveydb',
  password: '12345',
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve css and js files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the page 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));

});






// Get the question
app.get('/question/:id', async (req, res) => {
  const questionId = req.params.id;
  try {
    const questionResult = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
    const optionsResult = await pool.query('SELECT * FROM options WHERE question_id = $1', [questionId]);
   
    res.json({
      question: questionResult.rows[0],
      options: optionsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving question');
  }
});

// Handle form submission and get next question
app.post('/submit', async (req, res) => {
  const { questionId,id,option_id} = req.body;

  try {
    console.log(option_id);
    await pool.query('INSERT INTO answers (question_id,user_id,option_id) VALUES ($1, $2,$3)', [questionId,id,option_id]);
    const nextQuestionResult = await pool.query('SELECT next_question_id FROM options WHERE question_id = $1 AND id= $2', [questionId, option_id]);
    


    if(nextQuestionResult.rows[0].next_question_id!==null){
      const nextQuestionId = nextQuestionResult.rows[0].next_question_id
      await pool.query('UPDATE users SET status =$1 WHERE id = $2', [nextQuestionId,id]);
      res.json({ next:true,nextQuestionId ,id});
    }else{
    
      const result = await pool.query('SELECT SUM(options.score) FROM answers inner join options on answers.option_id = options.id where answers.user_id = $1', [id]);
     
       await pool.query('UPDATE users SET score =$1 ,status=0 WHERE id = $2', [result.rows[0].sum,id]);
      const score = result.rows[0].sum
      res.json({ next:false,score ,id});
    }
  
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving answer');
  }
});

app.post('/submitUser', async (req, res) => {
  const { name,email,phone} = req.body;

  try {
    const user =await pool.query('SELECT * FROM users WHERE username=$1 AND email =$2 AND phone = $3', [name,email,phone]);
    
      // console.log(user.rows[0].score);
      if(user.rows.length!==0){
      res.json({ user:true,score: user.rows[0].score,status:user.rows[0].status,id:user.rows[0].id});
    }else{
   const user = await pool.query('INSERT INTO users (username,email,phone) VALUES ($1, $2,$3) RETURNING id', [name,email,phone]);
    
    res.json({ user:false,id:user.rows[0].id});
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving answer');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
