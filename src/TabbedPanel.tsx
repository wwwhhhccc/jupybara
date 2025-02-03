// TabbedPanel.tsx
import React, { useState, useEffect, useRef } from "react";
import { INotebookTracker } from "@jupyterlab/notebook";
import { Tab, Tabs } from "react-bootstrap";
import ClarifyComponent from "./ClarifyComponent";
import SettingsComponent from "./SettingsComponent";
import InsightsComponent from "./InsightsComponent";
import StorytellingComponent from "./StorytellingComponent";
import { requestAPI } from "./handler";

interface TabbedPanelProps {
  tracker: INotebookTracker;
}

interface Message {
  text: string;
  sender: "user" | "llm";
}

interface Highlight {
  text: string;
  note: string;
  startOffset: number;
  endOffset: number;
  startContainer: string | null;
  endContainer: string | null;
}

const TabbedPanel: React.FC<TabbedPanelProps> = ({ tracker }) => {
  const [key, setKey] = useState<string>("settings");

  const [EDAMultiAgent, setEDAMultiAgent] = useState(true);
  const [storyMultiAgent, setStoryMultiAgent] = useState(true);
  const [EDAMaxRounds, setEDAMaxRounds] = useState("1");
  const [StoryMaxRounds, setStoryMaxRounds] = useState("1");
  const [agent1Model, setAgent1Model] = useState("gpt4o");
  const [planModel, setPlanModel] = useState("gpt4o");
  const [codeModel, setCodeModel] = useState("gpt4o");
  const [visModel, setVisModel] = useState("gpt4o");
  const [interpretModel, setInterpretModel] = useState("gpt4o");
  const [EDARefinerModel, setEDARefinerModel] = useState("gpt4o");
  const [clarifyModel, setClarifyModel] = useState("gpt4o");
  const [storyInitiatorModel, setStoryInitiatorModel] = useState("claude");
  const [semanticModel, setSemanticModel] = useState("claude");
  const [rhetoricalModel, setRhetoricalModel] = useState("claude");
  const [pragmaticModel, setPragmaticModel] = useState("claude");
  const [storyRefinerModel, setStoryRefinerModel] = useState("claude");
  const [storyFeedbackHandlerModel, setStoryFeedbackHandlerModel] = useState("gpt4o");

  const [persistentInsights, setPersistentInsights] = useState([]);

  const [chatHistory, setChatHistory] = useState<{ [key: string]: Message[] }>({});
  const [cellContent, setCellContent] = useState("");
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [currentCellId, setCurrentCellId] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [storyContent, setStoryContent] = useState<string>("");
  const [globalFeedback, setGlobalFeedback] = useState<string>("");
  const [userInstructions, setUserInstructions] = useState<string>("");

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateContent = () => {
      const current = tracker.currentWidget;
      const notebook = current?.content;
      const activeCell = notebook?.activeCell;
      const content = activeCell?.model.sharedModel.getSource() || "";
      const cellId = activeCell?.model.id || "";

      setCellContent(content);
      setIsMarkdown(activeCell?.model.type === "markdown");
      setCurrentCellId(cellId);

      if (cellId) {
        setChatHistory((prevChatHistory) => ({
          ...prevChatHistory,
          [cellId]: prevChatHistory[cellId] || [],
        }));
      }
    };

    const changeHandler = () => {
      updateContent();
    };

    tracker.currentChanged.connect(changeHandler);
    tracker.activeCellChanged.connect(changeHandler);

    return () => {
      tracker.currentChanged.disconnect(changeHandler);
      tracker.activeCellChanged.disconnect(changeHandler);
    };
  }, [tracker]);

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement;
      console.log("Scrolling element:", target);
      console.log("Scroll position:", target.scrollTop);
    };

    if (panelRef.current) {
      panelRef.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (panelRef.current) {
        panelRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleHighlightsChange = (newHighlights: Highlight[]) => {
    setHighlights(newHighlights);
  };

  const handleStoryContentChange = (newContent: string) => {
    setStoryContent(newContent);
  };

  const updateSettings = async () => {
    const config = {
      EDA_MAX_ROUND: parseInt(EDAMaxRounds),
      DATA_STORY_MAX_ROUND: parseInt(StoryMaxRounds),
      AGENT_MODELS: {
        agent1: agent1Model === "gpt4o" ? "GPT-4o" : "claude",
        plan: planModel === "gpt4o" ? "GPT-4o" : "claude",
        code: codeModel === "gpt4o" ? "GPT-4o" : "claude",
        vis: visModel === "gpt4o" ? "GPT-4o" : "claude",
        interpret: interpretModel === "gpt4o" ? "GPT-4o" : "claude",
        refiner2: EDARefinerModel === "gpt4o" ? "GPT-4o" : "claude",
        clarify: clarifyModel === "gpt4o" ? "GPT-4o" : "claude",
        "story-initiator": storyInitiatorModel === "gpt4o" ? "GPT-4o" : "claude",
        semantic: semanticModel === "gpt4o" ? "GPT-4o" : "claude",
        rhetorical: rhetoricalModel === "gpt4o" ? "GPT-4o" : "claude",
        pragmatic: pragmaticModel === "gpt4o" ? "GPT-4o" : "claude",
        "story-refiner": storyRefinerModel === "gpt4o" ? "GPT-4o" : "claude",
        story_feedback_handler: storyFeedbackHandlerModel === "gpt4o" ? "GPT-4o" : "claude",
      },
      EDA_MULTI_AGENT: EDAMultiAgent,
      DATA_STORY_MULTI_AGENT: storyMultiAgent,
    };

    const payload = { request_type: "set_config", config: config };

    try {
      const reply = await requestAPI<any>("hello", {
        body: JSON.stringify(payload),
        method: "POST",
      });
      console.log("Settings updated successfully:", reply);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  useEffect(() => {
    updateSettings();
  }, [
    EDAMultiAgent,
    storyMultiAgent,
    EDAMaxRounds,
    StoryMaxRounds,
    agent1Model,
    planModel,
    codeModel,
    visModel,
    interpretModel,
    EDARefinerModel,
    clarifyModel,
    storyInitiatorModel,
    semanticModel,
    rhetoricalModel,
    pragmaticModel,
    storyRefinerModel,
    storyFeedbackHandlerModel,
  ]);

  const handleMessagesChange = (cellId: string | null, messages: Message[]) => {
    if (cellId) {
      setChatHistory((prevChatHistory) => ({
        ...prevChatHistory,
        [cellId]: messages,
      }));
    }
  };

  const handleGlobalFeedbackChange = (newFeedback: string) => {
    setGlobalFeedback(newFeedback);
  };

  const handleUserInstructionsChange = (newInstructions: string) => {
    setUserInstructions(newInstructions);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
      ref={panelRef}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backgroundColor: "white",
        }}
      >
        <Tabs
          id="controlled-tab-example"
          activeKey={key}
          onSelect={(k) => setKey(k!)}
          defaultActiveKey="settings"
        >
          <Tab eventKey="settings" title="Settings" />
          <Tab eventKey="clarify" title="Clarify" />
          <Tab eventKey="insights" title="Insights" />
          <Tab eventKey="storytelling" title="Storytelling" />
        </Tabs>
      </div>
      <div style={{ flexGrow: 1, overflowY: "auto" }}>
        {key === "settings" ? (
          <SettingsComponent
            EDAMultiAgent={EDAMultiAgent}
            setEDAMultiAgent={setEDAMultiAgent}
            storyMultiAgent={storyMultiAgent}
            setStoryMultiAgent={setStoryMultiAgent}
            EDAMaxRounds={EDAMaxRounds}
            setEDAMaxRounds={setEDAMaxRounds}
            StoryMaxRounds={StoryMaxRounds}
            setStoryMaxRounds={setStoryMaxRounds}
            agent1Model={agent1Model}
            setAgent1Model={setAgent1Model}
            planModel={planModel}
            setPlanModel={setPlanModel}
            codeModel={codeModel}
            setCodeModel={setCodeModel}
            visModel={visModel}
            setVisModel={setVisModel}
            interpretModel={interpretModel}
            setInterpretModel={setInterpretModel}
            EDARefinerModel={EDARefinerModel}
            setEDARefinerModel={setEDARefinerModel}
            clarifyModel={clarifyModel}
            setClarifyModel={setClarifyModel}
            storyInitiatorModel={storyInitiatorModel}
            setStoryInitiatorModel={setStoryInitiatorModel}
            semanticModel={semanticModel}
            setSemanticModel={setSemanticModel}
            rhetoricalModel={rhetoricalModel}
            setRhetoricalModel={setRhetoricalModel}
            pragmaticModel={pragmaticModel}
            setPragmaticModel={setPragmaticModel}
            storyRefinerModel={storyRefinerModel}
            setStoryRefinerModel={setStoryRefinerModel}
            storyFeedbackHandlerModel={storyFeedbackHandlerModel}
            setStoryFeedbackHandlerModel={setStoryFeedbackHandlerModel}
          />
        ) : key === "clarify" ? (
          <ClarifyComponent
            tracker={tracker}
            chatHistory={chatHistory}
            onMessagesChange={handleMessagesChange}
            cellContent={cellContent}
            isMarkdown={isMarkdown}
            currentCellId={currentCellId}
          />
        ) : key === "insights" ? (
          <InsightsComponent 
            tracker={tracker} 
            insights={persistentInsights}
            setInsights={setPersistentInsights}
          />
        ) : (
          <StorytellingComponent
            tracker={tracker}
            highlights={highlights}
            onHighlightsChange={handleHighlightsChange}
            storyContent={storyContent}
            onStoryContentChange={handleStoryContentChange}
            globalFeedback={globalFeedback}
            onGlobalFeedbackChange={handleGlobalFeedbackChange}
            userInstructions={userInstructions}
            onUserInstructionsChange={handleUserInstructionsChange}
          />
        )}
      </div>
    </div>
  );
};

export default TabbedPanel;