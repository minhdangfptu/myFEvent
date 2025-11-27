import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/mongodb.js';

dotenv.config();

console.log('🔧 Fixing User Model Indexes...\n');

async function fixUserIndexes() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // List current indexes
    console.log('📋 Current indexes:');
    const currentIndexes = await usersCollection.listIndexes().toArray();
    currentIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    console.log('');

    // Drop problematic indexes if they exist
    const indexesToDrop = ['phone_1', 'googleId_1'];

    for (const indexName of indexesToDrop) {
      try {
        console.log(`🗑️  Dropping old ${indexName} index...`);
        await usersCollection.dropIndex(indexName);
        console.log(`   ✅ Dropped ${indexName}`);
      } catch (e) {
        console.log(`   ⚠️  ${indexName} not found or already correct`);
      }
    }
    console.log('');

    // Create proper indexes
    console.log('🔨 Creating proper indexes...');

    // Phone index with partial filter
    await usersCollection.createIndex(
      { phone: 1 },
      {
        unique: true,
        partialFilterExpression: { phone: { $type: 'string' } },
        name: 'phone_1_partial'
      }
    );
    console.log('   ✅ Created phone_1_partial');

    // GoogleId index with partial filter (sparse = true is implied by partialFilter)
    await usersCollection.createIndex(
      { googleId: 1 },
      {
        unique: true,
        partialFilterExpression: { googleId: { $type: 'string' } },
        name: 'googleId_1_partial'
      }
    );
    console.log('   ✅ Created googleId_1_partial');

    // Other indexes
    await usersCollection.createIndex({ status: 1 }, { name: 'status_1' });
    console.log('   ✅ Created status_1');

    await usersCollection.createIndex({ role: 1 }, { name: 'role_1' });
    console.log('   ✅ Created role_1');

    await usersCollection.createIndex({ verified: 1 }, { name: 'verified_1' });
    console.log('   ✅ Created verified_1');

    await usersCollection.createIndex({ authProvider: 1 }, { name: 'authProvider_1' });
    console.log('   ✅ Created authProvider_1');

    console.log('\n📋 Final indexes:');
    const finalIndexes = await usersCollection.listIndexes().toArray();
    finalIndexes.forEach(idx => {
      const uniqueTag = idx.unique ? '[UNIQUE]' : '';
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)} ${uniqueTag}`);
    });

    console.log('\n✅ User indexes fixed!\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

fixUserIndexes();
