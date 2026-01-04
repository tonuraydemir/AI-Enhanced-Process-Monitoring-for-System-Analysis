const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/process-monitor';

    mongoose.connection.on('connecting', () => console.log('Mongoose connecting...'));
    mongoose.connection.on('connected', () => {
        const dbName = mongoose.connection.name || '(unknown)';
        console.log(`MongoDB connected successfully (db: ${dbName})`);
    });
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 20000,
            maxPoolSize: 10
        });
        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

module.exports = connectDB;