import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dotenv from "dotenv";
dotenv.config();
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`Mongo connected ! DB HOST : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB connection failed:", error);
    }
}

export default connectDB;