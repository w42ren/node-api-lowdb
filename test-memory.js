// test-memory.js
// Simple test: starts mongodb-memory-server, connects mongoose, uses models/item.js to insert & read.

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  console.log('Memory MongoDB URI:', uri);

  try {
    // Connect mongoose
    await mongoose.connect(uri, {
      // driver v4 ignores useNewUrlParser/useUnifiedTopology; kept minimal
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ Mongoose connected to in-memory MongoDB');

    // Require the existing Item model which uses the mongoose instance
    const Item = require('./models/item');

    // Create & save
    const created = await Item.create({ name: 'MemoryServer test item' });
    console.log('Inserted item:', created);

    // Read back
    const docs = await Item.find().lean();
    console.log('Found items count:', docs.length);

    // Clean up mongoose models to avoid OverwriteModelError on re-run
    await mongoose.disconnect();
    await mongod.stop();
    console.log('✅ Test complete, stopped in-memory MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    try {
      await mongoose.disconnect();
      await mongod.stop();
    } catch {}
    process.exit(1);
  }
})();