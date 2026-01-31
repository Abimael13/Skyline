"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    serverTimestamp
} from "firebase/firestore";
import { MessageCircle, User, Loader2, Send, CheckCircle } from "lucide-react";

interface Message {
    text: string;
    isBot: boolean;
    timestamp: any;
}

interface Conversation {
    id: string;
    lastMessage: string;
    updatedAt: any;
    status: 'new' | 'read' | 'archived';
    messages: Message[];
}

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch conversations
    useEffect(() => {
        const q = query(collection(db, "conversations"), orderBy("updatedAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Conversation));
            setConversations(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Scroll to bottom of chat
    useEffect(() => {
        if (selectedId) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [selectedId, conversations]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedId) return;

        const text = replyText;
        setReplyText("");

        const newMessage = {
            text,
            isBot: true, // Admin/System message
            timestamp: Date.now()
        };

        try {
            const docRef = doc(db, "conversations", selectedId);
            await updateDoc(docRef, {
                messages: arrayUnion(newMessage),
                lastMessage: `You: ${text}`,
                updatedAt: serverTimestamp(),
                status: 'read'
            });
        } catch (error) {
            console.error("Error sending reply:", error);
            alert("Failed to send reply");
        }
    };

    const handleStatusChange = async (cid: string, newStatus: 'read' | 'archived') => {
        try {
            await updateDoc(doc(db, "conversations", cid), { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const selectedConversation = conversations.find(c => c.id === selectedId);

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6">
            {/* Sidebar List */}
            <div className="w-1/3 bg-navy-900 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 bg-navy-950/50">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <MessageCircle size={20} className="text-blue-500" />
                        Inbox
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-blue-500" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">No messages yet.</div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedId(conv.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all border ${selectedId === conv.id
                                        ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20"
                                        : "bg-navy-950 border-white/5 hover:border-white/10 hover:bg-navy-800"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-semibold ${selectedId === conv.id ? "text-white" : "text-slate-300"}`}>
                                        Visitor {conv.id.substring(0, 4)}
                                    </span>
                                    {conv.status === 'new' && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                </div>
                                <p className={`text-xs line-clamp-1 ${selectedId === conv.id ? "text-blue-100" : "text-slate-400"}`}>
                                    {conv.lastMessage}
                                </p>
                                <span className={`text-[10px] mt-2 block ${selectedId === conv.id ? "text-blue-200" : "text-slate-600"}`}>
                                    {conv.updatedAt?.seconds ? new Date(conv.updatedAt.seconds * 1000).toLocaleString() : 'Just now'}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat View */}
            <div className="flex-1 bg-navy-900 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-navy-950/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Visitor {selectedConversation.id}</h3>
                                    <p className="text-xs text-slate-400">ID: {selectedConversation.id}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {selectedConversation.status !== 'archived' && (
                                    <button
                                        onClick={() => handleStatusChange(selectedConversation.id, 'archived')}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 transition-colors"
                                    >
                                        Archive
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {selectedConversation.messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.isBot ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] ${msg.isBot ? 'items-end' : 'items-start'} flex flex-col`}>
                                        <div className={`p-4 rounded-2xl text-sm ${msg.isBot
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-navy-950 border border-white/10 text-slate-200 rounded-tl-none'
                                            }`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] text-slate-600 mt-1 px-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {msg.isBot && " (You)"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Input */}
                        <form onSubmit={handleReply} className="p-4 bg-navy-950 border-t border-white/5">
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 bg-navy-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Send <Send size={18} />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
