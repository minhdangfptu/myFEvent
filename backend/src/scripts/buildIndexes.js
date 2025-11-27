import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/mongodb.js';

// Load environment variables
dotenv.config();

// Import all models to register indexes
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';
import Department from '../models/department.js';
import Milestone from '../models/milestone.js';
import Calendar from '../models/calendar.js';

console.log('🔧 Building MongoDB Indexes...\n');

async function buildIndexes() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // List of models to process
    const models = [
      { name: 'Event', model: Event },
      { name: 'EventMember', model: EventMember },
      { name: 'User', model: User },
      { name: 'Department', model: Department },
      { name: 'Milestone', model: Milestone },
      { name: 'Calendar', model: Calendar }
    ];

    console.log('🔨 Building indexes for each model...\n');

    let totalIndexes = 0;

    for (const { name, model } of models) {
      try {
        console.log(`📦 Processing: ${name}`);
        const startTime = Date.now();

        // Build indexes
        await model.ensureIndexes();
        const duration = Date.now() - startTime;

        // Get indexes info
        const indexes = await model.collection.listIndexes().toArray();
        totalIndexes += indexes.length;

        console.log(`   ✅ Built ${indexes.length} indexes in ${duration}ms`);
        indexes.forEach(idx => {
          const uniqueTag = idx.unique ? '[UNIQUE]' : '';
          const textTag = idx.textIndexVersion ? '[TEXT]' : '';
          console.log(`      - ${idx.name}: ${JSON.stringify(idx.key)} ${uniqueTag}${textTag}`);
        });
        console.log('');

      } catch (error) {
        console.error(`   ❌ Error building indexes for ${name}:`, error.message);
        console.log('');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Models: ${models.length}`);
    console.log(`Total Indexes Built: ${totalIndexes}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Index building completed!\n');

    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
buildIndexes();
