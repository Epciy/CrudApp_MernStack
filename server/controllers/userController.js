const {User,validate}=require('../models/userModel');
const JWT=require("jsonwebtoken");
const bcrypt=require('bcrypt');
const {encrypt,decrypt}=require('../utils/confirmation');
const nodemailer=require('nodemailer');
const {google}=require('googleapis');
const OAuth2=google.auth.OAuth2

const createTransporter=async()=>{
    const oauth2Client = new OAuth2(
        "{{OAUTH_CLIENT_ID}}",
        "{{OAUTH_CLIENT_SECRET}}",
        "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({
        refresh_token: "{{OAUTH_REFRESH_TOKEN}}",
    });
    const accessToken=await new Promise((resolve,reject)=>{
        oauth2Client.getAccessToken((err,token)=>{
            if (err){
                reject()
            }
            resolve(token);
        });
    })
    const Transport=nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: "{{GMAIL_EMAIL}}",
            accessToken,
            clientId: "{{OAUTH_CLIENT_ID}}",
            clientSecret: "{{OAUTH_CLIENT_SECRET}}",
            refreshToken: "{{OAUTH_REFRESH_TOKEN}}",
        },
    });
    return Transport;
};

const sendEmail=async({email,username,res})=>{
    const confirmationToken=encrypt(username);
    const apiUrl=process.env.API_URL || "http://0.0.0.0:4000";
    const Transport=await createTransporter();

    // Configure the email options
    const mailOptions = {
        from: "Crud App",
        to: email,
        subject: "Email Confirmation",
        html: `Press the following link to verify your email: <a href=${apiUrl}/confirmation/${confirmationToken}>Verification Link</a>`,
    };
     
    // Send the email
    Transport.sendMail(mailOptions, function (error, response) {
        if (error) {
        res.status(400).send(error);
        } else {
        res.status(201).json({
            message: "Account created successfully, please verify your email.",
        });
        }
    });
}

exports.verifyEmail=async(req,res)=>{
    try{
        //get the confirmation token 
        const {confirmationToken}=req.params;
        // Decrypt the username
        const username=decrypt(confirmationToken);

        // Check if there is anyone with that username
        const user= await User.findOne({username:username});
        if (user){

            // If there is anyone, mark them as confirmed account
            user.isConfirmed=true;
            await user.save();

            // Return the created user data
            res
            .status(201)
            .json({
                message: "User verified successfully",
                data: user
            })
        }else{
            return res.status(409).send('User not found')
        }

    }catch(err){
        console.error(err)
    }
}
exports.signup=async(req,res)=>{
    try{
        const {error}=validate(req.body);
        if (error){
            return res.status(400).send(error.details[0].message);
        }
        const {firstName,lastName,username,email,password}=req.body
        const oldUser=await User.findOne({email})
        if (oldUser){
            return res.status(400).send("User Already Exist. Please Login")

        }
        // Hash the password
        const salt=await bcrypt.genSalt(Number(process.env.SALT));
        const hashedPassword= await bcrypt.hash(password,salt);

        // Create an user object
        let user=User.create({
            firstName,
            lastName,
            username,
            email:email.toLowerCase(),
            password:hashedPassword
        });
        //create the user token
        const token=JWT.sign(
            {userId:user._id,email},
            process.env.TOKEN_SECRET_KEY,
            {
                expiresIn:'2h',
            },
        );
        user.token=token;
        res.status(201).json(user);




    }catch(err){
        console.error(err)
    }
};

exports.login=async(req,res)=>{
    try{
        const {emailOrUsername , password}=req.body;
        if (!(emailOrUsername && password)){
            res.status(401).send('All data are required');

        }
        // A regex expression to test if the given value is an email or username
        let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        const data=regexEmail.test(emailOrUsername)
        ?
        {
            email:emailOrUsername
        }:{
            username:emailOrUsername
        }
        const user= await  User.findOne(data);
        if (user && ( await bcrypt.compare(password,user.password))){
            const email=user.email;
            const token =JWT.sign(
                {user_id:user._id,email},
                process.env.TOKEN_SECRET_KEY,
                {
                    expiresIn:"2h"
                },

            );
            // save token
            user.token=token;
            //user
            await user.save();
            res.status(200).json(user)
            
        }
        //res.status(400).send("Invalid Credentials");

    }catch (err) {
        console.error(err)
        //res.status(400).send(err)
        
    }
    
}