require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');
        console.log('Connection string:', process.env.MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('✅ MongoDB connected successfully!');
        console.log('Database name:', mongoose.connection.name);
        console.log('Host:', mongoose.connection.host);

        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nExisting collections:', collections.map(c => c.name));

        await mongoose.disconnect();
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();