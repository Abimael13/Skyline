"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    arrayUnion
} from "firebase/firestore";

interface Message {
    text: string;
    isBot: boolean;
    timestamp: any;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { text: "Hi there! 👋 How can we help you with your fire safety training today?", isBot: true, timestamp: Date.now() }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Load conversation from local storage or create new listener
    useEffect(() => {
        const storedId = localStorage.getItem("chat_conversation_id");
        if (storedId) {
            setConversationId(storedId);
        }
    }, []);

    // Listen for updates
    useEffect(() => {
        if (!conversationId) return;

        const unsub = onSnapshot(doc(db, "conversations", conversationId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.messages) {
                    setMessages(data.messages);
                }
            }
        });

        return () => unsub();
    }, [conversationId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue("");

        // Optimistic update
        const newMessage = { text: userText, isBot: false, timestamp: Date.now() };

        try {
            let currentId = conversationId;

            if (!currentId) {
                // Create new conversation
                const docRef = await addDoc(collection(db, "conversations"), {
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    status: 'new',
                    userEmail: '',
                    messages: [
                        { text: "Hi there! 👋 How can we help you with your fire safety training today?", isBot: true, timestamp: Date.now() },
                        newMessage
                    ],
                    lastMessage: userText
                });
                currentId = docRef.id;
                setConversationId(currentId);
                localStorage.setItem("chat_conversation_id", currentId);
            } else {
                // Update existing
                const docRef = doc(db, "conversations", currentId);
                await updateDoc(docRef, {
                    messages: arrayUnion(newMessage),
                    lastMessage: userText,
                    updatedAt: serverTimestamp(),
                    status: 'new' // Re-open if it was archived
                });
            }

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <>
            {/* Chat Bubble Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-900/20 hover:bg-blue-500 hover:scale-110 transition-all duration-300 ${isOpen ? 'hidden' : 'flex'}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ rotate: 10 }}
            >
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20" />
                <MessageCircle size={28} />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-6 right-6 z-50 w-[350px] md:w-[400px] h-[500px] bg-navy-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                    <MessageCircle size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Skyline Support</h3>
                                    <p className="text-blue-100 text-xs flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                        We typically reply in 5m
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-navy-950">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.isBot
                                                ? 'bg-navy-800 text-slate-200 rounded-tl-none border border-white/5'
                                                : 'bg-blue-600 text-white rounded-tr-none'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-navy-900 border-t border-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Type a message..."
                                    className="w-full bg-navy-950 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
