import React, { useState, useEffect, useRef } from "react";
import { Container, Button, Row, Col, Form, Modal } from "react-bootstrap";
import { INotebookTracker } from "@jupyterlab/notebook";
import { requestAPI } from "./handler";
import Editor from "@monaco-editor/react";
import "bootstrap/dist/css/bootstrap.min.css";
import 'tippy.js/dist/tippy.css';
import tippy, { Instance as TippyInstance } from 'tippy.js';

interface StorytellingComponentProps {
  tracker: INotebookTracker;
  highlights: Highlight[];
  onHighlightsChange: (highlights: Highlight[]) => void;
  storyContent: string;
  onStoryContentChange: (content: string) => void;
  globalFeedback: string;
  onGlobalFeedbackChange: (feedback: string) => void;
  userInstructions: string;
  onUserInstructionsChange: (instructions: string) => void;
}

interface CellObject {
  cellType: string;
  input: string;
  source: string;
  output?: any[];
}

interface Highlight {
  text: string;
  note: string;
  startOffset: number;
  endOffset: number;
  startContainer: string | null;
  endContainer: string | null;
}

const StorytellingComponent: React.FC<StorytellingComponentProps> = ({
  tracker,
  highlights,
  onHighlightsChange,
  storyContent,
  onStoryContentChange,
  globalFeedback,
  onGlobalFeedbackChange,
  userInstructions,
  onUserInstructionsChange,
}) => {
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState("");
  const [showQuoteOption, setShowQuoteOption] = useState(false);
  const [quotePosition, setQuotePosition] = useState({ top: 0, left: 0 });
  const [showInstructions, setShowInstructions] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);
  const quoteOptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (showQuoteOption) {
        handleTextSelection();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        quoteOptionRef.current &&
        !quoteOptionRef.current.contains(event.target as Node)
      ) {
        setShowQuoteOption(false);
      }
    };

    const scrollContainer = storyRef.current?.closest(
      ".storytelling-container",
    );
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showQuoteOption]);

  useEffect(() => {
    if (storyRef.current) {
      const tooltipInstances: TippyInstance[] = [];
      const tooltipElements = storyRef.current.querySelectorAll('[explanation]');

      tooltipElements.forEach((el) => {
        const instance = tippy(el as Element, {
          content: el.getAttribute('explanation'),
          allowHTML: true,
          appendTo: () => document.body,
          onShow(instance) {
            tooltipInstances.forEach(tip => {
              if (tip !== instance) {
                tip.hide();
              }
            });

            const target = instance.reference as Element;
            const innermostElement = target.closest('[explanation]');

            // Only return false if the condition fails, otherwise return nothing
            if (innermostElement !== target) {
              return false;
            }
          }
        });
        tooltipInstances.push(instance);
      });

      return () => {
        tooltipInstances.forEach(instance => instance.destroy());
      };
    }
  }, [storyContent, showEditor]);


  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onStoryContentChange(value);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const storyRect = storyRef.current?.getBoundingClientRect();
      if (storyRect) {
        const scrollContainer = storyRef.current?.closest(
          ".storytelling-container",
        );
        const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

        const offsetY = 30;

        const firstLineRect = range.getClientRects()[0];

        const left = firstLineRect.left - storyRect.left;
        const top = rect.top - storyRect.top - offsetY + scrollTop;

        setQuotePosition({
          top: top,
          left: left < 0 ? 0 : left,
        });
      }
      setSelectedText(selection.toString());
      setShowQuoteOption(true);
    } else {
      setShowQuoteOption(false);
    }
  };

  const handleQuote = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const newHighlight: Highlight = {
        text: selectedText,
        note: "",
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        startContainer: range.startContainer.textContent,
        endContainer: range.endContainer.textContent,
      };
      onHighlightsChange([...highlights, newHighlight]);

      // Wrap the selected text in a span with a background color for highlighting
      const span = document.createElement('span');
      span.style.backgroundColor = 'yellow';
      span.textContent = selection.toString();
      range.deleteContents();
      range.insertNode(span);
    }
    setShowQuoteOption(false);
  };


  const getCellsData = (tracker: INotebookTracker): any => {
    let cells: any[] = [];
    let parsedCells: CellObject[] = [];

    const activeNotebookPanel = tracker.currentWidget;
    if (activeNotebookPanel) {
      cells = [...activeNotebookPanel.content.widgets];
    }

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
          cell._output.model.list._array.forEach((ele: any) => {
            cellObject.output!.push(ele._rawData);
          });
        }
      }
      parsedCells.push(cellObject);
    }

    return {
      cells: parsedCells,
    };
  };

  const extractHeadAndAppendToBody = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const head = doc.head.innerHTML;
    const body = doc.body.innerHTML;
    return `<body>${body}\n\n<!-- Head content -->\n${head}</body>`;
  };

  const handleGenerateDataStory = async (): Promise<void> => {
    try {
      const dataToSend = getCellsData(tracker);
      dataToSend.request_type = "generate_story";
      dataToSend.user_instructions = userInstructions;
      console.log(dataToSend);

      const reply = await requestAPI<any>("hello", {
        body: JSON.stringify(dataToSend),
        method: "POST",
      });

      console.log(reply);

      if (reply) {
        // Find the first occurrence of '-----' and remove everything before and including it
        const separator = '-----';
        const separatorIndex = reply.indexOf(separator);
        let modifiedReply = reply;

        if (separatorIndex !== -1) {
          modifiedReply = reply.substring(separatorIndex + separator.length);
        }

        const modifiedContent = extractHeadAndAppendToBody(modifiedReply.trim());
        onStoryContentChange(modifiedContent);
      }
    } catch (error) {
      console.error("Error calling LLM API:", error);
    }
  };

  const renderContentWithExplanations = (html: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const styleTag = doc.querySelector('style');
      const explanations: { [key: string]: string } = {};

      if (styleTag) {
        const styleContent = styleTag.textContent || '';
        const matches = styleContent.matchAll(/\.(\w+)\s*{[^}]*explanation:\s*"([^"]*)"/g);
        for (const match of matches) {
          explanations[match[1]] = match[2];
        }
      }

      const processNode = (node: Element) => {
        if (node.classList && node.classList.length > 0) {
          for (const className of node.classList) {
            if (explanations[className]) {
              node.setAttribute('explanation', explanations[className]);
              break;
            }
          }
        }

        Array.from(node.children).forEach(child => {
          if (child instanceof Element) {
            processNode(child);
          }
        });
      };

      processNode(doc.body);

      // Apply highlights to the content
      highlights.forEach(highlight => {
        doc.body.innerHTML = doc.body.innerHTML.replace(
          new RegExp(`(${highlight.text})`, 'g'),
          `<span style="background-color: yellow;">$1</span>`
        );
      });

      return { __html: doc.body.innerHTML };
    } catch (error) {
      console.error('Error processing content with explanations:', error);
      return { __html: html };
    }
  };


  const handleSubmitAllFeedback = async () => {
    try {
      const dataToSend = {
        request_type: "submit_feedback",
        cells: getCellsData(tracker).cells,
        story_content: storyContent,
        global_feedback: globalFeedback,
        user_instructions: userInstructions,
        quote_feedback: highlights.map(highlight => ({
          quoted_text: highlight.text,
          feedback: highlight.note
        }))
      };

      console.log("All feedback submitted");

      const reply = await requestAPI<any>("hello", {
        body: JSON.stringify(dataToSend),
        method: "POST",
      });

      if (reply) {
        const modifiedContent = extractHeadAndAppendToBody(reply);
        onStoryContentChange(modifiedContent);
        onHighlightsChange([]);
        onGlobalFeedbackChange("");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("There was an error submitting the feedback. Please try again.");
    }
  };


  const hasFeedback = globalFeedback.trim() !== '' || highlights.some(h => h.note.trim() !== '');

  const handleInstructionsSave = () => {
    setShowInstructions(false);
  };

  return (
    <Container
      className="storytelling-container"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}
    >
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center" }}>
        <Button onClick={handleGenerateDataStory}>Generate Data Story</Button>
        <Button
          onClick={() => setShowEditor(!showEditor)}
          style={{ marginLeft: "10px" }}
        >
          {showEditor ? "Hide Editor" : "Edit"}
        </Button>
        {!globalFeedback && (
          <Button
            onClick={() => onGlobalFeedbackChange(" ")}
            style={{ marginLeft: "10px" }}
          >
            Add Global Feedback
          </Button>
        )}
        <Button
          onClick={() => setShowInstructions(true)}
          style={{ marginLeft: "10px" }}
        >
          Instructions
        </Button>
      </div>

      <div style={{ flexGrow: 1, overflowY: "auto", position: "relative" }}>
        {showEditor ? (
          <Row style={{ marginTop: "20px", height: "calc(100vh - 150px)" }}>
            <Col md={6} style={{ height: "100%", position: "sticky", top: "20px" }}>
              <Editor
                height="100%"
                defaultLanguage="html"
                defaultValue={storyContent}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  wrappingIndent: "indent",
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: false,
                  theme: "vs-light",
                }}
              />
            </Col>
            <Col md={6}>
              <div
                style={{
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  minHeight: "100%",
                  overflowY: "auto",
                }}
                onMouseUp={handleTextSelection}
                ref={storyRef}
                dangerouslySetInnerHTML={renderContentWithExplanations(
                  storyContent,
                )}
              />
            </Col>
          </Row>
        ) : (
          <div
            style={{ padding: "10px", marginTop: "20px" }}
            onMouseUp={handleTextSelection}
            ref={storyRef}
            dangerouslySetInnerHTML={renderContentWithExplanations(storyContent)}
          />
        )}

        {showQuoteOption && (
          <div
            ref={quoteOptionRef}
            style={{
              position: "absolute",
              top: `${quotePosition.top}px`,
              left: `${quotePosition.left}px`,
              zIndex: 1000,
              backgroundColor: "white",
              borderRadius: "4px",
            }}
          >
            <Button variant="primary" onClick={handleQuote}>
              Quote
            </Button>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, marginTop: "20px" }}>
        {globalFeedback && (
          <div
            style={{
              backgroundColor: "lightyellow",
              padding: "15px",
              marginTop: "15px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <strong>Global Feedback</strong>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onGlobalFeedbackChange("")}
              style={{ marginLeft: "10px", float: "right" }}
            >
              Remove
            </Button>
            <Form.Group className="mt-3">
              <Form.Control
                as="textarea"
                rows={3}
                value={globalFeedback}
                onChange={(e) => onGlobalFeedbackChange(e.target.value)}
                placeholder="Enter your overall feedback on the data story..."
                style={{ resize: "vertical" }}
              />
            </Form.Group>
          </div>
        )}

        {highlights.map((highlight, index) => (
          <div
            key={index}
            style={{
              backgroundColor: "lightyellow",
              padding: "15px",
              marginTop: "15px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <strong>Quote:</strong> {highlight.text}
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => {
                const newHighlights = highlights.filter((_, i) => i !== index);
                onHighlightsChange(newHighlights);
              }}
              style={{ marginLeft: "10px", float: "right" }}
            >
              Remove
            </Button>
            <Form.Group className="mt-3">
              <Form.Control
                as="textarea"
                rows={3}
                value={highlight.note}
                onChange={(e) => {
                  const newHighlights = [...highlights];
                  newHighlights[index].note = e.target.value;
                  onHighlightsChange(newHighlights);
                }}
                placeholder="Add your feedback on this quote..."
                style={{ resize: "vertical" }}
              />
            </Form.Group>
          </div>
        ))}

        {hasFeedback && (
          <Button
            variant="primary"
            className="mt-4"
            onClick={handleSubmitAllFeedback}
            style={{ display: "block", margin: "0 auto" }}
          >
            Submit All Feedback
          </Button>
        )}
      </div>

      <Modal show={showInstructions} onHide={() => setShowInstructions(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Instructions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Control
              as="textarea"
              rows={5}
              value={userInstructions}
              onChange={(e) => onUserInstructionsChange(e.target.value)}
              placeholder="Enter your instructions here..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInstructions(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleInstructionsSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StorytellingComponent;
