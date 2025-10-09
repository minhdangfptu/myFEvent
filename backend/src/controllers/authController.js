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

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password!' });
        }
        
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password!' });
        }
        
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        
        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
        
        const authToken = new AuthToken({
            userId: user._id,
            token: refreshToken,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        
        await authToken.save();
        
        return res.status(200).json({
            message: 'Login successful!',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                roles: user.roles
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Fail to login!' });
    }
};


export { signup, login, loginWithGoogle };