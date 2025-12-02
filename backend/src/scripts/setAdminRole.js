import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/mongodb.js';
import User from '../models/user.js';

dotenv.config();

console.log('🔧 Setting Admin Role for User...\n');

async function setAdminRole() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line arguments
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Please provide an email address as argument');
      console.log('Usage: node setAdminRole.js <email>');
      process.exit(1);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`📋 Found user: ${user.fullName} (${user.email})`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   Status: ${user.status}\n`);

    if (user.role === 'admin') {
      console.log('✅ User already has admin role');
      process.exit(0);
    }

    // Update role to admin
    user.role = 'admin';
    await user.save();

    console.log('✅ Successfully set admin role for user');
    console.log(`   New role: ${user.role}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setAdminRole();


