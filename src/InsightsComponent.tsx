import React, { useState, useEffect, useRef } from "react";
import Mermaid from "react-mermaid2";
import { requestAPI } from "./handler";
import { Container, Button } from "react-bootstrap";
import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";

interface CellObject {
  cellType: string;
  input: string;
  source: string;
  output?: any[];
}

interface Insight {
  content: string;
  mermaidChart?: string;
}

interface InsightsComponentProps {
  tracker: INotebookTracker;
  insights: Insight[];
  setInsights: React.Dispatch<React.SetStateAction<Insight[]>>;
}

const InsightsComponent: React.FC<InsightsComponentProps> = ({
  tracker,
  insights,
  setInsights,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        container.style.height = `${window.innerHeight - rect.top}px`;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

  const handleSummarize = async () => {
    try {
      const dataToSend = getCellsData(tracker);
      dataToSend.request_type = "summarize_insights";
      console.log(dataToSend);

      const reply = await requestAPI<any>("hello", {
        body: JSON.stringify(dataToSend),
        method: "POST",
      });
      console.log("original reply: ", reply);

      const processedInsights = processReply(reply);
      console.log("LLM output", processedInsights);

      setInsights(processedInsights);
    } catch (error) {
      console.error("Error calling LLM API:", error);
    }
  };

  const processReply = (reply: string): Insight[] => {
    const delimiter = "-----";
    const sections = reply.split(delimiter).pop()?.trim() ?? "";
    const mermaidPattern = /```mermaid([\s\S]*?)```/g;
    const parts = sections.split(mermaidPattern);
    let insights: Insight[] = [];
  
    const prependMessage = `
        <span style="background-color: #cde498;">Nodes in green</span> are entities and findings derivable from the dataset. 
        <span style="background-color: #ffff99;">Nodes in yellow</span> correspond to external knowledge.
    `;
  
    insights.push({ content: prependMessage.trim() });

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        insights.push({ content: parts[i].trim() });
      } else {
        let mermaidChart = parts[i].trim();
        mermaidChart = mermaidChart
          .split("\n")
          .map((line) => {
            // Remove comments with "%%" and ensure valid numbering
            const index = line.indexOf("%%");
            if (index !== -1 && !isNaN(Number(line.substring(index + 2).trim()))) {
              line = line.substring(0, index).trim();
            }
            // Remove trailing semicolon
            if (line.endsWith(";")) {
              line = line.slice(0, -1);
            }
            return line.trim();
          })
          .join("\n");
        insights[insights.length - 1].mermaidChart = mermaidChart;
      }
    }
    return insights;
};

  

  const renderMarkdown = (text: string): string => {
    return text
      .replace(/#### (.*)/g, "<h4>$1</h4>")
      .replace(/### (.*)/g, "<h3>$1</h3>")
      .replace(/## (.*)/g, "<h2>$1</h2>")
      .replace(/# (.*)/g, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.*)/gm, "<li>$1</li>")
      // .replace(/^\d+\. (.*)/gm, "<ol><li>$1</li></ol>")
      // .replace(/<\/ol><ol>/g, "")
      .replace(/\n/g, "<br>")
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  };

  useEffect(() => {
    chartRefs.current.forEach((chartRef, index) => {
      if (chartRef) {
        const nodesAndEdges = chartRef.querySelectorAll(".node, .edgeLabel");
        nodesAndEdges.forEach((element, position) => {
          element.classList.add("clickable");
          element.addEventListener("click", async (event) => {
            const clickedElement = event.currentTarget as HTMLElement;
            const elementText = clickedElement.textContent;
            const elementId = clickedElement.id;
            let node_or_edge = "";
            let context = "";

            if (clickedElement.classList.contains("node")) {
              const nodeLabel = elementId.split("-")[1]; // Extract node label after the first dash
              context = `${nodeLabel}`;
              node_or_edge = "node";
            } else if (clickedElement.classList.contains("edgeLabel")) {
              const spanElement = clickedElement.querySelector("span");
              if (spanElement) {
                const connectedNodes = spanElement.id
                  .split("-")
                  .slice(2)
                  .join(" and "); // Extract connected nodes from span id
                context = `${connectedNodes}`;
                node_or_edge = "edge";
              }
            }

            // console.log("Clicked on:", clickedElement);
            console.log("Clicked on:", elementText, " context: ", context);

            try {
              const dataToSend = getCellsData(tracker);

              const clickedInsight = insights[index];

              dataToSend.request_type = "link_to_cell";
              dataToSend.context = context;
              dataToSend.elementText = elementText;
              dataToSend.mermaidChart = clickedInsight.mermaidChart;
              dataToSend.node_or_edge = node_or_edge;

              if (context !== "") {
                const cellNumber = await requestAPI<any>("hello", {
                  body: JSON.stringify(dataToSend),
                  method: "POST",
                });
                console.log("llm reply: ", +cellNumber);
                const activeNotebookPanel = tracker.currentWidget;
                if (activeNotebookPanel) {
                  const notebook = activeNotebookPanel.content;
                  const cells = activeNotebookPanel.content.widgets;

                  notebook.mode = "command";
                  notebook.activeCellIndex = +cellNumber;
                  notebook.scrollToCell(cells[+cellNumber]);
                }
              }
            } catch (error) {
              console.error("Error calling LLM API:", error);
            }
          });
        });
      }
    });
  }, [insights]);

  return (
    <Container style={{ width: "100%"}}>
      <div
        style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}
      >
        <Button onClick={handleSummarize}>Summarize Insights</Button>
      </div>
      {insights.length > 0 && (
        <div
          ref={containerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            overflowY: "auto",
            height: "auto",
            width: "100%",
          }}
        >
          {insights.map((insight, index) => (
            <div
              key={index}
              style={{ marginBottom: "30px", width: "100%" }}
              ref={(el) => (chartRefs.current[index] = el)}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(insight.content),
                }}
                style={{ fontSize: "14px" }}
              />
              {insight.mermaidChart && <Mermaid chart={insight.mermaidChart} />}
            </div>
          ))}
        </div>
      )}
    </Container>
  );
};

export default InsightsComponent;