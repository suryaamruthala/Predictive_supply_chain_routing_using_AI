import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/chat", async (req, res) => {
    try {
        const { message } = req.body;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const result = await model.generateContent(message);

        res.json({ reply: result.response.text() });

    } catch (err) {
        console.error("ERROR:", err);
        res.json({ reply: "⚠️ AI error — check config" });
    }
});

app.listen(5000, () => {
    console.log("🚀 Gemini Backend Running on 5000");
});