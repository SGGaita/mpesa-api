const express = require("express");

const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000

//app configurations
app.use(express.json());
app.use(express.urlencoded({extended:true}));

//adding middleware - cors
app.use(cors());

//route.
const mpesa = require('./routes/index');
 //listening to a specific route
app.use('/',mpesa);

app.get('/api', (req, res) => {
    res.send('Hello Uabiri Sacco!')
  })


app.listen(port, ()=>{
    console.log(`Server app is running at localhost:${port}`)
})