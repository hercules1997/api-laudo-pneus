import mongoose from 'mongoose';
mongoose.set('bufferCommands', false);
let connecting;
export async function connectDatabase(uri = process.env.MONGO_URI || process.env.MONGO_URL) {
  if (!uri) throw new Error('Configure MONGO_URI no .env.');
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 0
    }).then(() => mongoose.connection).finally(() => { connecting = undefined; });
  }
  return connecting;
}
