import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, VolumeX, Loader2, Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useVoiceCommandExecutor } from '@/hooks/useVoiceCommandExecutor';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  commandData?: any;
}

const VoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [pendingCommand, setPendingCommand] = useState<any>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { executeCommand } = useVoiceCommandExecutor();
  
  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported,
  } = useVoiceRecognition();
  
  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useTextToSpeech();

  // Fetch owner ID
  useEffect(() => {
    const fetchOwnerId = async () => {
      if (!user) return;
      
      const { data } = await supabase.rpc('get_owner_id', { user_id: user.id });
      setOwnerId(data || user.id);
    };
    
    fetchOwnerId();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && !isListening) {
      handleSendMessage(transcript);
      resetTranscript();
    }
  }, [isListening, transcript]);

  // Show speech error
  useEffect(() => {
    if (speechError) {
      toast({
        variant: "destructive",
        title: "Voice Error",
        description: speechError,
      });
    }
  }, [speechError, toast]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your Invoxa Voice Assistant. You can speak or type commands to manage invoices, inventory, expenses, payments, and more. How can I help you today?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      if (ttsEnabled && ttsSupported) {
        speak(welcomeMessage.content);
      }
    }
  }, [isOpen]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, commandData?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      commandData,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const processWithAI = async (text: string) => {
    try {
      const conversationHistory = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await supabase.functions.invoke('voice-assistant', {
        body: { text, conversationHistory },
      });

      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('AI processing error:', error);
      throw error;
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    const userMessage = addMessage('user', text.trim());
    setTextInput('');
    setIsProcessing(true);

    try {
      // Check if user is confirming a pending command
      if (pendingCommand && (
        text.toLowerCase().includes('yes') || 
        text.toLowerCase().includes('proceed') ||
        text.toLowerCase().includes('confirm') ||
        text.toLowerCase().includes('haan') ||
        text.toLowerCase().includes('kar do')
      )) {
        // Execute the pending command
        if (ownerId) {
          const result = await executeCommand(pendingCommand, ownerId);
          const responseMessage = addMessage('assistant', result.message);
          
          if (ttsEnabled && ttsSupported) {
            speak(result.message);
          }
          
          if (result.success) {
            toast({
              title: "Success",
              description: result.message,
            });
          }
        }
        setPendingCommand(null);
        setIsProcessing(false);
        return;
      }

      // Check if user is canceling
      if (pendingCommand && (
        text.toLowerCase().includes('no') ||
        text.toLowerCase().includes('cancel') ||
        text.toLowerCase().includes('nahi') ||
        text.toLowerCase().includes('ruko')
      )) {
        const cancelMessage = addMessage('assistant', "Okay, I've cancelled that action. What else can I help you with?");
        if (ttsEnabled && ttsSupported) {
          speak(cancelMessage.content);
        }
        setPendingCommand(null);
        setIsProcessing(false);
        return;
      }

      // Process with AI
      const aiResponse = await processWithAI(text);
      
      if (aiResponse.error) {
        const errorMessage = addMessage('assistant', aiResponse.confirmation_message || aiResponse.error);
        if (ttsEnabled && ttsSupported) {
          speak(errorMessage.content);
        }
        setIsProcessing(false);
        return;
      }

      // Add AI response
      const responseMessage = addMessage('assistant', aiResponse.confirmation_message, aiResponse);
      
      if (ttsEnabled && ttsSupported) {
        speak(aiResponse.confirmation_message);
      }

      // If ready to execute, ask for confirmation or execute directly for simple actions
      if (aiResponse.ready_to_execute && aiResponse.understood) {
        if (aiResponse.action === 'view' || aiResponse.module === 'sales' || aiResponse.module === 'credits' || aiResponse.module === 'customers' || aiResponse.module === 'settings') {
          // Navigate immediately for view actions
          if (ownerId) {
            await executeCommand(aiResponse, ownerId);
          }
        } else {
          // Store pending command for confirmation
          setPendingCommand(aiResponse);
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = addMessage('assistant', "Sorry, I encountered an error. Please try again.");
      if (ttsEnabled && ttsSupported) {
        speak(errorMessage.content);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(textInput);
    }
  };

  return (
    <>
      {/* Floating Mic Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90",
          "transition-all duration-300 hover:scale-110",
          isListening && "animate-pulse ring-4 ring-primary/30"
        )}
        size="icon"
      >
        <Mic className="h-6 w-6 text-primary-foreground" />
      </Button>

      {/* Voice Assistant Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-base">Invoxa Voice Assistant</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {isListening ? "Listening..." : isProcessing ? "Processing..." : "Ready to help"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                >
                  {ttsEnabled ? (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 animate-fade-in",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex gap-2 justify-start animate-fade-in">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              
              {isListening && transcript && (
                <div className="flex gap-2 justify-end animate-fade-in">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2 text-sm bg-primary/50 text-primary-foreground">
                    {transcript}...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border/50 bg-card/50">
            <div className="flex items-center gap-2">
              <Button
                variant={isListening ? "destructive" : "secondary"}
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full flex-shrink-0 transition-all",
                  isListening && "animate-pulse"
                )}
                onClick={handleMicClick}
                disabled={!speechSupported || isProcessing}
              >
                {isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type or speak a command..."
                className="flex-1 rounded-full"
                disabled={isProcessing || isListening}
              />
              
              <Button
                size="icon"
                className="h-10 w-10 rounded-full flex-shrink-0"
                onClick={() => handleSendMessage(textInput)}
                disabled={!textInput.trim() || isProcessing}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {!speechSupported && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Voice input not supported in this browser. Use text input instead.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceAssistant;
