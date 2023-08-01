const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const  express=require('express')
const router=require('./routes/userRoute')
const auth = require("./middleware/auth");


const app=express()
const port = process.env.PORT || 5000;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/api',router)
app.use('/uploads', express.static('./uploads'));



//
dotenv.config({path: './config.env' });
const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
  );


mongoose
  .connect(DB, )
  .then(() => console.log('DB connection successful!'));

//middleware  
app.post("/api/hello", auth, (req, res) => {
    res.status(200).send("Hello 🙌 ");
});
app.get('/',(req,res)=>{
    res.send({message:'hello world'})

})


app.listen(port,()=>{
    console.log(`app is lisrening on ${port} !`)
})