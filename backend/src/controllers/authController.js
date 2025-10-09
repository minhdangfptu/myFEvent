import User from '../models/user.js';
import AuthToken from '../models/authToken.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { OAuth2Client } from 'googleapis';

const signup = async (req,res) => {
    try {
        const {email, password, fullName, phone} = req.body;

    const existing_email = await User.findOne({email});
    if(existing_email) {
        return res.status(400).json({message: 'Email already exists!'});
    }
    const existing_phone = await User.findOne({phone});
    if(existing_phone) {
        return res.status(400).json({message: 'Phone number already exists!'});
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
        email,
        passwordHash,
        fullName,
        phone
    });

    await newUser.save();
    return res.status(201).json({message: 'User created successfully!'});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: 'Fail to signup!'});
    }
}


export { signup };