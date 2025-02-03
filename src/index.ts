import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from "@jupyterlab/application";
import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";
import { markdownIcon, runIcon } from "@jupyterlab/ui-components";
import { requestAPI } from "./handler";
import { callAIIcon } from "./icon";
import "bootstrap/dist/css/bootstrap.min.css";
import "../style/index.css";

import { TabbedWidget } from "./sidePanel";
import { Cell } from "@jupyterlab/cells";
import { KernelMessage } from "@jupyterlab/services";
import { PromiseDelegate } from "@lumino/coreutils";
import { AIExecutingIcon } from "./icon";

const CommandIds = {
  cellCallAI: "toolbar-button:invoke-ai",
  topToolbarCallAI: "notebook:invoke-ai",
  runCodeCell: "toolbar-button:run-code-cell",
  stopAIExecution: "notebook:stop-ai-execution",
  AIExecuting: "notebook:ai-executing",
};

interface CellObject {
  cellType: string;
  input: string;
  source: string;
  output?: any[]; // Make output optional
}

let AIStatus = "";

const plugin: JupyterFrontEndPlugin<void> = {
  id: "llm4eda:plugin",
  description: "A JupyterLab extension to add cell toolbar buttons.",
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {
    console.log("start up code");
    const { commands } = app;

    let stopAI = false;
    let AIResponding = false;

    const callAI = async () => {
      AIResponding = true;
      refreshCommandStates();
      commands.execute("notebook:run-cell");

      let followup = true;
      while (followup) {
        let cells = [],
          parsedCells = [];

        await new Promise((resolve) => setTimeout(resolve, 200));

        const activeNotebookPanel = tracker.currentWidget;
        if (activeNotebookPanel) {
          cells = [...activeNotebookPanel.content.widgets];
          console.log("Active Notebook Cells here:", cells);
        }

        for (let i = 0; i < cells.length; i++) {
          let cell = cells[i];
          let cellObject: CellObject = {
            cellType: cell.model.type,
            input: cell.model.sharedModel.getSource(),
            source: cell.model.metadata.source ? "LLM" : "user",
          };
          if (cell.model.type === "code") {
            // cellObject.input = cell._input.node.innerText;
            cellObject.output = [];
            if (cell._output.model.list._array.length > 0) {
              cell._output.model.list._array.forEach((ele) => {
                cellObject.output.push(ele._rawData);
              });
            }
          }
          parsedCells.push(cellObject);
        }
        // console.log("new cell inserted!!!");
        commands.execute("notebook:insert-cell-below");


        const current = tracker.currentWidget;
        const notebook = current!.content;
        let activeCell = notebook.activeCell;
        let activeCellID = activeCell!.id;

        const dataToSend = { cells: parsedCells, request_type: "main_area" };

        console.log(dataToSend);

        // console.log("preparing to send request to backend");

        try {
          const reply = await requestAPI<any>("hello", {
            body: JSON.stringify(dataToSend),
            method: "POST",
          });

          console.log("LLM output", reply);

          if (!stopAI) {
            followup = reply["respond"];
            if (followup) {
              await notebook.scrollToCell(activeCell!);
              activeCell!.model.sharedModel.setSource(
                String(reply["cell"]["content"]),
              );
              activeCell!.model.setMetadata("source", "LLM");

              if (reply["cell"]["cellType"] == "markdown") {
                const content = String(reply["cell"]["content"]);
                const startDiv = '<div style="background-color: #FFE5CC; padding: 10px;">';
                const endDiv = "</div>";
                if (!(content.startsWith(startDiv) && content.endsWith(endDiv))) {
                  activeCell!.model.sharedModel.setSource(
                    `${startDiv}\n\n${content}\n${endDiv}`,
                  );
                } else {
                  activeCell!.model.sharedModel.setSource(content);
                }

                await commands.execute("notebook:change-cell-to-markdown");
              }

              await commands.execute("notebook:run-cell");
            }
          } else {
            followup = false;
            stopAI = false;
          }
        } catch (reason) {
          console.error(
            `Error on POST /jupyterlab-examples-server/process_cells.\n${reason}`,
          );
          followup = false; // Break the loop in case of error
        }
      }
      AIResponding = false;
      refreshCommandStates();
    };

    const tabbedWidget = new TabbedWidget(tracker);
    tabbedWidget.id = "JupyterTabbedWidget"; // Widgets need an id
    app.shell.add(tabbedWidget, "right");

    const refreshCommandStates = () => {
      app.commands.notifyCommandChanged(CommandIds.AIExecuting);
    };

    commands.addCommand(CommandIds.stopAIExecution, {
      label: "Stop AI Execution",
      execute: () => {
        stopAI = true;
        AIResponding = false;
        refreshCommandStates();
      },
    });

    commands.addCommand(CommandIds.topToolbarCallAI, {
      icon: callAIIcon,
      label: "invoke AI",
      execute: async () => {
        await commands.execute("notebook:change-cell-to-markdown");
        callAI();
      }
    });

    commands.addCommand(CommandIds.AIExecuting, {
      icon: AIExecutingIcon,
      label: AIStatus,
      execute: () => {},
      isVisible: () => AIResponding,
    });

    /* Adds a command enabled only on code cell */
    commands.addCommand(CommandIds.runCodeCell, {
      icon: callAIIcon,
      label: "invoke AI",
      execute: async () => {
        await commands.execute("notebook:change-cell-to-markdown");
        callAI();
      },
      isVisible: () => tracker.activeCell?.model.type === "code",
    });

    commands.addCommand(CommandIds.cellCallAI, {
      icon: callAIIcon,
      caption: "Invoke AI",
      execute: callAI,
      isVisible: () => tracker.activeCell?.model.type === "markdown",
    });

    // Function to apply styles to cells with specific metadata
    const applyStylesToCells = (notebookPanel: NotebookPanel) => {
      const cells = notebookPanel.content.widgets;
      cells.forEach((cell: Cell) => {
        if (cell.model.getMetadata("source") === "LLM") {
          cell.node.classList.add("jp-LLMCodeCell");
        }
      });
    };

    // Watch for notebook changes and apply styles
    tracker.currentChanged.connect((sender, notebookPanel) => {
      if (notebookPanel) {
        console.log("A notebook has been opened or changed.");
        notebookPanel.content.modelContentChanged.connect(() => {
          applyStylesToCells(notebookPanel);
        });

        // Apply styles when the notebook is first loaded
        applyStylesToCells(notebookPanel);
      }
    });

    // Initial application for the currently open notebook (if any)
    if (tracker.currentWidget) {
      applyStylesToCells(tracker.currentWidget);
    }

    // tracker.widgetAdded.connect((sender, nbPanel) => {
    //   const session = nbPanel.sessionContext;

    //   const registerCommTarget = () => {
    //     console.log("Session kernel:", session.session.kernel);

    //     if (session.session.kernel) {
    //       session.session.kernel.registerCommTarget(
    //         'test',
    //         (comm, _open_msg) => {
    //           console.log("Comm target registered");

    //           console.log("Message sent to backend.");

    //           comm.onMsg = (msg) => {
    //             console.log("Message received from backend:", msg);
    //           };
    //         },
    //       );
    //     } else {
    //       console.error("No kernel found for the session.");
    //     }
    //   };

    //   session.ready.then(() => {
    //     console.log("Session ready, registering comm target.");
    //     registerCommTarget();

    //     session.kernelChanged.connect((_, args) => {
    //       if (args.newValue == null) {
    //         return;
    //       }
    //       session.ready.then(() => {
    //         console.log("Kernel changed, registering comm target again.");
    //         registerCommTarget();
    //       });
    //     });
    //   });
    // });
  },
};

export default plugin;
