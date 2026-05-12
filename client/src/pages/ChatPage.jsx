import { useState } from "react";

function ChatPage() {

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! I will help you complete your visa application."
    },
    {
      sender: "ai",
      text: "What is the purpose of your visit?"
    }
  ]);

  const [input, setInput] = useState("");

  const handleSend = () => {

    if (!input.trim()) return;

    const userMessage = {
      sender: "user",
      text: input
    };

    const aiMessage = {
      sender: "ai",
      text: "Thank you. Your response has been recorded."
    };

    setMessages([...messages, userMessage, aiMessage]);

    setInput("");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      <div className="bg-black text-white p-4 text-2xl font-bold">
        AI Visa Assistant
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4">

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl shadow max-w-md ${
              msg.sender === "user"
                ? "bg-black text-white ml-auto"
                : "bg-white"
            }`}
          >
            {msg.text}
          </div>
        ))}

      </div>

      <div className="p-4 bg-white border-t flex gap-4">

        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
        />

        <button
          onClick={handleSend}
          className="bg-black text-white px-6 rounded-xl"
        >
          Send
        </button>

      </div>

    </div>
  );
}

export default ChatPage;