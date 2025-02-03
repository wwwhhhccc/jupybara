import React, { useState, useEffect, useRef } from "react";
import { INotebookTracker } from "@jupyterlab/notebook";
import { Button, Container, Row, Col } from "react-bootstrap";
import AceEditor from "react-ace";
import ReactMarkdown from "react-markdown";
import ChatComponent from "./ChatComponent";

// Import necessary modules for syntax highlighting
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-github";

interface Message {
  text: string;
  sender: "user" | "llm";
}

interface ClarifyComponentProps {
  tracker: INotebookTracker;
  chatHistory: { [key: string]: Message[] };
  onMessagesChange: (cellId: string | null, messages: Message[]) => void;
  cellContent: string;
  isMarkdown: boolean;
  currentCellId: string | null;
}

const ClarifyComponent: React.FC<ClarifyComponentProps> = ({
  tracker,
  chatHistory,
  onMessagesChange,
  cellContent,
  isMarkdown,
  currentCellId
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const markdownRef = useRef<HTMLDivElement>(null);

  const handleChange = (newValue: string) => {
    // You might want to implement a way to update the cell content in the parent component
    console.log("Cell content changed:", newValue);
  };

  const toggleMarkdown = () => {
    // You might want to implement a way to toggle markdown in the parent component
    console.log("Toggle markdown");
  };

  const handleMarkdownEdit = () => {
    setIsEditing(true);
  };

  const handleMarkdownSave = () => {
    if (markdownRef.current) {
      // You might want to implement a way to save the markdown content in the parent component
      console.log("Markdown content saved:", markdownRef.current.innerText);
    }
    setIsEditing(false);
  };

  return (
    <Container fluid className="px-3" style={{margin: "20px 0"}}>
      <Row className="mt-3 mb-3" >
        <Col>
          {/* <Button variant="secondary" onClick={toggleMarkdown} className="me-2">
            {isMarkdown ? "Show Editor" : "Show Markdown"}
          </Button> */}
          {isMarkdown && (
            <Button
              variant="info"
              onClick={isEditing ? handleMarkdownSave : handleMarkdownEdit}
            >
              {isEditing ? "Save" : "Edit"}
            </Button>
          )}
        </Col>
      </Row>
      <Row>
        <Col>
          <h3>Active Cell Content:</h3>
          <div
            style={{
              height: "200px",
              overflowY: "auto",
              backgroundColor: "#F8F9FA",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {isMarkdown ? (
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                style={{
                  whiteSpace: "pre-wrap",
                  flex: 1,
                  padding: "10px",
                }}
                ref={markdownRef}
              >
                {isEditing ? (
                  cellContent
                ) : (
                  <ReactMarkdown>{cellContent}</ReactMarkdown>
                )}
              </div>
            ) : (
              <AceEditor
                mode="python"
                theme="github"
                onChange={handleChange}
                value={cellContent}
                name="UNIQUE_ID_OF_DIV"
                editorProps={{ $blockScrolling: true }}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 4,
                }}
                style={{ width: "100%", height: "100%", flex: 1 }}
              />
            )}
          </div>
        </Col>
      </Row>
      <Row>
        <Col>
          <ChatComponent 
            tracker={tracker} 
            editorContent={cellContent} 
            cellId={currentCellId}
            onMessagesChange={onMessagesChange}
            messages={currentCellId ? chatHistory[currentCellId] || [] : []}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default ClarifyComponent;