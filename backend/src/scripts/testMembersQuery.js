import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/mongodb.js';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';
import Department from '../models/department.js';

dotenv.config();

const TEST_EVENT_ID = '6925975af139169420dd14c2';

console.log('🧪 Testing Members Query Performance...\n');

async function testQuery() {
  try {
    await connectDB();

    console.log('Test 1: Find EventMembers (no populate)');
    console.time('Query 1');
    const members = await EventMember.find({
      eventId: TEST_EVENT_ID,
      status: { $ne: 'deactive' }
    }).lean();
    console.timeEnd('Query 1');
    console.log(`Found: ${members.length} members\n`);

    console.log('Test 2: Populate userId only (WITHOUT avatarUrl)');
    console.time('Query 2');
    const membersWithUsers = await EventMember.find({
      eventId: TEST_EVENT_ID,
      status: { $ne: 'deactive' }
    })
    .populate({ path: 'userId', select: 'fullName email' }) // Removed avatarUrl to test fix
    .lean();
    console.timeEnd('Query 2');
    console.log(`Found: ${membersWithUsers.length} members\n`);

    console.log('Test 3: Populate departmentId only');
    console.time('Query 3');
    const membersWithDepts = await EventMember.find({
      eventId: TEST_EVENT_ID,
      status: { $ne: 'deactive' }
    })
    .populate({ path: 'departmentId', select: 'name' })
    .lean();
    console.timeEnd('Query 3');
    console.log(`Found: ${membersWithDepts.length} members\n`);

    console.log('Test 4: Populate both (FULL QUERY - WITHOUT avatarUrl)');
    console.time('Query 4');
    const membersWithBoth = await EventMember.find({
      eventId: TEST_EVENT_ID,
      status: { $ne: 'deactive' }
    })
    .populate([
      { path: 'userId', select: 'fullName email' }, // Removed avatarUrl to test fix
      { path: 'departmentId', select: 'name' }
    ])
    .sort({ createdAt: -1 })
    .lean();
    console.timeEnd('Query 4');
    console.log(`Found: ${membersWithBoth.length} members\n`);

    // Check indexes
    console.log('📊 Checking indexes...\n');

    console.log('EventMember indexes:');
    const emIndexes = await EventMember.collection.listIndexes().toArray();
    emIndexes.forEach(idx => console.log(`  - ${idx.name}`));

    console.log('\nUser indexes:');
    const userIndexes = await User.collection.listIndexes().toArray();
    userIndexes.forEach(idx => console.log(`  - ${idx.name}`));

    console.log('\nDepartment indexes:');
    const deptIndexes = await Department.collection.listIndexes().toArray();
    deptIndexes.forEach(idx => console.log(`  - ${idx.name}`));

    await mongoose.connection.close();
    console.log('\n✅ Test completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testQuery();
