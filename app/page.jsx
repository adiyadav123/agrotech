"use client";

import MidWidget from "@/components/MidWidget";
import Navbar from "@/components/Navbar";
import { React, useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import moment from "moment"; // For timestamp formatting
const { GoogleGenerativeAI } = require("@google/generative-ai");

const HomePage = () => {
  const [name, setName] = useState("");
  const { user } = useUser();
  const [noPrompt, setNoPrompt] = useState(false);
  const [inputText, setInputText] = useState(""); // State to capture input text
  const [chatHistory, setChatHistory] = useState([]); // State to store chat messages
  const [loading, setLoading] = useState(false); // State to manage loading state
  const [imageInlineData, setImageInlineData] = useState(''); // For storing base64 image data
  const chatEndRef = useRef(null); // Reference to the end of chat for auto-scrolling

  useEffect(() => {
    if (user != null) {
      setName(user.firstName);
    }
  }, [user]);

  // Scroll to the bottom of the chat when a new message is added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Function to parse formatted text
  const parseFormattedText = (text) => {
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
      .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // Links
      .replace(/- (.*?)/g, "<li>$1</li>") // Unordered list
      .replace(/1\. (.*?)/g, "<li>$1</li>"); // Ordered list
    return formattedText
      .replace(/<li>/g, "<li style='margin: 5px 0;'>") // Add margin to list items
      .replace(/<\/li>/g, "</li>"); // Close list items
  };

  // Handle sending message
  const handleSend = async () => {
    if (inputText.trim()) {
      // Create a new chat message object
      const newMessage = {
        role: "user", // User's message
        parts: [
          {
            text: inputText,
          },
        ],
      };

      setChatHistory((prevHistory) => [...prevHistory, newMessage]);

      // Clear the input field after sending the message
      setInputText("");

      setLoading(true); // Set loading state to true

      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
        const genAi = new GoogleGenerativeAI(apiKey);

        const systemInstruction =
          "You are Agritech AI, created to assist farmers in making smarter decisions about their crops and farming practices. By analyzing key factors like soil type, weather conditions, and market trends, you provide farmers with simple, clear recommendations on which crops to grow, the best times to plant and harvest, and ways to farm sustainably. Your goal is to help farmers boost their crop yields, reduce waste, and earn more profit, all while protecting the environment and using resources wisely. Give short and concise answers to the user's questions.";

        const generationConfig = {
          temperature: 1,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain",
        };

        const model = genAi.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: systemInstruction,
        });

        // Get AI response
        const chatSession = model.startChat({
          generationConfig,
          history: chatHistory,
        });

        const result = await chatSession.sendMessageStream(inputText);
        let res = (await result.response).text();

        const aiResponse = {
          role: "model", // Changed to model as per requirement
          parts: [
            {
              text: res,
            },
          ],
        };

        // Update the chat history with the AI response
        setChatHistory((prevHistory) => [...prevHistory, aiResponse]);
      } catch (error) {
        console.error("Error generating AI response:", error);
      } finally {
        setLoading(false); // Set loading state to false
      }
    }
  };

  // Function to convert image to base64
  const handleImageSend = async (e) => {
    const file = e.target.files[0];

    // Ensure the file is valid
    if (!file) return;

    try {
      setLoading(true); // Set loading while processing the image

      // Convert file to base64
      const base64Data = await fileToGenerativePart(file);
      setImageInlineData(base64Data.inlineData.data); // Store base64 data

      // Create a new message indicating image upload
      const newMessage = {
        role: "user",
        parts: [
          {
            text: "Image uploaded, analyzing...",
          },
        ],
      };
      setChatHistory((prevHistory) => [...prevHistory, newMessage]);

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
      const genAi = new GoogleGenerativeAI(apiKey);

      // Generate AI image insights
      const model = genAi.getGenerativeModel({ model: "gemini-pro-vision" });
      const result = await model.generateContent(["Analyze this image:", base64Data.inlineData.data]);

      const responseText = await result.response.text();

      // Add AI's image analysis to the chat history
      const aiResponse = {
        role: "model",
        parts: [
          {
            text: responseText,
          },
        ],
      };

      setChatHistory((prevHistory) => [...prevHistory, aiResponse]);
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setLoading(false); // Set loading state to false
    }
  };

  // Converts a File object to a GoogleGenerativeAI.Part object.
  async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });

    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  return (
    <main>
      <Navbar />
      <div className="half_page">
        {noPrompt ? (
          <>
            <MidWidget
              title="Question"
              description="What crops are best for my soil?"
            />
            <div className="w-[10px]"></div>
            <MidWidget
              title="Question"
              description="How can I protect my crops from pests?"
            />
            <div className="w-[10px]"></div>
            <MidWidget
              title="Question"
              description="When should I plant and harvest my crops?"
            />
          </>
        ) : (
          <div className="chatView">
            {chatHistory.length === 0 ? (
              <p>No messages yet</p>
            ) : (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`message ${
                    message.role === "user" ? "userMessage" : "aiMessage"
                  }`}
                >
                  <div className="messageContent">
                    <span
                      className="text"
                      dangerouslySetInnerHTML={{
                        __html: message.parts[0].text
                          ? parseFormattedText(message.parts[0].text)
                          : "",
                      }}
                    ></span>
                    <span className="timestamp">
                      {moment(message.timestamp).format("h:mm A")}
                    </span>
                  </div>
                </div>
              ))
            )}
            {loading && <div className="loading">Typing...</div>}{" "}
            {/* Loading animation */}
            <div ref={chatEndRef} /> {/* Empty div for auto-scroll to bottom */}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center">
        <div className="input">
          <input
            placeholder="Enter a prompt here"
            value={inputText} // Bind input value to state
            onChange={(e) => setInputText(e.target.value)} // Update inputText state on change
          ></input>
          <div className="send">
            <input
              type="file"
              id="file"
              name="file"
              accept="image/*"
              className=" hidden"
              onChange={handleImageSend} // Call handleImageSend when file is selected
            />
            <label htmlFor="file">
              <img
                src="https://cdn-icons-png.flaticon.com/128/3342/3342137.png"
                height={25}
                width={25}
              />
            </label>

            <div className="w-[10px]"></div>

            <button
              type="submit"
              className="send-button"
              onClick={handleSend} // Call handleSend function on button click
            >
               →
            </button>
          </div>
        </div>
      </div>
      
      {/* Styling for chat layout */}
      <style jsx>{`
        .chatView {
          padding: 10px;
          height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .message {
          display: flex;
          margin: 10px 0;
          max-width: 100%;
          height: auto;
          background: red;
          padding: 10px;
          border-radius: 10px;
        }

        .userMessage {
          background-color: #333; /* Dark background for user messages */
          color: white;
          align-self: flex-end; /* Align user messages to the right */
        }

        .aiMessage {
          background-color: #555; /* Slightly lighter background for AI messages */
          color: white;
          align-self: flex-start; /* Align AI messages to the left */
        }

        .loading {
          align-self: flex-start; /* Align loading indicator to the left */
          color: gray; /* Color for loading text */
          font-style: italic;
        }

        .messageContent {
          display: flex;
          flex-direction: column;
        }

        .text {
          margin-bottom: 5px;
        }

        .timestamp {
          font-size: 0.8em;
          color: #ccc;
          text-align: right;
        }

        .send {
          display: flex;
          align-items: center;
          margin-left: 10px;
        }
      `}</style>
    </main>
  );
};

export default HomePage;
