const JWT = require("jsonwebtoken");
const { User } = require("../models/userModel");

const verify=(req,res,next)=>{
    const token=
        req.body.token || req.query.token || req.headers["x-access-token"];
    if (!token){
        return res.status(403).send('A token is required for authentication');
    }
    try{
        const decoded=JWT.verify(token,process.env.TOKEN_SECRET_KEY)
        req.user=decoded;
    }catch(err){
        res.status(401).send(err)
    }
    return next()
    
}
module.exports=verify;