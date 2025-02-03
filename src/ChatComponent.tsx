
import React, { useState, useRef, useEffect } from "react";
import { Form, Button } from "react-bootstrap";
import { requestAPI } from "./handler";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";

interface Message {
  text: string;
  sender: "user" | "llm";
}

interface CellObject {
  cellType: string;
  input: string;
  source: string;
  output?: any[];
}

interface ChatComponentProps {
  tracker: INotebookTracker;
  editorContent: string;
  cellId: string | null;
  onMessagesChange: (cellId: string | null, messages: Message[]) => void;
  messages: Message[];
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  tracker,
  editorContent,
  cellId,
  onMessagesChange,
  messages,
}) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        4 * 24,
      )}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && cellId) {
      const userMessage: Message = { text: input, sender: "user" };
      
      const updatedMessages: Message[] = [...messages, userMessage];
      onMessagesChange(cellId, updatedMessages);
  
      setIsLoading(true);
  
      try {
        let cells = [],
          parsedCells = [];
  
        tracker.forEach((notebookPanel: NotebookPanel) => {
          cells = [...notebookPanel.content.widgets];
        });
  
        for (let i = 0; i < cells.length; i++) {
          let cell = cells[i];
          let cellObject: CellObject = {
            cellType: cell.model.type,
            input: cell.model.sharedModel.getSource(),
            source: cell.model.metadata.source ? "LLM" : "user",
          };
          if (cell.model.type === "code") {
            cellObject.output = [];
            if (cell._output.model.list._array.length > 0) {
              cell._output.model.list._array.forEach((ele) => {
                cellObject.output.push(ele._rawData);
              });
            }
          }
          parsedCells.push(cellObject);
        }
  
        const dataToSend = {
          cells: parsedCells,
          selected_cell: editorContent,
          request_type: "clarify",
          conversation_history: updatedMessages // Include the past conversation history along with the current user message
        };
  
        console.log(dataToSend);
  
        const reply = await requestAPI<any>("hello", {
          body: JSON.stringify(dataToSend),
          method: "POST",
        });
  
        console.log("LLM output", reply);
  
        const llmMessage: Message = { text: reply.clarification, sender: "llm" };
        const finalMessages: Message[] = [...updatedMessages, llmMessage];
        onMessagesChange(cellId, finalMessages);
      } catch (error) {
        console.error("Error calling LLM API:", error);
        const errorMessage: Message = {
          text: "Sorry, I encountered an error. Please try again.",
          sender: "llm",
        };
        onMessagesChange(cellId, [...updatedMessages, errorMessage]);
      } finally {
        setIsLoading(false);
        setInput("");
      }
    }
  };
  

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div
        style={{
          height: "calc(100% - 60px)",
          overflowY: "auto",
          padding: "10px",
          paddingBottom: "70px",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              textAlign: message.sender === "user" ? "right" : "left",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                background: message.sender === "user" ? "#007bff" : "#f8f9fa",
                color: message.sender === "user" ? "white" : "black",
                padding: "5px 10px",
                borderRadius: "10px",
                display: "inline-block",
                maxWidth: "70%",
                wordWrap: "break-word",
                whiteSpace: "pre-wrap",
                textAlign: "left",
              }}
            >
              {message.text}
            </span>
          </div>
        ))}
        {isLoading && (
          <div style={{ textAlign: "left", marginBottom: "10px" }}>
            <span style={{ fontStyle: "italic", color: "#666" }}>
              AI is typing...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "white",
          borderTop: "1px solid #ccc",
          padding: "10px",
        }}
      >
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <div style={{ position: "relative" }}>
              <Form.Control
                as="textarea"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                disabled={isLoading}
                style={{
                  resize: "none",
                  paddingRight: "40px",
                  minHeight: "38px",
                  maxHeight: "96px",
                  overflowY: "auto",
                }}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                style={{
                  position: "absolute",
                  bottom: "5px",
                  right: "5px",
                  padding: "2px 8px",
                }}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </Button>
            </div>
          </Form.Group>
        </Form>
      </div>
    </div>
  );
};

export default ChatComponent;
